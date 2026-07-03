import { Field, Int, InputType, OmitType, PartialType } from '@nestjs/graphql';
import { IsInt } from 'class-validator';
import { CreateAssetInput } from './create-asset.input';

@InputType()
export class UpdateAssetInput extends PartialType(
  OmitType(CreateAssetInput, ['code'] as const),
) {
  @Field(() => Int)
  @IsInt()
  id: number;
}
