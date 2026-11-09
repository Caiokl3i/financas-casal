-- Dados iniciais: os mesmos valores do artefato "Orçamento do Caio e da Júlia".
-- Totais esperados: entra 6.550 · sai 3.661,89 · sobra 2.888,11 · investir 1.788,11

insert into public.people (name, color, email, position) values
  ('Caio',  'blue', 'caio.victor.santos12@gmail.com', 0),
  ('Júlia', 'pink', 'juliaandradecamera@gmail.com',   1);

insert into public.template_items (person_id, kind, description, amount_cents, position)
select p.id, v.kind::public.item_kind, v.description, v.amount_cents, v.position
from (values
  ('caio.victor.santos12@gmail.com', 'income',  'Salário',             247000, 0),
  ('caio.victor.santos12@gmail.com', 'income',  'Pensão',               43000, 1),
  ('caio.victor.santos12@gmail.com', 'income',  'Aula de guitarra',     13000, 2),
  ('caio.victor.santos12@gmail.com', 'income',  'Horas extras',         42000, 3),
  ('juliaandradecamera@gmail.com',   'income',  'Salário',             310000, 0),
  ('caio.victor.santos12@gmail.com', 'expense', 'Fatura',               60000, 0),
  ('caio.victor.santos12@gmail.com', 'expense', 'Carro',                54000, 1),
  ('caio.victor.santos12@gmail.com', 'expense', 'Gasolina',             40000, 2),
  ('caio.victor.santos12@gmail.com', 'expense', 'Dízimo',               34500, 3),
  ('caio.victor.santos12@gmail.com', 'expense', 'Internet',             13000, 4),
  ('caio.victor.santos12@gmail.com', 'expense', 'Claude',               11000, 5),
  ('caio.victor.santos12@gmail.com', 'expense', 'Internet do celular',   3500, 6),
  ('juliaandradecamera@gmail.com',   'expense', 'Moto',                 55000, 0),
  ('juliaandradecamera@gmail.com',   'expense', 'Fatura',               40000, 1),
  ('juliaandradecamera@gmail.com',   'expense', 'Dízimo',               31000, 2),
  ('juliaandradecamera@gmail.com',   'expense', null,                    9000, 3),
  ('juliaandradecamera@gmail.com',   'expense', 'Remédio',               8500, 4),
  ('juliaandradecamera@gmail.com',   'expense', 'Internet do celular',   3500, 5),
  ('juliaandradecamera@gmail.com',   'expense', null,                    2500, 6),
  ('juliaandradecamera@gmail.com',   'expense', 'Spotify',                689, 7)
) as v(email, kind, description, amount_cents, position)
join public.people p on p.email = v.email;

insert into public.template_allocations (label, amount_cents, color, position) values
  ('Para a Júlia', 40000, 'pink', 0),
  ('Caio e lazer', 70000, 'blue', 1);
