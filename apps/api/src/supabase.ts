import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HttpException, HttpStatus } from '@nestjs/common';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ${name} não definida`);
  return v;
}

const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Cliente "anônimo" (só a publishable key). Usado para validar tokens e no primeiro acesso. */
let anon: SupabaseClient | undefined;
export function anonClient(): SupabaseClient {
  return (anon ??= createClient(env('SUPABASE_URL'), env('SUPABASE_PUBLISHABLE_KEY'), opts));
}

/** Cliente que age como o usuário logado: as regras RLS do banco valem para ele. */
export function userClient(accessToken: string): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_PUBLISHABLE_KEY'), {
    ...opts,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

interface PgError {
  code?: string;
  message: string;
}

/** Converte erros do Postgres/PostgREST em respostas HTTP. */
export function raise(error: PgError): never {
  const map: Record<string, HttpStatus> = {
    '42501': HttpStatus.FORBIDDEN,
    '22023': HttpStatus.BAD_REQUEST,
    '23514': HttpStatus.BAD_REQUEST,
    '22P02': HttpStatus.BAD_REQUEST,
    '23503': HttpStatus.BAD_REQUEST,
    '23505': HttpStatus.CONFLICT,
    PGRST116: HttpStatus.NOT_FOUND,
  };
  const status = (error.code && map[error.code]) || HttpStatus.INTERNAL_SERVER_ERROR;
  throw new HttpException({ statusCode: status, message: error.message }, status);
}

/** Desembrulha `{ data, error }` do supabase-js. */
export function unwrap<T>(res: { data: T | null; error: PgError | null }): T {
  if (res.error) raise(res.error);
  return res.data as T;
}
