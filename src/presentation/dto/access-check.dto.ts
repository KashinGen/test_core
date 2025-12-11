import { IsString, IsNotEmpty } from 'class-validator';

export class AccessCheckDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  resource: string;
}





