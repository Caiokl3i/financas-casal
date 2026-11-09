import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { anonClient, userClient } from './supabase';

export interface Person {
  id: string;
  name: string;
  color: 'blue' | 'pink';
  email: string;
}

export interface Ctx {
  person: Person;
  sb: SupabaseClient;
}

const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Injeta `{ person, sb }` do usuário logado no controller. */
export const Current = createParamDecorator((_: unknown, ctx: ExecutionContext): Ctx => {
  const req = ctx.switchToHttp().getRequest();
  return { person: req.person, sb: req.sb };
});

// Cache curto para não validar o mesmo token no Supabase a cada requisição.
const cache = new Map<string, { person: Person; exp: number }>();
const TTL_MS = 60_000;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
    if (!token) throw new UnauthorizedException('Faça login');

    const sb = userClient(token);
    const hit = cache.get(token);
    if (hit && hit.exp > Date.now()) {
      req.person = hit.person;
      req.sb = sb;
      return true;
    }

    const { data, error } = await anonClient().auth.getUser(token);
    if (error || !data.user?.email) throw new UnauthorizedException('Sessão expirada, entre de novo');

    const { data: person } = await sb
      .from('people')
      .select('id, name, color, email')
      .eq('email', data.user.email.toLowerCase())
      .maybeSingle();
    if (!person) throw new ForbiddenException('Este usuário não tem acesso');

    if (cache.size > 100) cache.clear();
    cache.set(token, { person: person as Person, exp: Date.now() + TTL_MS });
    req.person = person;
    req.sb = sb;
    return true;
  }
}
