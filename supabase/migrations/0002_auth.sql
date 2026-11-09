-- Login: só os e-mails cadastrados em `people` podem ter conta.

-- 1) Bloqueia qualquer cadastro no Supabase Auth de e-mail fora da lista.
create or replace function public.guard_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.people p where p.email = lower(new.email)) then
    raise exception 'Cadastro não permitido para este e-mail' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_signup
  before insert on auth.users
  for each row execute function public.guard_signup();

revoke execute on function public.guard_signup() from public, anon, authenticated;

-- 2) Primeiro acesso: cria a senha de um dos e-mails liberados, já confirmado,
--    sem depender de envio de e-mail. Só funciona uma vez por e-mail.
create or replace function public.first_access(p_email text, p_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_uid uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.people p where p.email = v_email) then
    raise exception 'E-mail não liberado' using errcode = '42501';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'Este e-mail já tem senha. Use Entrar.' using errcode = '23505';
  end if;
  if p_password is null or length(p_password) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres' using errcode = '22023';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_uid, v_uid::text, 'email',
    jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
    now(), now(), now()
  );

  return 'ok';
end;
$$;

revoke execute on function public.first_access(text, text) from public;
grant execute on function public.first_access(text, text) to anon, authenticated;
