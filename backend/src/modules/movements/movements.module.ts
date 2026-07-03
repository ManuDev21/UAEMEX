import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetMovement } from './entities/asset-movement.entity';
import { MovementsService } from './movements.service';
import { MovementsResolver } from './movements.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([AssetMovement])],
  providers: [MovementsService, MovementsResolver],
  exports: [MovementsService],
})
export class MovementsModule {}
