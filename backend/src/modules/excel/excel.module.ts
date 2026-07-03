import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { Department } from '../departments/entities/department.entity';
import { Category } from '../categories/entities/category.entity';
import { Responsable } from '../responsables/entities/responsable.entity';
import { ExcelImport } from './entities/excel-import.entity';
import { ExcelService } from './excel.service';
import { ExcelController } from './excel.controller';
import { ExcelResolver } from './excel.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Asset,
      Department,
      Category,
      Responsable,
      ExcelImport,
    ]),
  ],
  controllers: [ExcelController],
  providers: [ExcelService, ExcelResolver],
})
export class ExcelModule {}
