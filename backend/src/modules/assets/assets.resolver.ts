import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from '../../common/guards/gql-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role-name.enum';
import {
  CurrentUser,
  JwtUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Asset } from './entities/asset.entity';
import { AssetsService } from './assets.service';
import { CreateAssetInput } from './dto/create-asset.input';
import { UpdateAssetInput } from './dto/update-asset.input';
import { AssetsFilterInput } from './dto/assets-filter.input';
import { AssetPage } from './dto/asset-page.type';

@Resolver(() => Asset)
@UseGuards(GqlJwtAuthGuard, RolesGuard)
export class AssetsResolver {
  constructor(private readonly service: AssetsService) {}

  @Query(() => AssetPage, { name: 'assets' })
  paginate(
    @Args('filter', { nullable: true }) filter?: AssetsFilterInput,
  ): Promise<AssetPage> {
    return this.service.paginate(filter ?? {});
  }

  @Query(() => Asset, { name: 'asset' })
  findOne(@Args('id', { type: () => ID }) id: number): Promise<Asset> {
    return this.service.findOne(id);
  }

  @Query(() => Asset, { name: 'assetByCode' })
  findByCode(@Args('code') code: string): Promise<Asset> {
    return this.service.findByCode(code);
  }

  @Roles(RoleName.ADMIN)
  @Mutation(() => Asset)
  createAsset(
    @Args('input') input: CreateAssetInput,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<Asset> {
    return this.service.create(input, user.sub);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @Mutation(() => Asset)
  updateAsset(
    @Args('input') input: UpdateAssetInput,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<Asset> {
    return this.service.update(input, user.sub);
  }

  @Roles(RoleName.ADMIN)
  @Mutation(() => Boolean)
  removeAsset(
    @Args('id', { type: () => ID }) id: number,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<boolean> {
    return this.service.remove(id, user.sub);
  }
}
