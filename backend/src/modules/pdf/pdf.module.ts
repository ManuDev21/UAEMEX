import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { Department } from '../departments/entities/department.entity';
import { Category } from '../categories/entities/category.entity';
import { Responsable } from '../responsables/entities/responsable.entity';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Asset,
      Department,
      Category,
      Responsable,
    ]),
  ],
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
