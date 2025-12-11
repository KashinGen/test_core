import { IsEmail } from 'class-validator';

export class ResetAccountPasswordDto {
  @IsEmail()
  email: string;
}




