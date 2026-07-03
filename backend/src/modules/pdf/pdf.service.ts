import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Asset } from '../assets/entities/asset.entity';
import { Department } from '../departments/entities/department.entity';
import { Category } from '../categories/entities/category.entity';
import { Responsable } from '../responsables/entities/responsable.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { AssetStatus } from '../../common/enums/asset-status.enum';

export interface PdfExtractedRow {
  [key: string]: string;
}

export interface PdfExtractResult {
  rows: PdfExtractedRow[];
  rawText: string;
  headers: string[];
  totalRows: number;
}

export interface PdfToExcelResult {
  filename: string;
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

const ASSET_HEADERS = [
  'Codigo',
  'Descripcion',
  'Marca',
  'Modelo',
  'Numero de Serie',
  'Categoria',
  'Departamento',
  'Responsable',
  'Fecha de Compra',
  'Valor',
  'Estado',
  'Observaciones',
];

@Injectable()
export class PdfService {
  constructor(
    @InjectRepository(Asset)
    private readonly assets: Repository<Asset>,
    @InjectRepository(Department)
    private readonly departments: Repository<Department>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Responsable)
    private readonly responsables: Repository<Responsable>,
    private readonly audit: AuditService,
  ) {}

  async extractFromPdf(buffer: Buffer): Promise<PdfExtractResult> {
    // Try pdfjs-dist first (gives x,y positions for accurate table reconstruction)
    let pdfjsResult: { rows: PdfExtractedRow[]; rawText: string } | null = null;
    try {
      pdfjsResult = await this.extractWithPdfJs(buffer);
    } catch (e) {
      console.warn('pdfjs-dist extraction failed:', e?.message ?? e);
    }

    // If pdfjs found structured rows, return them
    if (pdfjsResult && pdfjsResult.rows.length > 0) {
      return {
        rows: pdfjsResult.rows,
        rawText: pdfjsResult.rawText,
        headers: this.collectAllHeaders(pdfjsResult.rows),
        totalRows: pdfjsResult.rows.length,
      };
    }

    // Fallback to pdf-parse for text extraction, then apply all parsing strategies
    let rawText = pdfjsResult?.rawText ?? '';
    if (!rawText.trim()) {
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const pdfData = await pdfParse(buffer);
        rawText = pdfData.text || '';
      } catch (e) {
        console.warn('pdf-parse also failed:', e?.message ?? e);
      }
    }

    if (!rawText.trim()) {
      throw new BadRequestException(
        'El PDF no contiene texto extraible. Puede ser un PDF escaneado (imagen)',
      );
    }

    // Normalize text
    const normalizedText = rawText
      .replace(/\f/g, '\n')
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, ' ').trimEnd())
      .join('\n');

    // Try all text-based parsing strategies
    const rows = this.parseTableFromText(normalizedText);
    if (rows.length === 0) {
      rows.push(...this.parseRawLines(normalizedText));
    }

    return {
      rows,
      rawText: normalizedText,
      headers: rows.length > 0 ? this.collectAllHeaders(rows) : [],
      totalRows: rows.length,
    };
  }

  /**
   * Extract text with x,y positions using pdfjs-dist.
   * Groups text items into lines by y-position, detects header row,
   * and assigns items to columns by x-position.
   */
  private async extractWithPdfJs(buffer: Buffer): Promise<{ rows: PdfExtractedRow[]; rawText: string }> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
    const path = await import('path');
    // Set worker source for Node.js
    (pdfjs as any).GlobalWorkerOptions.workerSrc = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'node_modules',
      'pdfjs-dist',
      'legacy',
      'build',
      'pdf.worker.js',
    );

    // Configure for Node.js
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      isEvalSupported: false,
    });

    const doc = await loadingTask.promise;

    type TextItem = { str: string; x: number; y: number; width: number; height: number };
    const allLines: { y: number; items: TextItem[] }[] = [];
    const rawTextParts: string[] = [];

    for (let p = 1; p <= doc.numPages; p++) {
      try {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();

        // Collect text items with positions
        const pageItems: TextItem[] = [];
        for (const item of content.items as any[]) {
          if (!item.str || !item.str.trim()) continue;
          const transform = item.transform || [1, 0, 0, 1, 0, 0];
          const x = transform[4];
          const y = transform[5];
          pageItems.push({
            str: item.str,
            x,
            y,
            width: item.width || 0,
            height: item.height || 0,
          });
        }

        if (pageItems.length === 0) continue;

        // Group items into lines by y-position
        const yTolerance = 3;
        const lines: { y: number; items: TextItem[] }[] = [];
        for (const item of pageItems) {
          const existingLine = lines.find(
            (l) => Math.abs(l.y - item.y) <= yTolerance,
          );
          if (existingLine) {
            existingLine.items.push(item);
          } else {
            lines.push({ y: item.y, items: [item] });
          }
        }

        // Sort lines top to bottom (PDF coords: higher Y = higher on page)
        lines.sort((a, b) => b.y - a.y);

        // Sort items left to right
        for (const line of lines) {
          line.items.sort((a, b) => a.x - b.x);
        }

        allLines.push(...lines);

        // Build raw text
        for (const line of lines) {
          const lineText = line.items.map((i) => i.str).join(' ');
          rawTextParts.push(lineText);
        }
      } catch (pageErr) {
        // Skip pages that fail
        console.warn(`Failed to parse page ${p}:`, pageErr?.message);
      }
    }

    await doc.destroy();

    const rawText = rawTextParts.join('\n');

    // Detect table from positioned items
    const rows = this.detectTableFromPositions(allLines);

    return { rows, rawText };
  }

  /**
   * Detect table from positioned text items.
   * Finds header row by matching known field names, then assigns items to columns by x-position.
   */
  private detectTableFromPositions(
    lines: { y: number; items: { str: string; x: number; y: number; width: number; height: number }[] }[],
  ): PdfExtractedRow[] {
    if (lines.length < 3) return [];

    const knownFields = [
      'etiqueta', 'label', 'tag', 'codigo', 'code', 'clave', 'cve', 'no', 'num',
      'numero', 'item', 'inventario',
      'articulo', 'descripcion', 'description', 'bien', 'concepto', 'detalle',
      'caracteristicas', 'especificacion', 'especificaciones',
      'modelo', 'model',
      'serie', 'serial',
      'marca', 'brand', 'fabricante',
      'adquisicion', 'fecha adquisicion',
      'unitario', 'valor', 'precio', 'costo', 'importe', 'monto', 'total',
      'area', 'departamento', 'department', 'ubicacion', 'unidad',
      'responsable', 'encargado', 'asignado', 'custodio',
      'fecha alta', 'alta',
      'comentarios', 'observaciones', 'notas',
      'factura',
      'proveedor', 'provider', 'supplier',
      'fecha', 'date', 'compra',
      'estado', 'status', 'situacion', 'condicion',
      'cantidad', 'quantity', 'cant',
      'medida', 'lote',
    ];

    // Find ALL header-like lines across all pages
    // A header line has 2+ items matching known fields
    const headerLines: { idx: number; items: { str: string; x: number; y: number; width: number; height: number }[]; matchCount: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const items = lines[i].items;
      if (items.length < 2) continue;
      const matchCount = items.filter((item) => {
        const lower = item.str.toLowerCase().trim();
        return knownFields.some((kf) => lower === kf || lower.includes(kf) || kf.includes(lower));
      }).length;
      if (matchCount >= 2) {
        headerLines.push({ idx: i, items, matchCount });
      }
    }

    if (headerLines.length === 0) return [];

    // Use the header line with the highest match count as the reference
    const bestHeader = headerLines.reduce((a, b) => (a.matchCount > b.matchCount ? a : b));
    const headerItems = bestHeader.items;

    // Build column definitions from header item positions
    const columns = headerItems.map((item) => ({
      name: item.str.trim(),
      xStart: item.x,
      xEnd: item.x + (item.width || 0),
    }));

    // Extend each column's xEnd to the start of the next column
    for (let c = 0; c < columns.length; c++) {
      if (c + 1 < columns.length) {
        columns[c].xEnd = columns[c + 1].xStart;
      } else {
        columns[c].xEnd = Number.MAX_SAFE_INTEGER;
      }
    }

    // Create a set of header line indices to skip (repeated headers on other pages)
    const headerIdxSet = new Set(headerLines.map((h) => h.idx));

    // Also skip lines that look like the header (same x positions, same text)
    const headerXPositions = new Set(headerItems.map((i) => Math.round(i.x)));

    // Extract data rows: all lines that are NOT headers
    const rows: PdfExtractedRow[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (headerIdxSet.has(i)) continue; // Skip header lines

      const lineItems = lines[i].items;
      if (lineItems.length === 0) continue;

      // Skip lines that look like repeated headers (same first few x positions and same text)
      const lineXPositions = new Set(lineItems.map((i) => Math.round(i.x)));
      const samePositions = [...headerXPositions].every((x) => [...lineXPositions].some((lx) => Math.abs(lx - x) <= 3));
      if (samePositions && lineItems.length === headerItems.length) {
        const sameText = lineItems.every((item, idx) =>
          item.str.toLowerCase().trim() === headerItems[idx].str.toLowerCase().trim(),
        );
        if (sameText) continue; // Skip repeated header
      }

      // Assign each item to the column whose x-range contains it
      const row: PdfExtractedRow = {};
      for (const col of columns) {
        row[col.name] = '';
      }

      for (const item of lineItems) {
        // Find which column this item belongs to
        let bestCol = -1;
        for (let c = 0; c < columns.length; c++) {
          if (item.x >= columns[c].xStart - 10 && item.x < columns[c].xEnd) {
            bestCol = c;
            break;
          }
        }
        // If not directly within, find nearest column
        if (bestCol < 0) {
          let bestDist = Infinity;
          for (let c = 0; c < columns.length; c++) {
            const dist = Math.abs(item.x - columns[c].xStart);
            if (dist < bestDist) {
              bestDist = dist;
              bestCol = c;
            }
          }
        }

        if (bestCol >= 0) {
          const colName = columns[bestCol].name;
          row[colName] = (row[colName] + ' ' + item.str).trim();
        }
      }

      // Only add row if it has at least 1 non-empty cell
      const filledCount = Object.values(row).filter((v) => v.trim()).length;
      if (filledCount >= 2) {
        rows.push(row);
      } else if (filledCount === 1 && rows.length > 0) {
        // Continuation line: append to last row
        const lastRow = rows[rows.length - 1];
        for (const col of columns) {
          if (row[col.name]?.trim()) {
            lastRow[col.name] = (lastRow[col.name] + ' ' + row[col.name]).trim();
          }
        }
      }
    }

    return rows;
  }

  private collectAllHeaders(rows: PdfExtractedRow[]): string[] {
    const seen = new Set<string>();
    const headers: string[] = [];
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        const lower = key.toLowerCase().trim();
        if (!seen.has(lower)) {
          seen.add(lower);
          headers.push(key);
        }
      }
    }
    return headers;
  }

  private parseTableFromText(text: string): PdfExtractedRow[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const rows: PdfExtractedRow[] = [];

    // Strategy 1: Column-position-based table detection
    // Detect tables by finding consistent column positions across multiple lines
    rows.push(...this.parseByColumnPositions(lines));

    // Strategy 2: Delimiter-based table (tabs, pipes, multiple spaces)
    if (rows.length === 0) {
      rows.push(...this.parseByDelimiters(lines));
    }

    // Strategy 3: Key-value pairs grouped into records
    if (rows.length === 0) {
      rows.push(...this.parseKeyValuePairs(lines));
    }

    // Strategy 4: Known field patterns (Codigo:, Descripcion:, etc.)
    if (rows.length === 0) {
      rows.push(...this.parseAssetPatterns(text));
    }

    // Strategy 5: Numbered list items
    if (rows.length === 0) {
      rows.push(...this.parseNumberedList(text));
    }

    return rows;
  }

  /**
   * Strategy 1: Detect table columns by analyzing text positions.
   * Lines that share similar column start positions are likely table rows.
   */
  private parseByColumnPositions(lines: string[]): PdfExtractedRow[] {
    if (lines.length < 3) return [];

    const knownFields = [
      'codigo', 'code', 'clave', 'cve', 'no', 'num', 'numero', 'item',
      'descripcion', 'description', 'bien', 'concepto', 'articulo',
      'detalle', 'caracteristicas', 'especificacion', 'especificaciones',
      'marca', 'brand', 'fabricante',
      'modelo', 'model',
      'serie', 'serial',
      'categoria', 'category', 'tipo', 'clase', 'familia',
      'departamento', 'department', 'area', 'ubicacion', 'unidad',
      'responsable', 'encargado', 'asignado', 'custodio',
      'fecha', 'date', 'compra', 'adquisicion', 'adquisicion',
      'valor', 'precio', 'costo', 'importe', 'monto', 'total',
      'estado', 'status', 'situacion', 'condicion',
      'observaciones', 'notas', 'comentarios',
      'cantidad', 'quantity', 'cant',
      'medida', 'unidad',
      'lote', 'factura', 'proveedor',
    ];

    // Find lines with 2+ space-separated segments (potential table rows)
    const candidateLines: { line: string; segments: { start: number; text: string }[] }[] = [];

    for (const line of lines) {
      const segments = this.detectSegments(line);
      if (segments.length >= 2) {
        candidateLines.push({ line, segments });
      }
    }

    if (candidateLines.length < 3) return [];

    // Try to find a header line among the first few candidates
    let headerIdx = -1;
    let headers: string[] = [];
    let headerSegments: { start: number; text: string }[] = [];
    let bestMatchCount = 0;

    for (let h = 0; h < Math.min(10, candidateLines.length); h++) {
      const segs = candidateLines[h].segments;
      const hdrs = segs.map((s) => s.text.trim()).filter((t) => t.length > 0);
      const matchCount = hdrs.filter((hdr) =>
        knownFields.some((kf) =>
          hdr.toLowerCase().includes(kf) || kf.includes(hdr.toLowerCase()),
        ),
      ).length;
      if (matchCount > bestMatchCount) {
        bestMatchCount = matchCount;
        headerIdx = h;
        headers = hdrs;
        headerSegments = segs;
      }
    }

    if (bestMatchCount < 2 || headerIdx < 0) return [];

    // Build column boundaries from header segments
    const colBoundaries = headerSegments.map((s) => s.start);
    const rows: PdfExtractedRow[] = [];

    // Extract rows using column boundaries
    for (let i = headerIdx + 1; i < candidateLines.length; i++) {
      const line = candidateLines[i].line;
      const cells = this.extractCellsByPosition(line, colBoundaries);
      if (cells.filter((c) => c.trim()).length < 2) continue;

      const row: PdfExtractedRow = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = (cells[j] ?? '').trim();
      }
      rows.push(row);
    }

    // Merge continuation lines (rows with only 1 filled cell that belongs to previous row)
    this.mergeContinuationRows(rows, headers);

    return rows;
  }

  /**
   * Detect text segments in a line by finding gaps of 2+ spaces.
   * Returns segment start positions and text.
   */
  private detectSegments(line: string): { start: number; text: string }[] {
    const segments: { start: number; text: string }[] = [];
    let i = 0;
    while (i < line.length) {
      // Skip leading spaces
      while (i < line.length && line[i] === ' ') i++;
      if (i >= line.length) break;
      const start = i;
      // Read until 2+ consecutive spaces or end
      let end = i;
      while (end < line.length) {
        if (line[end] === ' ' && end + 1 < line.length && line[end + 1] === ' ') {
          break;
        }
        end++;
      }
      segments.push({ start, text: line.substring(start, end).trim() });
      i = end;
    }
    return segments;
  }

  /**
   * Extract cell values from a line based on column start positions.
   */
  private extractCellsByPosition(line: string, colStarts: number[]): string[] {
    const cells: string[] = [];
    for (let c = 0; c < colStarts.length; c++) {
      const start = colStarts[c];
      const end = c + 1 < colStarts.length ? this.findNextColumnEnd(line, start, colStarts[c + 1]) : line.length;
      cells.push(line.substring(start, end).trim());
    }
    return cells;
  }

  private findNextColumnEnd(line: string, currentStart: number, nextStart: number): number {
    // If the line has content at nextStart position, cut there
    if (line.length > nextStart && line[nextStart] !== ' ') {
      return nextStart;
    }
    // Find the last non-space before nextStart
    let end = Math.min(nextStart, line.length);
    while (end > currentStart && line[end - 1] === ' ') end--;
    return end;
  }

  /**
   * Merge rows where only one cell is filled (continuation of previous row).
   */
  private mergeContinuationRows(rows: PdfExtractedRow[], headers: string[]): void {
    for (let i = rows.length - 1; i > 0; i--) {
      const filled = headers.filter((h) => rows[i][h]?.trim()).length;
      if (filled <= 1) {
        // Append to previous row
        for (const h of headers) {
          const val = rows[i][h]?.trim();
          if (val) {
            rows[i - 1][h] = (rows[i - 1][h] ?? '').trim() + ' ' + val;
          }
        }
        rows.splice(i, 1);
      }
    }
  }

  /**
   * Strategy 2: Parse lines using delimiters (tab, pipe, 2+ spaces).
   */
  private parseByDelimiters(lines: string[]): PdfExtractedRow[] {
    const delimiterRegex = /\t|\|| {2,}/;
    const tableLines = lines.filter(
      (l) => l.split(delimiterRegex).filter((c) => c.trim()).length >= 2,
    );

    if (tableLines.length < 3) return [];

    const knownFields = [
      'codigo', 'code', 'clave', 'descripcion', 'description', 'bien',
      'concepto', 'articulo', 'marca', 'brand', 'modelo', 'model',
      'serie', 'serial', 'categoria', 'category', 'tipo',
      'departamento', 'department', 'area', 'ubicacion',
      'responsable', 'encargado', 'asignado', 'fecha', 'date',
      'compra', 'adquisicion', 'valor', 'precio', 'costo',
      'importe', 'monto', 'estado', 'status', 'situacion',
      'observaciones', 'notas', 'comentarios', 'cantidad',
      'no', 'num', 'numero', 'item', 'unidad', 'medida',
      'detalle', 'caracteristicas', 'especificacion', 'lote',
      'factura', 'proveedor', 'total', 'condicion',
    ];

    let bestHeaderLine = -1;
    let bestHeaders: string[] = [];
    let bestMatchCount = 0;

    for (let h = 0; h < Math.min(10, tableLines.length); h++) {
      const headers = tableLines[h]
        .split(delimiterRegex)
        .map((hdr) => hdr.trim())
        .filter((hdr) => hdr.length > 0);
      const matchCount = headers.filter((hdr) =>
        knownFields.some((kf) => hdr.toLowerCase().includes(kf)),
      ).length;
      if (matchCount > bestMatchCount) {
        bestMatchCount = matchCount;
        bestHeaderLine = h;
        bestHeaders = headers;
      }
    }

    if (bestMatchCount < 2 || bestHeaderLine < 0) return [];

    const rows: PdfExtractedRow[] = [];
    for (let i = bestHeaderLine + 1; i < tableLines.length; i++) {
      const cells = tableLines[i]
        .split(delimiterRegex)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (cells.length < 2) continue;
      const row: PdfExtractedRow = {};
      for (let j = 0; j < bestHeaders.length; j++) {
        row[bestHeaders[j]] = cells[j] ?? '';
      }
      rows.push(row);
    }

    this.mergeContinuationRows(rows, bestHeaders);
    return rows;
  }

  /**
   * Strategy 3: Parse key-value pairs (Key: Value) grouped into records.
   */
  private parseKeyValuePairs(lines: string[]): PdfExtractedRow[] {
    const kvRegex = /^([^:]{2,40}):\s*(.+)$/;
    const currentRow: PdfExtractedRow = {};
    let hasData = false;
    let matchedKnownFields = 0;

    const knownFieldPatterns = [
      /codigo|code|clave|cve/i, /descripcion|description|bien|concepto|articulo|detalle/i,
      /marca|brand|fabricante/i, /modelo|model/i, /serie|serial/i,
      /categoria|category|tipo|clase|familia/i, /departamento|department|area|ubicacion|unidad/i,
      /responsable|encargado|asignado|custodio/i, /fecha|date|compra|adquisicion/i,
      /valor|precio|costo|importe|monto|total/i, /estado|status|situacion|condicion/i,
      /observaciones|notas|comentarios/i, /cantidad|quantity|cant/i,
      /no\.?|num|numero|item/i, /medida/i, /lote|factura|proveedor/i,
    ];

    const rows: PdfExtractedRow[] = [];

    for (const line of lines) {
      const match = line.match(kvRegex);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (key.length <= 40) {
          currentRow[key] = value;
          hasData = true;
          if (knownFieldPatterns.some((p) => p.test(key))) {
            matchedKnownFields++;
          }
        }
      } else if (hasData && (line.match(/^-+$/) || line.match(/^={3,}$/))) {
        if (Object.keys(currentRow).length > 0) {
          rows.push({ ...currentRow });
        }
        Object.keys(currentRow).forEach((k) => delete currentRow[k]);
        hasData = false;
      }
    }
    if (hasData && Object.keys(currentRow).length > 0) {
      rows.push({ ...currentRow });
    }
    if (matchedKnownFields === 0) {
      return [];
    }
    return rows;
  }

  private parseNumberedList(text: string): PdfExtractedRow[] {
    const rows: PdfExtractedRow[] = [];
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Match patterns like "1. Some description", "1) Some description", "1 Some description"
    const numberedRegex = /^(\d+)[\.\)\-:]\s+(.+)/;
    let currentDesc = '';
    let currentNum = '';

    for (const line of lines) {
      const match = line.match(numberedRegex);
      if (match) {
        if (currentDesc) {
          rows.push({
            Codigo: currentNum,
            Descripcion: currentDesc,
          });
        }
        currentNum = match[1];
        currentDesc = match[2].trim();
      } else if (currentDesc && line.length > 10 && !line.match(numberedRegex)) {
        currentDesc += ' ' + line;
      }
    }
    if (currentDesc) {
      rows.push({ Codigo: currentNum, Descripcion: currentDesc });
    }

    return rows;
  }

  private parseAssetPatterns(text: string): PdfExtractedRow[] {
    const rows: PdfExtractedRow[] = [];
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const fieldPatterns: Record<string, RegExp> = {
      Codigo: /^(?:codigo|code|clave|cve)\s*:?\s*(.+)/i,
      Descripcion: /^(?:descripcion|description|bien|concepto|articulo|detalle|caracteristicas|especificacion(?:es)?)\s*:?\s*(.+)/i,
      Marca: /^(?:marca|brand|fabricante)\s*:?\s*(.+)/i,
      Modelo: /^(?:modelo|model)\s*:?\s*(.+)/i,
      'Numero de Serie': /^(?:serie|serial|no\.?\s*de\s*serie)\s*:?\s*(.+)/i,
      Categoria: /^(?:categoria|category|tipo|clase|familia)\s*:?\s*(.+)/i,
      Departamento: /^(?:departamento|department|area|ubicacion|unidad)\s*:?\s*(.+)/i,
      Responsable: /^(?:responsable|encargado|asignado|custodio)\s*:?\s*(.+)/i,
      'Fecha de Compra': /^(?:fecha|date|compra|adquisicion)\s*:?\s*(.+)/i,
      Valor: /^(?:valor|precio|costo|importe|monto|total)\s*:?\s*[\$]?\s*(.+)/i,
      Estado: /^(?:estado|status|situacion|condicion)\s*:?\s*(.+)/i,
      Observaciones: /^(?:observaciones|notas|comentarios)\s*:?\s*(.+)/i,
      Cantidad: /^(?:cantidad|quantity|cant)\s*:?\s*(.+)/i,
      Lote: /^(?:lote)\s*:?\s*(.+)/i,
      Factura: /^(?:factura)\s*:?\s*(.+)/i,
      Proveedor: /^(?:proveedor)\s*:?\s*(.+)/i,
    };

    let currentRow: PdfExtractedRow = {};
    let foundAny = false;

    for (const line of lines) {
      let matched = false;
      for (const [header, regex] of Object.entries(fieldPatterns)) {
        const m = line.match(regex);
        if (m && !currentRow[header]) {
          currentRow[header] = m[1].trim();
          matched = true;
          foundAny = true;
          break;
        }
      }

      // New "Codigo" line = new record
      const codeMatch = line.match(/^(?:codigo|code|clave|cve)\s*:?\s*(.+)/i);
      if (codeMatch && currentRow['Codigo']) {
        rows.push({ ...currentRow });
        currentRow = { Codigo: codeMatch[1].trim() };
        matched = true;
        foundAny = true;
      }

      if (!matched && foundAny && Object.keys(currentRow).length >= 3) {
        if (
          line.match(/^(codigo|code|clave|bien|articulo|activo|item)/i) &&
          currentRow['Codigo']
        ) {
          rows.push({ ...currentRow });
          currentRow = {};
          foundAny = false;
        }
      }
    }

    if (foundAny && Object.keys(currentRow).length >= 2) {
      rows.push({ ...currentRow });
    }

    return rows;
  }

  /**
   * Fallback: Extract all non-empty lines as individual rows with line number.
   */
  private parseRawLines(text: string): PdfExtractedRow[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    // Return as rows with line number and full text
    return lines.map((line, i) => ({
      Linea: String(i + 1),
      Texto: line,
    }));
  }

  // Canonical column order for Excel output
  private readonly CANONICAL_HEADERS = [
    'Etiqueta',
    'Articulo',
    'Modelo',
    'Serie',
    'Caracteristicas',
    'Adquisicion',
    '$Unitario',
    'Area',
    'Responsable',
    'Fecha Alta',
    'Comentarios',
    'Factura',
    'Proveedor',
    'Fecha',
    'Estado',
  ];

  // Map any extracted header to a canonical header
  private readonly HEADER_ALIASES: Record<string, string> = {
    // Etiqueta
    'etiqueta': 'Etiqueta', 'label': 'Etiqueta', 'tag': 'Etiqueta',
    'codigo': 'Etiqueta', 'code': 'Etiqueta', 'clave': 'Etiqueta', 'cve': 'Etiqueta',
    'no': 'Etiqueta', 'num': 'Etiqueta', 'numero': 'Etiqueta', 'item': 'Etiqueta',
    'inventario': 'Etiqueta', 'no. inventario': 'Etiqueta',
    // Articulo
    'articulo': 'Articulo', 'descripcion': 'Articulo', 'description': 'Articulo',
    'bien': 'Articulo', 'concepto': 'Articulo', 'detalle': 'Articulo',
    'caracteristicas': 'Caracteristicas', 'especificacion': 'Caracteristicas',
    'especificaciones': 'Caracteristicas',
    // Modelo
    'modelo': 'Modelo', 'model': 'Modelo',
    // Serie
    'serie': 'Serie', 'serial': 'Serie', 'no. de serie': 'Serie',
    'numero de serie': 'Serie',
    // Adquisicion
    'adquisicion': 'Adquisicion', 'fecha adquisicion': 'Adquisicion',
    'fecha de adquisicion': 'Adquisicion',
    // $Unitario
    '$unitario': '$Unitario', 'unitario': '$Unitario', 'valor': '$Unitario',
    'precio': '$Unitario', 'costo': '$Unitario', 'importe': '$Unitario',
    'monto': '$Unitario', 'total': '$Unitario', 'precio unitario': '$Unitario',
    // Area
    'area': 'Area', 'departamento': 'Area', 'department': 'Area',
    'ubicacion': 'Area', 'unidad': 'Area',
    // Responsable
    'responsable': 'Responsable', 'encargado': 'Responsable',
    'asignado': 'Responsable', 'custodio': 'Responsable',
    // Fecha Alta
    'fecha alta': 'Fecha Alta', 'alta': 'Fecha Alta', 'fecha de alta': 'Fecha Alta',
    // Comentarios
    'comentarios': 'Comentarios', 'observaciones': 'Comentarios',
    'notas': 'Comentarios',
    // Factura
    'factura': 'Factura', 'no. factura': 'Factura', 'numero factura': 'Factura',
    // Proveedor
    'proveedor': 'Proveedor', 'provider': 'Proveedor', 'supplier': 'Proveedor',
    // Fecha
    'fecha': 'Fecha', 'date': 'Fecha', 'fecha compra': 'Fecha',
    'fecha de compra': 'Fecha', 'compra': 'Fecha',
    // Estado
    'estado': 'Estado', 'status': 'Estado', 'situacion': 'Estado',
    'condicion': 'Estado',
    // Cantidad
    'cantidad': 'Adquisicion', 'quantity': 'Adquisicion', 'cant': 'Adquisicion',
    // Lote
    'lote': 'Factura',
  };

  private mapHeaderToCanonical(header: string): string | null {
    const lower = header.toLowerCase().trim();
    // Direct match
    if (this.HEADER_ALIASES[lower]) return this.HEADER_ALIASES[lower];
    // Partial match
    for (const [alias, canonical] of Object.entries(this.HEADER_ALIASES)) {
      if (lower.includes(alias) || alias.includes(lower)) return canonical;
    }
    return null;
  }

  private normalizeRowToCanonical(row: PdfExtractedRow): PdfExtractedRow {
    const normalized: PdfExtractedRow = {};
    for (const [key, value] of Object.entries(row)) {
      const canonical = this.mapHeaderToCanonical(key);
      if (canonical) {
        // If already set, append
        if (normalized[canonical]) {
          normalized[canonical] += ' ' + value;
        } else {
          normalized[canonical] = value;
        }
      } else {
        // Unknown field — keep under original name but don't discard
        if (!normalized[key]) {
          normalized[key] = value;
        }
      }
    }
    return normalized;
  }

  async convertToExcel(buffer: Buffer, originalName: string): Promise<Buffer> {
    const result = await this.extractFromPdf(buffer);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Gestion de Activos UAEMEX';
    workbook.created = new Date();

    // Single sheet with all data
    const sheet = workbook.addWorksheet('Datos PDF', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Normalize all rows to canonical headers
    const normalizedRows = result.rows.map((r) => this.normalizeRowToCanonical(r));

    // Collect all unique headers: canonical first, then any extras
    const allHeaders = new Set<string>(this.CANONICAL_HEADERS);
    for (const row of normalizedRows) {
      for (const key of Object.keys(row)) {
        if (!this.CANONICAL_HEADERS.includes(key)) {
          allHeaders.add(key);
        }
      }
    }
    const headers = Array.from(allHeaders);

    // Define columns with optimized widths
    const colWidths: Record<string, number> = {
      'Etiqueta': 15,
      'Articulo': 40,
      'Modelo': 18,
      'Serie': 18,
      'Caracteristicas': 45,
      'Adquisicion': 14,
      '$Unitario': 14,
      'Area': 22,
      'Responsable': 22,
      'Fecha Alta': 14,
      'Comentarios': 35,
      'Factura': 16,
      'Proveedor': 22,
      'Fecha': 14,
      'Estado': 14,
    };

    sheet.columns = headers.map((h) => ({
      header: h,
      key: h,
      width: colWidths[h] ?? Math.min(Math.max(h.length + 8, 15), 50),
    }));

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF006E54' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    headerRow.height = 30;

    // Add all data rows
    for (const rowData of normalizedRows) {
      const row = sheet.addRow(headers.map((h) => rowData[h] ?? ''));
      row.alignment = { vertical: 'top', wrapText: true };
    }

    // Apply borders to all cells
    const totalRows = sheet.rowCount;
    const totalCols = headers.length;
    for (let r = 1; r <= totalRows; r++) {
      for (let c = 1; c <= totalCols; c++) {
        const cell = sheet.getRow(r).getCell(c);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
      }
    }

    // Alternating row colors (skip header)
    for (let r = 2; r <= totalRows; r++) {
      const row = sheet.getRow(r);
      if (r % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0FDF4' },
        };
      }
    }

    // Auto-filter on header row
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: totalCols },
    };

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async importToDatabase(
    buffer: Buffer,
    filename: string,
    userId?: number,
  ): Promise<PdfToExcelResult> {
    const result = await this.extractFromPdf(buffer);
    const dbResult: PdfToExcelResult = {
      filename,
      totalRows: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    if (result.rows.length === 0) {
      dbResult.errors.push('No se encontraron datos estructurados en el PDF');
      return dbResult;
    }

    let autoCounter = 1;
    for (const row of result.rows) {
      let code = this.getField(row, [
        'Codigo', 'code', 'Code', 'Clave', 'cve', 'CVE',
        'No', 'no', 'No.', 'Num', 'num', 'Numero', 'numero',
        'Item', 'item', 'Linea', 'linea',
      ]);
      const description = this.getField(row, [
        'Descripcion', 'descripcion', 'Description', 'description',
        'Bien', 'bien', 'Concepto', 'concepto',
        'Articulo', 'articulo', 'Detalle', 'detalle',
        'Caracteristicas', 'caracteristicas',
        'Especificacion', 'especificacion', 'Especificaciones',
        'Texto', 'texto', 'Contenido', 'contenido',
      ]);

      // If no code but has description, auto-generate a code
      if (!code && description) {
        code = `AUTO-${String(autoCounter++).padStart(4, '0')}`;
      }

      if (!description) {
        dbResult.skipped++;
        dbResult.errors.push(
          `Fila sin descripcion: ${JSON.stringify(row).substring(0, 120)}`,
        );
        continue;
      }

      dbResult.totalRows++;

      try {
        const categoryName = this.getField(row, [
          'Categoria',
          'categoria',
          'Category',
          'Tipo',
        ]);
        const departmentName = this.getField(row, [
          'Departamento',
          'departamento',
          'Department',
          'Area',
          'Ubicacion',
        ]);
        const responsableName = this.getField(row, [
          'Responsable',
          'responsable',
          'Encargado',
          'Asignado',
        ]);

        const [category, department, responsable] = await Promise.all([
          categoryName ? this.resolveCategory(categoryName) : Promise.resolve(null),
          departmentName
            ? this.resolveDepartment(departmentName)
            : Promise.resolve(null),
          responsableName
            ? this.resolveResponsable(responsableName)
            : Promise.resolve(null),
        ]);

        const purchaseRaw = this.getField(row, [
          'Fecha de Compra',
          'Fecha',
          'fecha',
          'Date',
          'compra',
          'adquisicion',
        ]);
        const valueRaw = this.getField(row, [
          'Valor',
          'valor',
          'Precio',
          'precio',
          'Costo',
          'costo',
          'Importe',
          'importe',
          'Monto',
          'monto',
        ]);

        const statusRaw =
          this.getField(row, ['Estado', 'estado', 'Status', 'status']) ||
          'ACTIVO';

        const payload: Partial<Asset> = {
          code,
          description,
          brand: this.getField(row, ['Marca', 'marca', 'Brand']) || undefined,
          model: this.getField(row, ['Modelo', 'modelo', 'Model']) || undefined,
          serialNumber:
            this.getField(row, [
              'Numero de Serie',
              'Serie',
              'serie',
              'Serial',
            ]) || undefined,
          categoryId: category?.id,
          departmentId: department?.id,
          responsableId: responsable?.id,
          purchaseDate: purchaseRaw ? new Date(purchaseRaw) : undefined,
          value: valueRaw
            ? Number(valueRaw.replace(/[^0-9.-]/g, ''))
            : 0,
          status: this.parseStatus(statusRaw),
          observations:
            this.getField(row, [
              'Observaciones',
              'observaciones',
              'Notas',
              'notas',
            ]) || undefined,
        };

        const existing = await this.assets.findOne({ where: { code } });
        if (existing) {
          Object.assign(existing, payload);
          await this.assets.save(existing);
          dbResult.updated++;
        } else {
          await this.assets.save(this.assets.create(payload));
          dbResult.inserted++;
        }
      } catch (err: any) {
        dbResult.skipped++;
        dbResult.errors.push(`Error con codigo ${code}: ${err.message}`);
      }
    }

    await this.audit.log({
      userId,
      action: AuditAction.IMPORT,
      entity: 'pdf_import',
      details: `PDF ${filename}: +${dbResult.inserted} / ~${dbResult.updated} / x${dbResult.skipped}`,
    });

    return dbResult;
  }

  private getField(row: PdfExtractedRow, keys: string[]): string {
    // First pass: exact case-insensitive match
    for (const key of keys) {
      for (const rowKey of Object.keys(row)) {
        if (rowKey.toLowerCase().trim() === key.toLowerCase().trim()) {
          return row[rowKey]?.trim() ?? '';
        }
      }
    }
    // Second pass: partial match (key contains rowKey or vice versa)
    for (const key of keys) {
      const lowerKey = key.toLowerCase().trim();
      for (const rowKey of Object.keys(row)) {
        const lowerRow = rowKey.toLowerCase().trim();
        if (lowerRow.includes(lowerKey) || lowerKey.includes(lowerRow)) {
          return row[rowKey]?.trim() ?? '';
        }
      }
    }
    return '';
  }

  private parseStatus(value: string): AssetStatus {
    const normalized = value.toUpperCase().replace(/\s+/g, '_');
    return (AssetStatus as any)[normalized] ?? AssetStatus.ACTIVO;
  }

  private async resolveDepartment(name: string): Promise<Department | null> {
    if (!name) return null;
    let dep = await this.departments.findOne({ where: { name } });
    if (!dep) {
      dep = await this.departments.save(
        this.departments.create({
          name,
          code: name.substring(0, 20).toUpperCase().replace(/\s+/g, '_'),
        }),
      );
    }
    return dep;
  }

  private async resolveCategory(name: string): Promise<Category | null> {
    if (!name) return null;
    let cat = await this.categories.findOne({ where: { name } });
    if (!cat) {
      cat = await this.categories.save(this.categories.create({ name }));
    }
    return cat;
  }

  private async resolveResponsable(name: string): Promise<Responsable | null> {
    if (!name) return null;
    let resp = await this.responsables.findOne({ where: { fullName: name } });
    if (!resp) {
      resp = await this.responsables.save(
        this.responsables.create({ fullName: name }),
      );
    }
    return resp;
  }
}
