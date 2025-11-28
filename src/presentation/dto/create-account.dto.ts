import { IsEmail, IsString, IsArray, MinLength, IsNotEmpty } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsArray()
  @IsString({ each: true })
  roles: string[];

  @IsArray()
  @IsString({ each: true })
  sources?: string[];
}

