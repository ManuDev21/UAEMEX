import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Responsable } from './entities/responsable.entity';
import { ResponsablesService } from './responsables.service';
import { ResponsablesResolver } from './responsables.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Responsable])],
  providers: [ResponsablesService, ResponsablesResolver],
  exports: [ResponsablesService],
})
export class ResponsablesModule {}
