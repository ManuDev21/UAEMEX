import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Query, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from '../../common/guards/gql-jwt-auth.guard';
import { AssetMovement } from './entities/asset-movement.entity';
import { MovementsService } from './movements.service';

@Resolver(() => AssetMovement)
@UseGuards(GqlJwtAuthGuard)
export class MovementsResolver {
  constructor(private readonly service: MovementsService) {}

  @Query(() => [AssetMovement], { name: 'assetMovements' })
  byAsset(
    @Args('assetId', { type: () => ID }) assetId: number,
  ): Promise<AssetMovement[]> {
    return this.service.findByAsset(assetId);
  }

  @Query(() => [AssetMovement], { name: 'recentMovements' })
  recent(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 })
    limit: number,
  ): Promise<AssetMovement[]> {
    return this.service.findRecent(limit);
  }
}
