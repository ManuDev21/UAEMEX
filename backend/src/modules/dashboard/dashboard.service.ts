import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { Department } from '../departments/entities/department.entity';
import { Category } from '../categories/entities/category.entity';
import { AssetMovement } from '../movements/entities/asset-movement.entity';
import { AssetStatus } from '../../common/enums/asset-status.enum';
import { DashboardStats } from './dto/dashboard.types';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Asset)
    private readonly assets: Repository<Asset>,
    @InjectRepository(Department)
    private readonly departments: Repository<Department>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(AssetMovement)
    private readonly movements: Repository<AssetMovement>,
  ) {}

  async getStats(): Promise<DashboardStats> {
    const [
      totalAssets,
      activeAssets,
      retiredAssets,
      maintenanceAssets,
      totalDepartments,
      totalCategories,
    ] = await Promise.all([
      this.assets.count(),
      this.assets.count({ where: { status: AssetStatus.ACTIVO } }),
      this.assets.count({ where: { status: AssetStatus.DADO_DE_BAJA } }),
      this.assets.count({ where: { status: AssetStatus.EN_MANTENIMIENTO } }),
      this.departments.count(),
      this.categories.count(),
    ]);

    const totalValueRow = await this.assets
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.value), 0)', 'total')
      .getRawOne<{ total: string }>();
    const totalValue = Number(totalValueRow?.total ?? 0);

    const byDepartment = await this.assets
      .createQueryBuilder('a')
      .leftJoin('a.department', 'd')
      .select('COALESCE(d.name, :none)', 'label')
      .addSelect('COUNT(a.id)', 'count')
      .addSelect('COALESCE(SUM(a.value), 0)', 'value')
      .setParameter('none', 'Sin asignar')
      .groupBy('label')
      .getRawMany();

    const byCategory = await this.assets
      .createQueryBuilder('a')
      .leftJoin('a.category', 'c')
      .select('COALESCE(c.name, :none)', 'label')
      .addSelect('COUNT(a.id)', 'count')
      .addSelect('COALESCE(SUM(a.value), 0)', 'value')
      .setParameter('none', 'Sin categoria')
      .groupBy('label')
      .getRawMany();

    const byStatus = await this.assets
      .createQueryBuilder('a')
      .select('a.status', 'label')
      .addSelect('COUNT(a.id)', 'count')
      .addSelect('COALESCE(SUM(a.value), 0)', 'value')
      .groupBy('a.status')
      .getRawMany();

    const monthlyRaw = await this.movements
      .createQueryBuilder('m')
      .select("TO_CHAR(m.created_at, 'YYYY-MM')", 'month')
      .addSelect('COUNT(m.id)', 'count')
      .groupBy('month')
      .orderBy('month', 'ASC')
      .limit(12)
      .getRawMany();

    const mapCount = (rows: any[]) =>
      rows.map((r) => ({
        label: r.label,
        count: Number(r.count),
        value: Number(r.value),
      }));

    return {
      totalAssets,
      activeAssets,
      retiredAssets,
      maintenanceAssets,
      totalValue,
      totalDepartments,
      totalCategories,
      byDepartment: mapCount(byDepartment),
      byCategory: mapCount(byCategory),
      byStatus: mapCount(byStatus),
      monthlyMovements: monthlyRaw.map((r) => ({
        month: r.month,
        count: Number(r.count),
      })),
    };
  }
}
