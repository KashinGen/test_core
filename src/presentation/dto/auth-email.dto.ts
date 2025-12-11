import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AuthEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}


