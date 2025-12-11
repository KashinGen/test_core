import { IsNotEmpty, IsString } from 'class-validator';

export class AuthRefreshDto {
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}


