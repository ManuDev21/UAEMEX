import { Field, Float, Int, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { AssetStatus } from '../../../common/enums/asset-status.enum';

@InputType()
export class CreateAssetInput {
  @Field()
  @IsNotEmpty({ message: 'El codigo es obligatorio' })
  code: string;

  @Field()
  @IsNotEmpty({ message: 'La descripcion es obligatoria' })
  description: string;

  @Field({ nullable: true })
  @IsOptional()
  brand?: string;

  @Field({ nullable: true })
  @IsOptional()
  model?: string;

  @Field({ nullable: true })
  @IsOptional()
  serialNumber?: string;

  @Field(() => Float, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  value?: number;

  @Field({ nullable: true })
  @IsOptional()
  purchaseDate?: string;

  @Field(() => AssetStatus, {
    nullable: true,
    defaultValue: AssetStatus.ACTIVO,
  })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @Field({ nullable: true })
  @IsOptional()
  observations?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  departmentId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  responsableId?: number;
}
