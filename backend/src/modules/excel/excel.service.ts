import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Asset } from '../assets/entities/asset.entity';
import { Department } from '../departments/entities/department.entity';
import { Category } from '../categories/entities/category.entity';
import { Responsable } from '../responsables/entities/responsable.entity';
import { ExcelImport } from './entities/excel-import.entity';
import { AssetStatus } from '../../common/enums/asset-status.enum';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../common/enums/audit-action.enum';

interface ImportResult {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

const HEADERS = [
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
export class ExcelService {
  constructor(
    @InjectRepository(Asset)
    private readonly assets: Repository<Asset>,
    @InjectRepository(Department)
    private readonly departments: Repository<Department>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Responsable)
    private readonly responsables: Repository<Responsable>,
    @InjectRepository(ExcelImport)
    private readonly imports: Repository<ExcelImport>,
    private readonly audit: AuditService,
  ) {}

  private cell(row: ExcelJS.Row, index: number): string {
    const value = row.getCell(index).value;
    if (value == null) return '';
    if (typeof value === 'object' && 'text' in (value as any)) {
      return String((value as any).text).trim();
    }
    if (typeof value === 'object' && 'result' in (value as any)) {
      return String((value as any).result).trim();
    }
    return String(value).trim();
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

  private parseStatus(value: string): AssetStatus {
    const normalized = value.toUpperCase().replace(/\s+/g, '_');
    return (AssetStatus as any)[normalized] ?? AssetStatus.ACTIVO;
  }

  async import(
    buffer: Buffer,
    filename: string,
    userId?: number,
  ): Promise<ExcelImport> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('El archivo no contiene hojas validas');
    }

    const result: ImportResult = {
      totalRows: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    const rows = sheet.getRows(2, sheet.rowCount) ?? [];
    for (const row of rows) {
      const code = this.cell(row, 1);
      if (!code) continue;
      result.totalRows++;

      try {
        const description = this.cell(row, 2);
        if (!description) {
          result.skipped++;
          result.errors.push(`Fila ${row.number}: descripcion vacia`);
          continue;
        }

        const [category, department, responsable] = await Promise.all([
          this.resolveCategory(this.cell(row, 6)),
          this.resolveDepartment(this.cell(row, 7)),
          this.resolveResponsable(this.cell(row, 8)),
        ]);

        const purchaseRaw = this.cell(row, 9);
        const valueRaw = this.cell(row, 10);

        const payload: Partial<Asset> = {
          code,
          description,
          brand: this.cell(row, 3) || undefined,
          model: this.cell(row, 4) || undefined,
          serialNumber: this.cell(row, 5) || undefined,
          categoryId: category?.id,
          departmentId: department?.id,
          responsableId: responsable?.id,
          purchaseDate: purchaseRaw ? new Date(purchaseRaw) : undefined,
          value: valueRaw ? Number(valueRaw.replace(/[^0-9.-]/g, '')) : 0,
          status: this.parseStatus(this.cell(row, 11)),
          observations: this.cell(row, 12) || undefined,
        };

        const existing = await this.assets.findOne({ where: { code } });
        if (existing) {
          Object.assign(existing, payload);
          await this.assets.save(existing);
          result.updated++;
        } else {
          await this.assets.save(this.assets.create(payload));
          result.inserted++;
        }
      } catch (err: any) {
        result.skipped++;
        result.errors.push(`Fila ${row.number}: ${err.message}`);
      }
    }

    const record = await this.imports.save(
      this.imports.create({
        filename,
        totalRows: result.totalRows,
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped,
        errorCount: result.errors.length,
        errors: result.errors.slice(0, 100).join('\n') || undefined,
        user: userId ? ({ id: userId } as any) : undefined,
      }),
    );

    await this.audit.log({
      userId,
      action: AuditAction.IMPORT,
      entity: 'excel_import',
      entityId: record.id,
      details: `Importacion ${filename}: +${result.inserted} / ~${result.updated} / x${result.skipped}`,
    });

    return record;
  }

  async export(userId?: number): Promise<ExcelJS.Buffer> {
    const assets = await this.assets.find({ order: { code: 'ASC' } });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Asset Management System';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Inventario');

    sheet.columns = HEADERS.map((header) => ({
      header,
      width: header.length + 12,
    }));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF006E54' },
    };

    for (const a of assets) {
      sheet.addRow([
        a.code,
        a.description,
        a.brand ?? '',
        a.model ?? '',
        a.serialNumber ?? '',
        a.category?.name ?? '',
        a.department?.name ?? '',
        a.responsable?.fullName ?? '',
        a.purchaseDate
          ? new Date(a.purchaseDate).toISOString().substring(0, 10)
          : '',
        Number(a.value ?? 0),
        a.status,
        a.observations ?? '',
      ]);
    }

    await this.audit.log({
      userId,
      action: AuditAction.EXPORT,
      entity: 'asset',
      details: `Exportacion de inventario (${assets.length} bienes)`,
    });

    return workbook.xlsx.writeBuffer();
  }

  async template(): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Plantilla');
    sheet.columns = HEADERS.map((header) => ({
      header,
      width: header.length + 12,
    }));
    sheet.getRow(1).font = { bold: true };
    sheet.addRow([
      '750123456789',
      'Laptop Dell Latitude 5420',
      'Dell',
      'Latitude 5420',
      'SN-ABC123',
      'Equipos de Computo',
      'Direccion de TI',
      'Juan Perez',
      '2024-01-15',
      18500.0,
      'ACTIVO',
      'Asignada a soporte tecnico',
    ]);
    return workbook.xlsx.writeBuffer();
  }

  recentImports(limit = 10): Promise<ExcelImport[]> {
    return this.imports.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
