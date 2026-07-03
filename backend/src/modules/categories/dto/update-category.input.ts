import { Field, Int, InputType, PartialType } from '@nestjs/graphql';
import { IsInt } from 'class-validator';
import { CreateCategoryInput } from './create-category.input';

@InputType()
export class UpdateCategoryInput extends PartialType(CreateCategoryInput) {
  @Field(() => Int)
  @IsInt()
  id: number;
}
