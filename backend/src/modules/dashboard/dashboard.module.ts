import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { Department } from '../departments/entities/department.entity';
import { Category } from '../categories/entities/category.entity';
import { AssetMovement } from '../movements/entities/asset-movement.entity';
import { DashboardService } from './dashboard.service';
import { DashboardResolver } from './dashboard.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, Department, Category, AssetMovement]),
  ],
  providers: [DashboardService, DashboardResolver],
})
export class DashboardModule {}
