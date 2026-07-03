import { Field, Int, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  fullName: string;

  @Field()
  @IsEmail({}, { message: 'El correo no es valido' })
  email: string;

  @Field()
  @MinLength(6, { message: 'La contrasena debe tener al menos 6 caracteres' })
  password: string;

  @Field(() => Int)
  @IsInt()
  roleId: number;

  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
