import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { DepartmentsService } from './departments.service';
import { DepartmentsResolver } from './departments.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Department])],
  providers: [DepartmentsService, DepartmentsResolver],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
