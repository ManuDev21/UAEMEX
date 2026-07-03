import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { AssetStatus } from '../../../common/enums/asset-status.enum';

@InputType()
export class AssetsFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  search?: string;

  @Field(() => AssetStatus, { nullable: true })
  @IsOptional()
  status?: AssetStatus;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  categoryId?: number;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  departmentId?: number;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  responsableId?: number;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
