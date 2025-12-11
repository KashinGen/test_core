import { IsEmail, IsString, IsEnum, MinLength } from 'class-validator';
import { Role } from '@domain/common/types';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  plainPassword: string;

  @IsEnum(Role)
  role: Role;
}





