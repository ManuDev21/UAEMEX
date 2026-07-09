import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { CreateAssetInput } from './dto/create-asset.input';
import { UpdateAssetInput } from './dto/update-asset.input';
import { AssetsFilterInput } from './dto/assets-filter.input';
import { AssetPage } from './dto/asset-page.type';
import { MovementsService } from '../movements/movements.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../common/enums/audit-action.enum';

const TRACKED_FIELDS: (keyof Asset)[] = [
  'description',
  'brand',
  'model',
  'serialNumber',
  'value',
  'status',
  'observations',
  'categoryId',
  'departmentId',
  'responsableId',
];

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly repo: Repository<Asset>,
    private readonly movements: MovementsService,
    private readonly audit: AuditService,
  ) {}

  async paginate(filter: AssetsFilterInput): Promise<AssetPage> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const qb = this.repo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.department', 'department')
      .leftJoinAndSelect('asset.responsable', 'responsable');

    if (filter.search) {
      qb.andWhere(
        new Brackets((qb2) => {
          qb2
            .where('asset.code LIKE :s', { s: `%${filter.search}%` })
            .orWhere('asset.description LIKE :s', { s: `%${filter.search}%` })
            .orWhere('asset.serialNumber LIKE :s', { s: `%${filter.search}%` });
        }),
      );
    }
    if (filter.status) {
      qb.andWhere('asset.status = :status', { status: filter.status });
    }
    if (filter.categoryId) {
      qb.andWhere('asset.category_id = :c', { c: filter.categoryId });
    }
    if (filter.departmentId) {
      qb.andWhere('asset.department_id = :d', { d: filter.departmentId });
    }
    if (filter.responsableId) {
      qb.andWhere('asset.responsable_id = :r', { r: filter.responsableId });
    }

    qb.orderBy('asset.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: number): Promise<Asset> {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Bien ${id} no encontrado`);
    }
    return asset;
  }

  async findByCode(code: string): Promise<Asset> {
    const trimmed = code.trim();
    // 1. Exact match
    let asset = await this.repo.findOne({
      where: { code: trimmed },
      relations: ['category', 'department', 'responsable'],
    });
    // 2. Try without leading zeros
    if (!asset) {
      const noZeros = trimmed.replace(/^0+/, '');
      if (noZeros && noZeros !== trimmed) {
        asset = await this.repo.findOne({
          where: { code: noZeros },
          relations: ['category', 'department', 'responsable'],
        });
      }
    }
    // 3. Try with leading zeros (pad to 6, 8, 10 digits)
    if (!asset) {
      for (const pad of [6, 8, 10, 12]) {
        const padded = trimmed.padStart(pad, '0');
        if (padded !== trimmed) {
          asset = await this.repo.findOne({
            where: { code: padded },
            relations: ['category', 'department', 'responsable'],
          });
          if (asset) break;
        }
      }
    }
    // 4. Try LIKE match (code contains the search term or vice versa)
    if (!asset) {
      asset = await this.repo
        .createQueryBuilder('asset')
        .leftJoinAndSelect('asset.category', 'category')
        .leftJoinAndSelect('asset.department', 'department')
        .leftJoinAndSelect('asset.responsable', 'responsable')
        .where('asset.code = :c', { c: trimmed })
        .orWhere('asset.code LIKE :c', { c: `%${trimmed}%` })
        .orWhere(':c LIKE CONCAT("%", asset.code, "%")', { c: trimmed })
        .getOne();
    }
    if (!asset) {
      throw new NotFoundException(`No existe un bien con codigo ${trimmed}`);
    }
    return asset;
  }

  async create(input: CreateAssetInput, userId?: number): Promise<Asset> {
    const exists = await this.repo.findOne({ where: { code: input.code } });
    if (exists) {
      throw new BadRequestException(`El codigo ${input.code} ya existe`);
    }
    const { purchaseDate, ...rest } = input;
    const asset = this.repo.create({
      ...rest,
      purchaseDate: this.parseDate(purchaseDate),
    });
    const saved = await this.repo.save(asset);
    await this.audit.log({
      userId,
      action: AuditAction.CREATE,
      entity: 'asset',
      entityId: saved.id,
      details: `Bien creado: ${saved.code}`,
    });
    return this.findOne(saved.id);
  }

  async update(input: UpdateAssetInput, userId?: number): Promise<Asset> {
    const asset = await this.findOne(input.id);
    const { id, purchaseDate, ...rest } = input;

    const changes: { field: string; oldValue: string; newValue: string }[] =
      [];
    for (const key of Object.keys(rest) as (keyof typeof rest)[]) {
      const newVal = (rest as any)[key];
      if (newVal === undefined) continue;
      if (!TRACKED_FIELDS.includes(key as keyof Asset)) continue;
      const oldVal = (asset as any)[key];
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        changes.push({
          field: key as string,
          oldValue: String(oldVal ?? ''),
          newValue: String(newVal ?? ''),
        });
      }
    }

    Object.assign(asset, rest);
    if (purchaseDate !== undefined) {
      asset.purchaseDate = this.parseDate(purchaseDate);
    }
    const saved = await this.repo.save(asset);

    for (const change of changes) {
      await this.movements.record({
        assetId: saved.id,
        userId,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }
    await this.audit.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'asset',
      entityId: saved.id,
      details: `Bien actualizado: ${saved.code} (${changes.length} cambios)`,
    });
    return this.findOne(saved.id);
  }

  async remove(id: number, userId?: number): Promise<boolean> {
    const asset = await this.findOne(id);
    const result = await this.repo.delete(id);
    await this.audit.log({
      userId,
      action: AuditAction.DELETE,
      entity: 'asset',
      entityId: id,
      details: `Bien eliminado: ${asset.code}`,
    });
    return (result.affected ?? 0) > 0;
  }

  private parseDate(value?: any): Date | undefined {
    if (!value || value === '' || value === null) return undefined;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? undefined : value;
    }
    const str = String(value).trim();
    if (!str) return undefined;
    const d = new Date(str);
    if (isNaN(d.getTime())) return undefined;
    return d;
  }
}
