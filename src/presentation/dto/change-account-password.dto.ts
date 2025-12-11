import { IsString, MinLength } from 'class-validator';

export class ChangeAccountPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  password: string;
}

