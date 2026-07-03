import { Field, Int, InputType, PartialType } from '@nestjs/graphql';
import { IsInt } from 'class-validator';
import { CreateResponsableInput } from './create-responsable.input';

@InputType()
export class UpdateResponsableInput extends PartialType(CreateResponsableInput) {
  @Field(() => Int)
  @IsInt()
  id: number;
}
