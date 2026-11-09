# Finanças do Caio e da Júlia — Documento de contexto para implementação

> Guia completo para implementar o site de orçamento mensal do casal. Qualquer pessoa (ou agente) que for implementar deve conseguir trabalhar só com este documento.
>
> Referência visual: artefato **"Orçamento do Caio e da Júlia"** — https://claude.ai/artifact/J4Yw1BE5CSjoTfJ3Bq7SnM

---

## Sumário

1. [Visão geral e objetivos](#1-visão-geral-e-objetivos)
2. [Referência de design](#2-referência-de-design)
3. [Funcionalidades do MVP](#3-funcionalidades-do-mvp)
4. [Regras de negócio](#4-regras-de-negócio)
5. [Arquitetura](#5-arquitetura)
6. [Autenticação](#6-autenticação)
7. [Banco de dados](#7-banco-de-dados-postgres-no-supabase)
8. [API (NestJS)](#8-api-nestjs)
9. [Frontend (React)](#9-frontend-react)
10. [Variáveis de ambiente](#10-variáveis-de-ambiente)
11. [Deploy na Vercel](#11-deploy-na-vercel)
12. [Roteiro de implementação](#12-roteiro-de-implementação-em-fases)
13. [Critérios de aceite e testes](#13-critérios-de-aceite-e-testes)
14. [Fora do MVP](#14-fora-do-mvp-ideias-futuras)

---

## 1. Visão geral e objetivos

### O problema
Hoje o orçamento do casal está num caderno e foi passado para um artefato estático. Todo mês os dois querem ver rapidamente:

- **Quanto entra** — o que cada um recebe (salário, pensão, aulas, horas extras…).
- **Quanto sai** — contas e gastos fixos de cada um.
- **O que falta pagar** no mês.
- **Quanto sobra** e **para onde vai** a sobra (uma parte para a Júlia, uma para o Caio/lazer, o resto para investir).

### O que o sistema faz
Um site com o **mesmo visual do artefato**, mas onde é possível:

- adicionar, editar e remover entradas e gastos fixos de cada pessoa;
- mudar quanto da sobra fica para cada um (e criar/remover destinos);
- ver mês a mês (histórico) e marcar o que já foi pago;
- os dois entrarem com login próprio e verem o que o outro alterou.

### Usuários
Exatamente **2 usuários**: **Caio** (cor azul) e **Júlia** (cor rosa). Não existe cadastro público. Os dois têm as mesmas permissões: veem e editam tudo, inclusive os itens um do outro.

### Princípio guia: simples
- Uma tela principal (o mês) que se parece com o artefato.
- Edição acontece **na própria tela**, ativando um modo "Editar" — sem formulários longos.
- Sem categorias, tags, gráficos extras, metas, contas bancárias, importação de extrato.

### Não-objetivos (MVP)
- Registrar gastos avulsos do dia a dia (só itens fixos/mensais).
- Multi-moeda, multi-casal, convites, papéis/permissões.
- App nativo (o site é responsivo e funciona bem no celular).

---

## 2. Referência de design

**Regra principal: o design deve ser idêntico ao do artefato.** Portar o CSS abaixo literalmente para `apps/web/src/styles/global.css` e reproduzir a mesma estrutura HTML nos componentes React. Elementos novos (botões, inputs, checkbox, seletor de mês) devem seguir a mesma linguagem: bordas pretas de 3px, cantos arredondados, sombra dura deslocada, fonte Bricolage Grotesque em peso 600/800.

### 2.1 Fonte

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&display=swap" rel="stylesheet">
```

No `index.html`: `<html lang="pt-BR">`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, título **"Orçamento do Caio e da Júlia"**.

### 2.2 Tokens de cor

| Token | Valor | Uso |
|---|---|---|
| `--paper` | `#F4F3EE` | fundo da página |
| `--white` | `#FFFFFF` | fundo dos cartões |
| `--ink` | `#0A0A0A` | texto, bordas, sombras, cartão "Sobra"/"Investir" |
| `--muted` | `#5E5D59` | textos de ajuda, "Sem descrição", rodapé |
| `--blue` | `#2B50FF` | **Caio**, card "Entra" |
| `--blue-soft` | `#DCE3FF` | hover/realce do Caio (elementos novos) |
| `--pink` | `#FF5CA3` | **Júlia**, card "Sai" |
| `--pink-soft` | `#FFE0EE` | hover/realce da Júlia (elementos novos) |

Tema apenas claro (`color-scheme: light`), como no artefato.

### 2.3 CSS base (copiar exatamente)

```css
:root {
  --paper: #F4F3EE;
  --white: #FFFFFF;
  --ink: #0A0A0A;
  --muted: #5E5D59;
  --blue: #2B50FF;
  --blue-soft: #DCE3FF;
  --pink: #FF5CA3;
  --pink-soft: #FFE0EE;
  color-scheme: light;
  box-sizing: border-box;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
html { scroll-padding-top: env(safe-area-inset-top, 0px); }
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif;
  font-size: 18px;
  line-height: 1.45;
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
}
main { max-width: 960px; margin: 0 auto; padding: 40px 20px 72px; }

h1 { font-size: clamp(36px, 8vw, 64px); line-height: 1.02; letter-spacing: -0.03em; font-weight: 800; margin: 0 0 12px; }
.lede { font-size: 20px; color: var(--muted); margin: 0 0 32px; max-width: 40ch; }

h2 { font-size: clamp(26px, 5vw, 36px); letter-spacing: -0.025em; line-height: 1.1; font-weight: 800; margin: 0 0 6px; }
.help { margin: 0 0 22px; color: var(--muted); font-size: 17px; }
section { margin-top: 64px; }

/* Cartões com borda preta e sombra dura */
.card {
  background: var(--white);
  border: 3px solid var(--ink);
  border-radius: 16px;
  box-shadow: 6px 6px 0 var(--ink);
  overflow: hidden;
}
.card.blue { box-shadow: 6px 6px 0 var(--blue); }
.card.pink { box-shadow: 6px 6px 0 var(--pink); }

/* Resumo: 3 números grandes */
.summary { display: grid; grid-template-columns: 1fr; gap: 22px; }
@media (min-width: 720px) { .summary { grid-template-columns: repeat(3, 1fr); } }
.big { padding: 20px 22px 22px; border: 3px solid var(--ink); border-radius: 16px; }
.big p { margin: 0; font-size: 18px; font-weight: 600; }
.big strong { display: block; font-size: clamp(34px, 7vw, 44px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; margin-top: 4px; }
.big.in  { background: var(--blue); color: #fff; }
.big.out { background: var(--pink); color: var(--ink); }
.big.left { background: var(--ink); color: var(--paper); }

/* Duas colunas: Caio e Júlia */
.pair { display: grid; grid-template-columns: 1fr; gap: 28px; }
@media (min-width: 720px) { .pair { grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; } }

.card header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 3px solid var(--ink); }
.blue header { background: var(--blue); color: #fff; }
.pink header { background: var(--pink); color: var(--ink); }
.card header h3 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.01em; }
.card header .tot { font-size: 24px; font-weight: 800; }

.rows { list-style: none; margin: 0; padding: 4px 20px 8px; }
.rows li { display: flex; justify-content: space-between; gap: 16px; padding: 13px 0; border-bottom: 1.5px dashed #C9C7BF; font-size: 18px; }
.rows li:last-child { border-bottom: 0; }
.rows b { font-weight: 600; }
.rows .off { color: var(--muted); }

.total-line { margin: 28px 0 0; font-size: 22px; font-weight: 600; }
.total-line b { display: inline-block; margin-left: 8px; padding: 2px 12px; border-radius: 999px; font-size: 24px; font-weight: 800; }
.total-line.in b  { background: var(--blue); color: #fff; }
.total-line.out b { background: var(--pink); color: var(--ink); }

/* Para onde vai a sobra */
.split { display: flex; height: 56px; border: 3px solid var(--ink); border-radius: 12px; overflow: hidden; margin-bottom: 22px; background: var(--white); }
.split div + div { border-left: 3px solid var(--ink); }
.split .p { background: var(--pink); }
.split .b { background: var(--blue); }
.split .k { background: var(--ink); }

.dest { display: grid; grid-template-columns: 1fr; gap: 18px; }
@media (min-width: 720px) { .dest { grid-template-columns: repeat(3, 1fr); } }
.dest .item { border: 3px solid var(--ink); border-radius: 16px; padding: 18px 20px 20px; }
.dest .item p { margin: 0; font-size: 18px; font-weight: 600; }
.dest .item strong { display: block; font-size: 34px; font-weight: 800; letter-spacing: -0.02em; margin-top: 2px; }
.dest .item small { display: block; margin-top: 4px; font-size: 15px; opacity: .85; }
.dest .p { background: var(--pink); }
.dest .b { background: var(--blue); color: #fff; }
.dest .k { background: var(--ink); color: var(--paper); }

.conta { margin: 22px 0 0; font-size: 18px; color: var(--muted); }

footer { margin-top: 56px; color: var(--muted); font-size: 15px; max-width: 56ch; }
:focus-visible { outline: 3px solid var(--blue); outline-offset: 3px; }
```

> Observação: o grid `.dest` tem 3 colunas porque o artefato tem 3 destinos. Como agora o número de destinos é variável, usar `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))` a partir de 720px. É o único ajuste no CSS original.

### 2.4 Estrutura da tela (igual ao artefato)

```
<main>
  [barra superior nova: ‹ Novembro 2026 ›   ·   Editar   ·   Modelo fixo   ·   Sair]
  h1  "Nosso dinheiro do mês"
  p.lede "Quanto entra, quanto sai e o que fazemos com o que sobra."

  .summary → .big.in "Entra" | .big.out "Sai" | .big.left "Sobra"

  section "1. O que entra"  (.help "O dinheiro que cada um recebe no mês.")
    .pair → .card.blue (Caio) | .card.pink (Júlia)   (header com nome + total, ul.rows)
    p.total-line.in "Juntos entram <b>R$ X</b>"

  section "2. O que sai"    (.help "As contas e gastos fixos de cada um.")
    .pair → .card.blue (Caio) | .card.pink (Júlia)
    p.total-line.out "Juntos saem <b>R$ X</b>"
    [novo] p.conta "Falta pagar R$ X · Já pago R$ Y"

  section "3. O que sobra e para onde vai"
    .help "Sobram R$ S (E menos S). Esse valor é dividido assim:"
    .split (uma div por destino + preta para investir, flex-grow = valor)
    .dest  (um .item por destino + .item.k "Para investir" com <small> mostrando a conta)

  footer (texto livre opcional — ex.: "Última alteração por Júlia há 2 horas")
</main>
```

### 2.5 Formato de números (pt-BR)

Implementar em `packages/shared/src/money.ts`:

| Contexto | Exemplo | Regra |
|---|---|---|
| Totais (cabeçalhos dos cards, resumo, total-line, destinos) | `R$ 3.450` / `R$ 1.501,89` | com `R$ `, sem `,00` quando inteiro |
| Linhas dos itens | `2.470` / `6,89` | sem `R$`, sem `,00` quando inteiro |
| Conta do investir (`<small>`) | `2.888,11 − 400 − 700` | sem `R$`, sinal de menos `−` (U+2212) |

```ts
export function formatBRL(cents: number, opts: { symbol?: boolean } = {}) {
  const value = cents / 100;
  const hasCents = cents % 100 !== 0;
  const s = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
  return opts.symbol === false ? s : `R$ ${s}`;
}
```

Entrada de valor: aceitar `"6,89"`, `"6.89"`, `"1.501,89"`, `"1501"` → converter para centavos em `parseBRL()` (remover pontos de milhar quando houver vírgula; trocar vírgula por ponto; `Math.round(x * 100)`). Usar `inputmode="decimal"` no input.

### 2.6 Elementos novos (mesma linguagem visual)

- **Barra superior**: linha flex no topo do `main`, antes do `h1`. Botões "pílula" com `border: 3px solid var(--ink); border-radius: 999px; background: var(--white); padding: 6px 16px; font-weight: 600;` e `box-shadow: 3px 3px 0 var(--ink)`. Ao pressionar (`:active`): `transform: translate(3px,3px); box-shadow: none`.
- **Seletor de mês**: `‹` e `›` como botões quadrados com o mesmo estilo; nome do mês por extenso ("Novembro de 2026") em peso 800.
- **Botão "Editar"**: alterna para "Pronto" quando ativo; fundo `--ink` e texto `--paper` quando ativo.
- **Modo edição nos cards** (`.card.editing`):
  - cada `li` vira clicável; ao tocar, a linha vira dois inputs (descrição e valor) + botão ✓; `Enter` salva, `Esc` cancela;
  - botão `×` à direita de cada linha (24px, círculo com borda 2px preta) para remover — pede confirmação simples (`confirm()` ou segundo toque "Remover?");
  - última linha do `ul`: **"+ adicionar"** em peso 600, cor `--muted`; ao tocar, vira a linha de inputs vazia, com checkbox "repetir nos próximos meses" (marcado por padrão).
- **Inputs**: `font: inherit; border: 2px solid var(--ink); border-radius: 8px; padding: 6px 10px; background: var(--paper);` foco com o `:focus-visible` do artefato.
- **Checkbox "pago"** (somente saídas, sempre visível, não só no modo edição): quadrado 22px com borda 2px preta à esquerda da descrição; marcado = preenchido com a cor da pessoa e ✓; quando pago, a descrição e o valor ficam com `text-decoration: line-through` e cor `--muted`.
- **Destinos da sobra em edição**: cada `.dest .item` (exceto "Para investir") ganha inputs de rótulo/valor, seletor de cor (3 bolinhas: rosa, azul, preto) e `×`; um `.item` tracejado "+ adicionar destino".
- **Aviso de investir negativo**: se Investir < 0, o card preto mostra o valor com sinal negativo e o `<small>` vira "A divisão passou da sobra em R$ X" — sem bloquear.
- **Login**: mesma página `main`, `h1` "Nosso dinheiro do mês", um `.card` com e-mail, senha e botão grande azul ("Entrar"). Opcional: dois botões grandes "Sou o Caio" (azul) / "Sou a Júlia" (rosa) que preenchem o e-mail, deixando só a senha para digitar.

---

## 3. Funcionalidades do MVP

| # | Funcionalidade | Descrição |
|---|---|---|
| F1 | Login | E-mail e senha; sessão persistente no navegador (supabase-js guarda o token). Botão "Sair". |
| F2 | Ver o mês | Abre no mês atual. Mostra resumo, entradas, saídas, sobra e destinos, igual ao artefato. |
| F3 | Navegar entre meses | `‹` / `›` e URL `/m/2026-11`. Ao abrir um mês que ainda não existe, ele é criado a partir do modelo fixo. |
| F4 | Editar itens do mês | No modo Editar: adicionar, editar descrição/valor, remover entradas e saídas de cada pessoa. |
| F5 | "Repetir nos próximos meses" | Ao adicionar no mês, se marcado, o item também entra no modelo fixo (aparece nos meses futuros que ainda não foram criados). |
| F6 | Marcar pago | Checkbox nas saídas. Mostra "Falta pagar R$ X · Já pago R$ Y". |
| F7 | Destinos da sobra | Adicionar, editar (rótulo, valor, cor) e remover destinos. "Para investir" é calculado sozinho. |
| F8 | Modelo fixo | Tela `/modelo` com o mesmo layout (seções 1, 2 e 3, sem "pago"), onde se edita o padrão que será copiado para os próximos meses. |
| F9 | Ver alterações do outro | Os dados se atualizam ao voltar para a aba e a cada 30s. Rodapé discreto: "Última alteração por Júlia há 5 min". |

Fluxos típicos:

- **Começo do mês**: abrir o site → mês novo já vem preenchido com o modelo → ajustar o que mudou (ex.: horas extras) → ao longo do mês ir marcando o que foi pago.
- **Gasto novo fixo** (ex.: academia): Editar → "+ adicionar" no card de saídas do Caio → "Academia", "120", repetir ✓ → salvar.
- **Mudar a divisão**: Editar → no destino "Caio e lazer" trocar 700 por 600 → Investir sobe 100 automaticamente.

---

## 4. Regras de negócio

1. **Dinheiro sempre em centavos inteiros** (`int`) no banco, na API e no estado do front. Formatação só na exibição. Nunca usar `float` para somar.
2. **Totais** (calculados no backend em `packages/shared/src/totals.ts` e reutilizados no front para atualização otimista):
   - `entra = Σ itens kind=income`
   - `sai = Σ itens kind=expense`
   - `sobra = entra − sai`
   - `destinado = Σ destinos`
   - `investir = sobra − destinado` (pode ser negativo → aviso)
   - Por pessoa: `entraPessoa`, `saiPessoa` (para os cabeçalhos dos cards).
   - `jaPago = Σ saídas com paid=true`, `faltaPagar = sai − jaPago`.
3. **Modelo × mês**:
   - O **modelo** (`template_items`, `template_allocations`) é o padrão.
   - Um **mês** (`months` + `month_items` + `month_allocations`) é uma cópia independente, criada **na primeira vez que alguém abre aquele mês**.
   - Editar um mês **não** altera o modelo (exceto "repetir nos próximos meses" ao adicionar, que também cria o item no modelo).
   - Editar o modelo **não** altera meses já criados (o histórico fica congelado). A tela do modelo deve dizer isso: "Mudanças aqui valem para os meses que ainda não foram abertos."
   - Criação do mês deve ser **idempotente** e segura contra os dois abrirem ao mesmo tempo: `INSERT ... ON CONFLICT (ref_month) DO NOTHING` e cópia dos itens dentro de uma transação, só se o mês acabou de ser criado.
   - Só se cria mês até **1 mês no futuro** (evita criar dezenas de meses navegando). Meses passados nunca abertos são criados sob demanda também (cópia do modelo atual).
4. **Ordem**: itens têm `position` (int); novos vão para o fim. Sem drag-and-drop no MVP (opcional depois).
5. **Descrição vazia** é permitida → exibida como "Sem descrição" em `--muted` (o artefato tem dois itens assim).
6. **Valor**: `amount_cents >= 0`. Máximo razoável: 100.000.000 (R$ 1 milhão) para pegar erro de digitação.
7. **Quem alterou**: toda escrita grava `updated_by` (id da pessoa logada) e `updated_at`.
8. **Concorrência**: "último a salvar vence". Sem lock — só 2 usuários.

---

## 5. Arquitetura

```
Navegador (React SPA)
   │  login (supabase-js) ───────────────► Supabase Auth
   │  fetch + Bearer token
   ▼
Vercel — projeto "financas-web"   (estático: Vite build)
Vercel — projeto "financas-api"   (Vercel Function Node com NestJS)
   │  valida JWT pelo JWKS do Supabase
   │  Prisma (pooler de transação)
   ▼
Supabase Postgres
```

### 5.1 Monorepo (npm workspaces)

```
financas-casal/
├─ package.json              # "workspaces": ["apps/*", "packages/*"]
├─ docs/CONTEXTO.md
├─ apps/
│  ├─ web/                   # Vite + React + TypeScript
│  │  ├─ index.html
│  │  ├─ vercel.json         # rewrite SPA: /(.*) → /index.html
│  │  └─ src/
│  │     ├─ main.tsx
│  │     ├─ App.tsx          # rotas
│  │     ├─ lib/supabase.ts  # createClient (auth apenas)
│  │     ├─ lib/api.ts       # fetch com token
│  │     ├─ hooks/           # useMonth, useTemplate, mutations
│  │     ├─ pages/           # LoginPage, MonthPage, TemplatePage
│  │     ├─ components/      # ver seção 9
│  │     └─ styles/global.css
│  └─ api/                   # NestJS
│     ├─ api/index.ts        # entrada serverless da Vercel
│     ├─ vercel.json
│     ├─ prisma/schema.prisma
│     ├─ prisma/migrations/
│     ├─ prisma/seed.ts
│     └─ src/
│        ├─ main.ts          # dev local (app.listen)
│        ├─ app.factory.ts   # cria e configura o app (compartilhado por main.ts e api/index.ts)
│        ├─ app.module.ts
│        ├─ prisma/prisma.service.ts
│        ├─ auth/            # AuthGuard, @CurrentPerson()
│        ├─ people/
│        ├─ months/
│        ├─ items/
│        ├─ allocations/
│        └─ template/
└─ packages/
   └─ shared/                # tipos, DTOs de resposta, formatBRL, parseBRL, calcTotals
```

### 5.2 Bibliotecas

| Onde | Pacotes |
|---|---|
| web | `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `@supabase/supabase-js`, `vite`, `typescript` |
| api | `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@prisma/client`, `prisma`, `jose`, `class-validator`, `class-transformer` |
| testes | `vitest` (shared/web), `jest` (padrão Nest) ou `vitest`, `@playwright/test` (e2e) |

Nada de biblioteca de UI (MUI, Tailwind etc.): o CSS do artefato já resolve e deve ser mantido igual.

---

## 6. Autenticação

**Supabase Auth (e-mail + senha)**, validado no NestJS.

### 6.1 Configuração no Supabase
1. Authentication → Providers → Email: habilitado. **Desabilitar "Allow new users to sign up"**.
2. Authentication → Users → "Add user" duas vezes (Caio e Júlia), com "Auto confirm user".
3. Copiar o `id` (uuid) de cada usuário para o seed da tabela `people` (`auth_user_id`).

### 6.2 Fluxo
1. Front chama `supabase.auth.signInWithPassword({ email, password })`.
2. supabase-js guarda a sessão e renova o token sozinho.
3. Cada chamada à API envia `Authorization: Bearer ${session.access_token}`.
4. Nest `AuthGuard` (global, via `APP_GUARD`):
   - lê o bearer token;
   - valida com `jose.jwtVerify(token, JWKS, { issuer: `${SUPABASE_URL}/auth/v1`, audience: 'authenticated' })`, onde `JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))` (criar uma vez e reutilizar);
   - busca `people` por `auth_user_id = payload.sub` (cachear em memória);
   - se não achar → `403`; se token inválido → `401`;
   - coloca a pessoa em `request.person`.
5. Decorator `@CurrentPerson()` entrega a pessoa aos controllers (para `updated_by`).
6. Front: se a API responder `401`, chamar `supabase.auth.signOut()` e ir para `/login`.

> Se o projeto Supabase ainda usar o segredo JWT legado (HS256) em vez de chaves assimétricas, a alternativa é `jwtVerify(token, new TextEncoder().encode(SUPABASE_JWT_SECRET))`. Preferir JWKS (projetos novos já usam chaves assimétricas).

### 6.3 Esboço do guard

```ts
@Injectable()
export class AuthGuard implements CanActivate {
  private jwks = createRemoteJWKSet(new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  constructor(private people: PeopleService, private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext) {
    if (this.reflector.get<boolean>('public', ctx.getHandler())) return true;
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) throw new UnauthorizedException();
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: `${process.env.SUPABASE_URL}/auth/v1`,
        audience: 'authenticated',
      });
      const person = await this.people.findByAuthId(payload.sub!);
      if (!person) throw new ForbiddenException();
      req.person = person;
      return true;
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      throw new UnauthorizedException();
    }
  }
}
```

---

## 7. Banco de dados (Postgres no Supabase)

### 7.1 Modelo

```
people ─┬─< template_items
        ├─< month_items >── months ──< month_allocations
        └── (updated_by em todas as tabelas)
template_allocations (independente)
```

### 7.2 DDL (referência — gerar via migração Prisma)

```sql
create type item_kind  as enum ('income', 'expense');
create type dest_color as enum ('pink', 'blue', 'ink');
create type person_color as enum ('blue', 'pink');

create table people (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                 -- 'Caio', 'Júlia'
  color         person_color not null,         -- Caio=blue, Júlia=pink
  auth_user_id  uuid not null unique,          -- auth.users.id
  position      int  not null default 0
);

create table template_items (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references people(id) on delete cascade,
  kind          item_kind not null,
  description   text,                          -- null/'' = "Sem descrição"
  amount_cents  int  not null check (amount_cents >= 0),
  position      int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references people(id)
);
create index on template_items (person_id, kind, position);

create table template_allocations (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,                 -- 'Para a Júlia'
  amount_cents  int  not null check (amount_cents >= 0),
  color         dest_color not null default 'pink',
  position      int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references people(id)
);

create table months (
  id            uuid primary key default gen_random_uuid(),
  ref_month     date not null unique check (extract(day from ref_month) = 1),
  created_at    timestamptz not null default now(),
  created_by    uuid references people(id)
);

create table month_items (
  id               uuid primary key default gen_random_uuid(),
  month_id         uuid not null references months(id) on delete cascade,
  person_id        uuid not null references people(id) on delete cascade,
  kind             item_kind not null,
  description      text,
  amount_cents     int  not null check (amount_cents >= 0),
  paid             boolean not null default false,  -- só faz sentido para expense
  paid_at          timestamptz,
  template_item_id uuid references template_items(id) on delete set null,
  position         int  not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid references people(id)
);
create index on month_items (month_id, person_id, kind, position);

create table month_allocations (
  id            uuid primary key default gen_random_uuid(),
  month_id      uuid not null references months(id) on delete cascade,
  label         text not null,
  amount_cents  int  not null check (amount_cents >= 0),
  color         dest_color not null default 'pink',
  position      int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references people(id)
);
create index on month_allocations (month_id, position);

-- Segurança: ninguém acessa pela Data API pública do Supabase.
-- RLS ligado e SEM policies = anon/authenticated não leem nem escrevem.
-- O backend conecta como 'postgres' (dono das tabelas) e não é afetado.
alter table people               enable row level security;
alter table template_items       enable row level security;
alter table template_allocations enable row level security;
alter table months               enable row level security;
alter table month_items          enable row level security;
alter table month_allocations    enable row level security;
```

### 7.3 Prisma

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooler de transação, porta 6543
  directUrl = env("DIRECT_URL")     // conexão direta (ou pooler de sessão 5432), para migrate
}
generator client { provider = "prisma-client-js" }
```

Mapear as tabelas com `@@map("snake_case")` e campos com `@map`. Usar `@db.Uuid`, `@db.Date`, `@db.Timestamptz`. Após `prisma migrate dev` gerar a migração inicial, acrescentar à mão no SQL da migração as linhas `enable row level security` (o Prisma não gera isso).

- `DATABASE_URL=postgresql://postgres.<ref>:<senha>@aws-0-<região>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
- `DIRECT_URL=postgresql://postgres.<ref>:<senha>@aws-0-<região>.pooler.supabase.com:5432/postgres`

`connection_limit=1` é importante em função serverless para não esgotar conexões.

### 7.4 Seed (dados exatos do artefato)

`prisma/seed.ts` — lê `CAIO_AUTH_ID` e `JULIA_AUTH_ID` do ambiente.

**Pessoas**: Caio (blue, position 0), Júlia (pink, position 1).

**Modelo — entradas**

| Pessoa | Descrição | Centavos |
|---|---|---|
| Caio | Salário | 247000 |
| Caio | Pensão | 43000 |
| Caio | Aula de guitarra | 13000 |
| Caio | Horas extras | 42000 |
| Júlia | Salário | 310000 |

**Modelo — saídas**

| Pessoa | Descrição | Centavos |
|---|---|---|
| Caio | Fatura | 60000 |
| Caio | Carro | 54000 |
| Caio | Gasolina | 40000 |
| Caio | Dízimo | 34500 |
| Caio | Internet | 13000 |
| Caio | Claude | 11000 |
| Caio | Internet do celular | 3500 |
| Júlia | Moto | 55000 |
| Júlia | Fatura | 40000 |
| Júlia | Dízimo | 31000 |
| Júlia | *(sem descrição)* | 9000 |
| Júlia | Remédio | 8500 |
| Júlia | Internet do celular | 3500 |
| Júlia | *(sem descrição)* | 2500 |
| Júlia | Spotify | 689 |

**Modelo — destinos da sobra**

| Rótulo | Centavos | Cor |
|---|---|---|
| Para a Júlia | 40000 | pink |
| Caio e lazer | 70000 | blue |

**Totais esperados** (usar como teste):

| | Caio | Júlia | Juntos |
|---|---|---|---|
| Entra | R$ 3.450 | R$ 3.100 | **R$ 6.550** |
| Sai | R$ 2.160 | R$ 1.501,89 | **R$ 3.661,89** |
| Sobra | | | **R$ 2.888,11** |
| Investir | | | **R$ 1.788,11** (2.888,11 − 400 − 700) |

---

## 8. API (NestJS)

### 8.1 Convenções
- Prefixo: nenhum (a API tem domínio próprio). JSON em camelCase.
- `ym` = `YYYY-MM` (validar com regex `^\d{4}-(0[1-9]|1[0-2])$`).
- Valores sempre `amountCents` (inteiro).
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` global.
- CORS: `app.enableCors({ origin: process.env.ALLOWED_ORIGIN.split(','), credentials: false })`.
- Erros padrão do Nest (`400`, `401`, `403`, `404`).

### 8.2 Endpoints

| Método | Rota | Corpo | Resposta / efeito |
|---|---|---|---|
| GET | `/health` | — | `{ ok: true }` (público) |
| GET | `/me` | — | pessoa logada `{ id, name, color }` |
| GET | `/people` | — | as 2 pessoas (ordem por `position`) |
| GET | `/months/:ym` | — | `MonthView` (cria o mês a partir do modelo se não existir) |
| POST | `/months/:ym/items` | `{ personId, kind, description?, amountCents, repeat?: boolean }` | cria item no mês; se `repeat`, cria também no modelo e liga `template_item_id` |
| PATCH | `/items/:id` | `{ description?, amountCents?, paid? }` | atualiza item do mês (`paid=true` grava `paid_at`) |
| DELETE | `/items/:id` | — | remove item do mês (não mexe no modelo) |
| POST | `/months/:ym/allocations` | `{ label, amountCents, color }` | cria destino no mês |
| PATCH | `/allocations/:id` | `{ label?, amountCents?, color? }` | atualiza destino do mês |
| DELETE | `/allocations/:id` | — | remove destino do mês |
| GET | `/template` | — | `TemplateView` (itens + destinos + totais) |
| POST | `/template/items` | `{ personId, kind, description?, amountCents }` | cria item no modelo |
| PATCH | `/template/items/:id` | `{ description?, amountCents? }` | |
| DELETE | `/template/items/:id` | — | |
| POST | `/template/allocations` | `{ label, amountCents, color }` | |
| PATCH | `/template/allocations/:id` | `{ label?, amountCents?, color? }` | |
| DELETE | `/template/allocations/:id` | — | |

Todas as rotas de escrita retornam o objeto alterado; o front invalida a query do mês/modelo e recarrega.

### 8.3 Formato de resposta (`packages/shared/src/types.ts`)

```ts
export type Kind = 'income' | 'expense';
export type DestColor = 'pink' | 'blue' | 'ink';

export interface Person { id: string; name: string; color: 'blue' | 'pink'; }

export interface Item {
  id: string; personId: string; kind: Kind;
  description: string | null; amountCents: number;
  paid: boolean;            // sempre false no modelo
  position: number;
  updatedAt: string; updatedBy: string | null;
}

export interface Allocation {
  id: string; label: string; amountCents: number; color: DestColor; position: number;
}

export interface Totals {
  entra: number; sai: number; sobra: number; destinado: number; investir: number;
  jaPago: number; faltaPagar: number;
  porPessoa: Record<string, { entra: number; sai: number }>;
}

export interface MonthView {
  ym: string;                 // '2026-11'
  people: Person[];
  items: Item[];
  allocations: Allocation[];
  totals: Totals;
  lastChange: { at: string; byName: string } | null;
}
export type TemplateView = Omit<MonthView, 'ym'>;
```

`calcTotals(items, allocations)` mora em `packages/shared` e é usado no `MonthsService` e no front (otimista).

### 8.4 Criação do mês (MonthsService.getOrCreate)

```ts
async getOrCreate(ym: string, person: Person): Promise<MonthView> {
  const ref = new Date(`${ym}-01T00:00:00Z`);
  // limite: até 1 mês à frente do mês atual
  let month = await prisma.month.findUnique({ where: { refMonth: ref } });
  if (!month) {
    month = await prisma.$transaction(async (tx) => {
      const created = await tx.$queryRaw`
        insert into months (ref_month, created_by) values (${ref}, ${person.id}::uuid)
        on conflict (ref_month) do nothing returning *`;
      if (created.length === 0) return tx.month.findUniqueOrThrow({ where: { refMonth: ref } });
      const m = created[0];
      const tItems = await tx.templateItem.findMany();
      const tAllocs = await tx.templateAllocation.findMany();
      await tx.monthItem.createMany({ data: tItems.map(t => ({ monthId: m.id, personId: t.personId, kind: t.kind,
        description: t.description, amountCents: t.amountCents, position: t.position, templateItemId: t.id })) });
      await tx.monthAllocation.createMany({ data: tAllocs.map(a => ({ monthId: m.id, label: a.label,
        amountCents: a.amountCents, color: a.color, position: a.position })) });
      return m;
    });
  }
  return this.buildView(month.id);
}
```

### 8.5 Entrada serverless na Vercel

`apps/api/src/app.factory.ts`
```ts
export async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.enableCors({ origin: process.env.ALLOWED_ORIGIN!.split(',') });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return app;
}
```

`apps/api/api/index.ts`
```ts
import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../src/app.factory';

let handler: ((req: IncomingMessage, res: ServerResponse) => void) | undefined;

export default async function (req: IncomingMessage, res: ServerResponse) {
  if (!handler) {
    const app = await createApp();
    handler = app.getHttpAdapter().getInstance(); // instância Express
  }
  handler(req, res);
}
```

`apps/api/vercel.json`
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/api" }]
}
```

`apps/api/src/main.ts` (dev local): `const app = await createApp(); await app.listen(3000);`

Cuidados:
- `tsconfig` com `emitDecoratorMetadata` e `experimentalDecorators` (Nest precisa). Se o bundler da Vercel não preservar metadados de decorators, compilar com `nest build`/`tsc` antes e apontar `api/index.js` para `dist/` (ex.: `buildCommand: "prisma generate && nest build"` e `api/index.js` importando `../dist/app.factory`).
- `PrismaService` como singleton do módulo; não chamar `$disconnect` por requisição.
- Instalar `reflect-metadata` e importar no topo de `app.factory.ts`.

---

## 9. Frontend (React)

### 9.1 Rotas

| Rota | Página | Observação |
|---|---|---|
| `/login` | `LoginPage` | redireciona para `/` se já logado |
| `/` | redireciona para `/m/<mês atual>` | |
| `/m/:ym` | `MonthPage` | tela principal |
| `/modelo` | `TemplatePage` | mesmo layout, sem "pago", com aviso explicativo |

`RequireAuth` envolve as rotas privadas usando `supabase.auth.getSession()` + `onAuthStateChange`.

### 9.2 Componentes

| Componente | Corresponde no artefato | Props principais |
|---|---|---|
| `TopBar` | (novo) | `ym`, `editing`, `onToggleEdit` |
| `MonthNav` | (novo) | `ym` — usa `navigate('/m/…')` |
| `SummaryCards` | `.summary` | `totals` |
| `PersonCard` | `.card.blue/.pink` | `person`, `items`, `kind`, `editing`, `showPaid` |
| `ItemRow` | `.rows li` | `item`, `editing`, `showPaid`, `onSave`, `onDelete`, `onTogglePaid` |
| `AddItemRow` | (novo, última `li`) | `onAdd({description, amountCents, repeat})`, `showRepeat` |
| `TotalLine` | `.total-line` | `kind`, `valueCents` |
| `PaidLine` | `.conta` | `jaPago`, `faltaPagar` |
| `SplitBar` | `.split` | `allocations`, `investir` (ignorar valores ≤ 0 no flex) |
| `Destinations` | `.dest` | `allocations`, `totals`, `editing`, handlers |
| `LastChange` | `footer` | `lastChange` |

`MonthPage` e `TemplatePage` compartilham um componente `BudgetBoard` que recebe `view` + `handlers` + `mode: 'month' | 'template'`.

### 9.3 Dados (TanStack Query)

```ts
// hooks/useMonth.ts
export const monthKey = (ym: string) => ['month', ym];
export function useMonth(ym: string) {
  return useQuery({
    queryKey: monthKey(ym),
    queryFn: () => api.get<MonthView>(`/months/${ym}`),
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,     // ver alterações do outro
  });
}
```

- Mutations (`useAddItem`, `useUpdateItem`, `useDeleteItem`, `useTogglePaid`, idem para destinos e modelo) com `onMutate` otimista (atualiza o cache e recalcula `totals` com `calcTotals`) e `onSettled: invalidateQueries(monthKey(ym))`.
- Pausar o `refetchInterval` enquanto uma linha estiver em edição (para não perder o que está sendo digitado) — basta não sobrescrever o estado local do `ItemRow` em edição.
- `lib/api.ts`: wrapper de `fetch` com `VITE_API_URL`, header `Authorization` vindo de `supabase.auth.getSession()`, tratamento de `401` (logout).

### 9.4 Nomes dos meses
`new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })` → "novembro de 2026"; capitalizar a primeira letra.

### 9.5 Acessibilidade e mobile
- Alvos de toque ≥ 44px nas linhas em modo edição.
- `.split` mantém `role="img"` e `aria-label` gerado ("Divisão da sobra: Júlia R$ 400, Caio e lazer R$ 700, investir R$ 1.788,11").
- Checkbox real (`<input type="checkbox">`) estilizado, com `aria-label="Marcar Fatura como pago"`.
- Testar em 375px de largura: sem rolagem horizontal; inputs de edição empilham se necessário.

---

## 10. Variáveis de ambiente

### `apps/web` (públicas, prefixo `VITE_`)
| Nome | Exemplo |
|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (ou anon key legada) |
| `VITE_API_URL` | `https://financas-api.vercel.app` |

### `apps/api` (secretas)
| Nome | Uso |
|---|---|
| `DATABASE_URL` | pooler de transação (6543) com `pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | conexão para migrations (5432) |
| `SUPABASE_URL` | `https://<ref>.supabase.co` (JWKS e issuer) |
| `ALLOWED_ORIGIN` | `https://financas-web.vercel.app,http://localhost:5173` |
| `CAIO_AUTH_ID`, `JULIA_AUTH_ID` | só para o seed |

Criar `.env.example` em cada app (sem valores reais) e manter `.env` no `.gitignore`. Nunca colocar a `service_role`/secret key no front (nem é necessária no backend, que usa conexão Postgres direta).

---

## 11. Deploy na Vercel

Dois projetos Vercel ligados ao mesmo repositório GitHub (`caiokl3i/financas-casal`):

| Projeto | Root Directory | Framework | Build | Output |
|---|---|---|---|---|
| `financas-web` | `apps/web` | Vite | `npm run build` | `dist` |
| `financas-api` | `apps/api` | Other | `npx prisma generate && npm run build` | (função em `api/`) |

- Em ambos, habilitar "Include files outside the root directory" para enxergar `packages/shared`.
- `apps/web/vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` (SPA).
- Configurar as variáveis da seção 10 em Production e Preview.
- Região da função próxima à do Supabase (ex.: ambos em `sa-east-1`/`gru1` se o projeto Supabase estiver em São Paulo).
- **Migrations**: rodar manualmente antes do deploy que depende delas: `npm run db:migrate -w apps/api` (= `prisma migrate deploy`) com `DIRECT_URL` de produção. Seed só uma vez: `npm run db:seed -w apps/api`.
- Depois do primeiro deploy, adicionar a URL final do web em `ALLOWED_ORIGIN` da API e a URL da API em `VITE_API_URL` do web; redeploy.
- Supabase → Authentication → URL Configuration: `Site URL` = URL do web.

---

## 12. Roteiro de implementação (em fases)

| Fase | Entrega | Pronto quando |
|---|---|---|
| **F0 — Monorepo** | `package.json` com workspaces, `apps/web` (Vite React TS), `apps/api` (Nest), `packages/shared`, ESLint/Prettier, `.gitignore`, `.env.example` | `npm run dev` sobe web (5173) e api (3000) |
| **F1 — Supabase** | Projeto criado, `schema.prisma`, migração inicial + RLS, 2 usuários no Auth, seed | Tabelas no banco com os dados do artefato |
| **F2 — API leitura + auth** | `AuthGuard`, `/me`, `/people`, `GET /months/:ym` com criação a partir do modelo, `calcTotals` | `GET /months/2026-11` com token retorna totais 6.550 / 3.661,89 / 2.888,11 / 1.788,11 |
| **F3 — Front leitura** | Login, CSS do artefato, `MonthPage` só leitura, `MonthNav` | Tela visualmente idêntica ao artefato (comparar lado a lado em 375px e 1280px) |
| **F4 — Edição de itens** | Modo Editar, adicionar/editar/remover, checkbox pago, `PaidLine`, mutations otimistas | Alterar um valor muda todos os totais na hora |
| **F5 — Destinos da sobra** | Editar/adicionar/remover destinos, cor, investir negativo | Mudar "Caio e lazer" de 700 para 600 faz investir subir 100 |
| **F6 — Modelo fixo** | `/modelo`, endpoints `/template/*`, "repetir nos próximos meses" | Item adicionado com "repetir" aparece no mês seguinte ao abri-lo |
| **F7 — Deploy** | Dois projetos Vercel, envs, migração em produção, seed | Caio e Júlia logam pelo celular na URL pública |
| **F8 — Polimento** | Estados de carregamento/erro, mês vazio, rodapé "última alteração", testes, revisão mobile | Checklist da seção 13 todo verde |

---

## 13. Critérios de aceite e testes

### Checklist manual
- [ ] Não é possível criar conta nova; só Caio e Júlia entram.
- [ ] Usuário logado no Supabase que não está em `people` recebe 403.
- [ ] A tela do mês é visualmente igual ao artefato (fonte, cores, bordas, sombras, espaçamentos, textos).
- [ ] Com o seed, os números batem: Entra 6.550, Sai 3.661,89, Sobra 2.888,11, Investir 1.788,11; Caio 3.450/2.160; Júlia 3.100/1.501,89.
- [ ] Itens sem descrição aparecem como "Sem descrição" em cinza.
- [ ] Adicionar, editar e remover entrada/saída de cada pessoa atualiza cabeçalho do card, total-line, resumo e investir.
- [ ] Marcar pago risca a linha e atualiza "Falta pagar".
- [ ] Mudar o valor de um destino atualiza a barra `.split` e o "Para investir".
- [ ] Destinos que passam da sobra mostram investir negativo com aviso.
- [ ] Mudar o modelo não altera meses já abertos; altera o próximo mês ainda não aberto.
- [ ] "Repetir nos próximos meses" coloca o item no modelo.
- [ ] Caio altera algo; Júlia, em outro aparelho, vê a mudança em até 30s (ou ao voltar para a aba) e o rodapé mostra "por Caio".
- [ ] Funciona em celular (375px) sem rolagem horizontal.
- [ ] A Data API do Supabase não expõe as tabelas (requisição REST com a publishable key retorna vazio/negado).

### Testes automatizados
- **Unitários (`packages/shared`)**: `formatBRL` (`345000 → "R$ 3.450"`, `150189 → "R$ 1.501,89"`, `689` sem símbolo → `"6,89"`), `parseBRL` (`"1.501,89"`, `"6.89"`, `"1501"`), `calcTotals` com o seed.
- **API (Nest + banco de teste/Supabase branch)**: `getOrCreate` idempotente (duas chamadas paralelas → 1 mês, itens copiados uma vez); `repeat` cria no modelo; guard rejeita token ausente/inválido.
- **E2E (Playwright)**: login → abrir mês → Editar → adicionar "Academia 120" no Caio → total do Caio vira R$ 2.280 e Sai vira R$ 3.781,89 → sair → logar como Júlia → ver "Academia".

---

## 14. Fora do MVP (ideias futuras)

- Supabase Realtime para atualização instantânea entre os dois.
- Gastos avulsos do mês (ex.: "jantar fora 120") além dos fixos.
- Reordenar itens arrastando.
- PWA (ícone na tela inicial do celular).
- Histórico do investimento acumulado ao longo dos meses.
- Exportar mês em CSV.
