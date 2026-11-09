import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const MAX_CENTS = 100_000_000; // R$ 1 milhão
const trimOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class FirstAccessDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  @Transform(trim)
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres' })
  @MaxLength(72)
  password: string;
}

export class CreateItemDto {
  @IsUUID()
  personId: string;

  @IsIn(['income', 'expense'])
  kind: 'income' | 'expense';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(trimOrNull)
  description?: string | null;

  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  amountCents: number;

  @IsOptional()
  @IsBoolean()
  repeat?: boolean;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(trimOrNull)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  amountCents?: number;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;
}

export class CreateAllocationDto {
  @IsString()
  @MinLength(1, { message: 'Dê um nome ao destino' })
  @MaxLength(60)
  @Transform(trim)
  label: string;

  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  amountCents: number;

  @IsIn(['pink', 'blue', 'ink'])
  color: 'pink' | 'blue' | 'ink';
}

export class UpdateAllocationDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Dê um nome ao destino' })
  @MaxLength(60)
  @Transform(trim)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  amountCents?: number;

  @IsOptional()
  @IsIn(['pink', 'blue', 'ink'])
  color?: 'pink' | 'blue' | 'ink';
}
