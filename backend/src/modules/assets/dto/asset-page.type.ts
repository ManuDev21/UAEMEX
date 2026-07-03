import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Asset } from '../entities/asset.entity';

@ObjectType()
export class AssetPage {
  @Field(() => [Asset])
  items: Asset[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}
