import { Field, Int, InputType, PartialType } from '@nestjs/graphql';
import { IsInt } from 'class-validator';
import { CreateDepartmentInput } from './create-department.input';

@InputType()
export class UpdateDepartmentInput extends PartialType(CreateDepartmentInput) {
  @Field(() => Int)
  @IsInt()
  id: number;
}
