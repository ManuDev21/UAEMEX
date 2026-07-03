import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class CreateDepartmentInput {
  @Field()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @Field()
  @IsNotEmpty({ message: 'El codigo es obligatorio' })
  code: string;

  @Field({ nullable: true })
  @IsOptional()
  location?: string;

  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
