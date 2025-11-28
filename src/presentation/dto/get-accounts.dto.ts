import { IsOptional, IsInt, Min, Max, IsString, IsArray, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetAccountsOrderDto {
  @IsOptional()
  @IsEnum(SortOrder)
  name?: SortOrder;

  @IsOptional()
  @IsEnum(SortOrder)
  email?: SortOrder;

  @IsOptional()
  @IsEnum(SortOrder)
  roles?: SortOrder;

  @IsOptional()
  @IsEnum(SortOrder)
  createdAt?: SortOrder;
}

export class GetAccountsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 20;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value, obj }) => {
    // Поддержка форматов: ?id[]=uuid1&id[]=uuid2 или ?id=uuid1&id=uuid2
    if (Array.isArray(value)) {
      return value.filter((v) => v !== null && v !== undefined);
    }
    if (typeof value === 'string') {
      return [value];
    }
    // Если пришел как объект из qs.parse
    if (obj.id && typeof obj.id === 'object' && !Array.isArray(obj.id)) {
      return Object.values(obj.id).filter((v) => typeof v === 'string');
    }
    return [];
  })
  id?: string[];

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value, obj }) => {
    if (Array.isArray(value)) {
      return value.filter((v) => v !== null && v !== undefined);
    }
    if (typeof value === 'string') {
      return [value];
    }
    if (obj.company && typeof obj.company === 'object' && !Array.isArray(obj.company)) {
      return Object.values(obj.company).filter((v) => typeof v === 'string');
    }
    return [];
  })
  company?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value, obj }) => {
    if (Array.isArray(value)) {
      return value.filter((v) => v !== null && v !== undefined);
    }
    if (typeof value === 'string') {
      return [value];
    }
    if (obj.role && typeof obj.role === 'object' && !Array.isArray(obj.role)) {
      return Object.values(obj.role).filter((v) => typeof v === 'string');
    }
    return [];
  })
  role?: string[];

  @IsOptional()
  @Transform(({ value, obj }) => {
    // Парсинг order[name], order[email] из query параметров
    if (value && typeof value === 'object') {
      return value;
    }
    
    // Если order пришел как вложенный объект из qs.parse
    const order: any = {};
    if (obj.order) {
      if (typeof obj.order === 'object') {
        return obj.order;
      }
    }
    
    // Парсинг из плоских ключей order[name], order[email]
    Object.keys(obj).forEach((key) => {
      if (key.startsWith('order[') && key.endsWith(']')) {
        const field = key.slice(6, -1);
        const orderValue = obj[key];
        if (orderValue === 'asc' || orderValue === 'desc') {
          order[field] = orderValue;
        }
      }
    });
    
    return Object.keys(order).length > 0 ? order : undefined;
  })
  @Type(() => GetAccountsOrderDto)
  order?: GetAccountsOrderDto;
}

