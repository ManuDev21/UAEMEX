import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { AssetsService } from './assets.service';
import { AssetsResolver } from './assets.resolver';
import { MovementsModule } from '../movements/movements.module';

@Module({
  imports: [TypeOrmModule.forFeature([Asset]), MovementsModule],
  providers: [AssetsService, AssetsResolver],
  exports: [AssetsService],
})
export class AssetsModule {}
