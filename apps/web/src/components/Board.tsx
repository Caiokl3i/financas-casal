import { FormEvent, useEffect, useRef, useState } from 'react';
import type { Allocation, Board as BoardData, DestColor, Item, Kind, Person } from '../lib/api';
import type { BoardActions } from '../lib/hooks';
import { centsToInput, formatBRL, parseBRL } from '../lib/money';

const R = (c: number) => formatBRL(c);
const N = (c: number) => formatBRL(c, { symbol: false });
const colorClass: Record<DestColor, 'p' | 'b' | 'k'> = { pink: 'p', blue: 'b', ink: 'k' };

interface BoardProps {
  data: BoardData;
  editing: boolean;
  isMonth: boolean;
  actions: BoardActions;
}

export function Board({ data, editing, isMonth, actions }: BoardProps) {
  const { people, items, allocations, totals } = data;
  const byPerson = (kind: Kind, p: Person) => items.filter((i) => i.kind === kind && i.personId === p.id);

  return (
    <>
      <div className="summary">
        <div className="big in"><p>Entra</p><strong>{R(totals.entra)}</strong></div>
        <div className="big out"><p>Sai</p><strong>{R(totals.sai)}</strong></div>
        <div className="big left"><p>Sobra</p><strong>{R(totals.sobra)}</strong></div>
      </div>

      <section>
        <h2>1. O que entra</h2>
        <p className="help">O dinheiro que cada um recebe no mês.</p>
        <div className="pair">
          {people.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              kind="income"
              items={byPerson('income', p)}
              total={totals.porPessoa[p.id]?.entra ?? 0}
              editing={editing}
              isMonth={isMonth}
              actions={actions}
            />
          ))}
        </div>
        <p className="total-line in">Juntos entram <b>{R(totals.entra)}</b></p>
      </section>

      <section>
        <h2>2. O que sai</h2>
        <p className="help">
          As contas e gastos fixos de cada um.{isMonth && ' Marque o quadradinho quando pagar.'}
        </p>
        <div className="pair">
          {people.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              kind="expense"
              items={byPerson('expense', p)}
              total={totals.porPessoa[p.id]?.sai ?? 0}
              editing={editing}
              isMonth={isMonth}
              actions={actions}
            />
          ))}
        </div>
        <p className="total-line out">Juntos saem <b>{R(totals.sai)}</b></p>
        {isMonth && totals.sai > 0 && (
          <p className="conta">
            {totals.faltaPagar === 0 ? (
              <>Tudo pago este mês. 🎉</>
            ) : (
              <>
                Falta pagar <b>{R(totals.faltaPagar)}</b> · Já pago {R(totals.jaPago)}
              </>
            )}
          </p>
        )}
      </section>

      <section>
        <h2>3. O que sobra e para onde vai</h2>
        <p className="help">
          Sobram {R(totals.sobra)} ({N(totals.entra)} menos {N(totals.sai)}). Esse valor é dividido assim:
        </p>
        <SplitBar allocations={allocations} investir={totals.investir} />
        <Destinations allocations={allocations} totals={totals} editing={editing} actions={actions} />
      </section>
    </>
  );
}

/* ---------------- Cartões do Caio e da Júlia ---------------- */

function PersonCard(props: {
  person: Person;
  kind: Kind;
  items: Item[];
  total: number;
  editing: boolean;
  isMonth: boolean;
  actions: BoardActions;
}) {
  const { person, kind, items, total, editing, isMonth, actions } = props;
  const showPaid = isMonth && kind === 'expense';
  return (
    <div className={`card ${person.color}${editing ? ' editing' : ''}`}>
      <header>
        <h3>{person.name}</h3>
        <span className="tot">{R(total)}</span>
      </header>
      <ul className="rows">
        {items.length === 0 && !editing && (
          <li><span className="off">Nada por aqui</span><b></b></li>
        )}
        {items.map((it) => (
          <ItemRow key={it.id} item={it} editing={editing} showPaid={showPaid} actions={actions} />
        ))}
        {editing && (
          <AddItemRow
            showRepeat={isMonth}
            onAdd={(v) => actions.addItem({ personId: person.id, kind, ...v })}
          />
        )}
      </ul>
    </div>
  );
}

function ItemRow({ item, editing, showPaid, actions }: { item: Item; editing: boolean; showPaid: boolean; actions: BoardActions }) {
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  // "pago" muda na hora, sem esperar a resposta do servidor
  const [paid, setPaid] = useState(item.paid);
  useEffect(() => setPaid(item.paid), [item.paid]);
  useEffect(() => {
    if (!editing) { setOpen(false); setConfirmDel(false); }
  }, [editing]);

  const name = item.description?.trim() ? item.description : null;
  const label = name ?? 'Sem descrição';

  if (editing && open) {
    return (
      <li>
        <ItemForm
          initial={{ description: item.description ?? '', amount: centsToInput(item.amountCents) }}
          submitLabel="Salvar"
          onCancel={() => setOpen(false)}
          onSubmit={async ({ description, amountCents }) => {
            actions.updateItem(item.id, { description, amountCents });
            setOpen(false);
          }}
        />
      </li>
    );
  }

  return (
    <li
      className={`${paid && showPaid ? 'paid' : ''}${editing ? ' clickable' : ''}`}
      onClick={editing ? () => setOpen(true) : undefined}
    >
      <span className="label">
        {showPaid && (
          <input
            type="checkbox"
            className="check"
            checked={paid}
            aria-label={`Marcar ${label} como pago`}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              setPaid(e.target.checked);
              actions.updateItem(item.id, { paid: e.target.checked });
            }}
          />
        )}
        <span className={name ? undefined : 'off'}>{label}</span>
      </span>
      <span className="right">
        <b>{N(item.amountCents)}</b>
        {editing && (
          <button
            type="button"
            className={`x${confirmDel ? ' confirm' : ''}`}
            aria-label={`Remover ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              if (confirmDel) actions.deleteItem(item.id);
              else {
                setConfirmDel(true);
                setTimeout(() => setConfirmDel(false), 3000);
              }
            }}
          >
            {confirmDel ? 'Remover?' : '×'}
          </button>
        )}
      </span>
    </li>
  );
}

function AddItemRow({ showRepeat, onAdd }: { showRepeat: boolean; onAdd: (v: { description: string | null; amountCents: number; repeat?: boolean }) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <li className="add" role="button" tabIndex={0} onClick={() => setOpen(true)} onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}>
        <span>+ adicionar</span>
      </li>
    );
  }
  return (
    <li>
      <ItemForm
        initial={{ description: '', amount: '' }}
        submitLabel="Adicionar"
        showRepeat={showRepeat}
        onCancel={() => setOpen(false)}
        onSubmit={async (v) => {
          await onAdd(v);
          setOpen(false);
        }}
      />
    </li>
  );
}

function ItemForm(props: {
  initial: { description: string; amount: string };
  submitLabel: string;
  showRepeat?: boolean;
  onCancel: () => void;
  onSubmit: (v: { description: string | null; amountCents: number; repeat?: boolean }) => Promise<void>;
}) {
  const [description, setDescription] = useState(props.initial.description);
  const [amount, setAmount] = useState(props.initial.amount);
  const [repeat, setRepeat] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const descRef = useRef<HTMLInputElement>(null);
  useEffect(() => descRef.current?.focus(), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cents = parseBRL(amount);
    if (cents === null) {
      setErr('Valor inválido');
      return;
    }
    setBusy(true);
    try {
      await props.onSubmit({
        description: description.trim() || null,
        amountCents: cents,
        repeat: props.showRepeat ? repeat : undefined,
      });
    } catch {
      setBusy(false);
    }
  };

  return (
    <form className="edit-row" onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && props.onCancel()}>
      <input
        ref={descRef}
        className="field"
        placeholder="Descrição"
        aria-label="Descrição"
        value={description}
        maxLength={80}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        className="field money"
        placeholder="0,00"
        aria-label="Valor"
        inputMode="decimal"
        value={amount}
        onChange={(e) => { setAmount(e.target.value); setErr(null); }}
      />
      <div className="opts">
        {props.showRepeat ? (
          <label className="repeat">
            <input type="checkbox" className="check" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            repetir nos próximos meses
          </label>
        ) : (
          <span className="repeat">{err}</span>
        )}
        <span className="btns">
          <button type="button" className="small-btn" onClick={props.onCancel}>Cancelar</button>
          <button type="submit" className="small-btn primary" disabled={busy}>{props.submitLabel}</button>
        </span>
        {props.showRepeat && err && <span className="repeat" style={{ color: 'var(--ink)' }}>{err}</span>}
      </div>
    </form>
  );
}

/* ---------------- Para onde vai a sobra ---------------- */

function SplitBar({ allocations, investir }: { allocations: Allocation[]; investir: number }) {
  const parts = allocations.filter((a) => a.amountCents > 0).map((a) => ({ key: a.id, cls: colorClass[a.color], value: a.amountCents }));
  if (investir > 0) parts.push({ key: 'investir', cls: 'k', value: investir });
  const aria =
    'Divisão da sobra: ' +
    [...allocations.map((a) => `${a.label} ${R(a.amountCents)}`), `investir ${R(investir)}`].join(', ');
  return (
    <div className="split" role="img" aria-label={aria}>
      {parts.map((p) => (
        <div key={p.key} className={p.cls} style={{ flexGrow: p.value }} />
      ))}
    </div>
  );
}

function Destinations({ allocations, totals, editing, actions }: { allocations: Allocation[]; totals: BoardData['totals']; editing: boolean; actions: BoardActions }) {
  const [adding, setAdding] = useState(false);
  useEffect(() => { if (!editing) setAdding(false); }, [editing]);
  const conta = [N(totals.sobra), ...allocations.map((a) => N(a.amountCents))].join(' − ');
  const negative = totals.investir < 0;

  return (
    <div className="dest">
      {allocations.map((a) => (
        <DestinationItem key={a.id} a={a} editing={editing} actions={actions} />
      ))}
      {editing && adding && (
        <AllocationForm
          initial={{ label: '', amount: '', color: 'pink' }}
          submitLabel="Adicionar"
          onCancel={() => setAdding(false)}
          onSubmit={async (v) => {
            await actions.addAllocation(v);
            setAdding(false);
          }}
        />
      )}
      {editing && !adding && (
        <button type="button" className="item add" onClick={() => setAdding(true)}>+ adicionar destino</button>
      )}
      <div className={`item k${negative ? ' negative' : ''}`}>
        <p>Para investir</p>
        <strong>{R(totals.investir)}</strong>
        <small>{negative ? `A divisão passou da sobra em ${R(-totals.investir)}` : conta}</small>
      </div>
    </div>
  );
}

function DestinationItem({ a, editing, actions }: { a: Allocation; editing: boolean; actions: BoardActions }) {
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => { if (!editing) { setOpen(false); setConfirmDel(false); } }, [editing]);

  if (editing && open) {
    return (
      <AllocationForm
        initial={{ label: a.label, amount: centsToInput(a.amountCents), color: a.color }}
        submitLabel="Salvar"
        onCancel={() => setOpen(false)}
        onSubmit={async (v) => {
          actions.updateAllocation(a.id, v);
          setOpen(false);
        }}
      />
    );
  }
  return (
    <div
      className={`item ${colorClass[a.color]}${editing ? ' clickable' : ''}`}
      onClick={editing ? () => setOpen(true) : undefined}
    >
      <div className="row">
        <p>{a.label}</p>
        {editing && (
          <button
            type="button"
            className={`x${confirmDel ? ' confirm' : ''}`}
            aria-label={`Remover ${a.label}`}
            onClick={(e) => {
              e.stopPropagation();
              if (confirmDel) actions.deleteAllocation(a.id);
              else {
                setConfirmDel(true);
                setTimeout(() => setConfirmDel(false), 3000);
              }
            }}
          >
            {confirmDel ? 'Remover?' : '×'}
          </button>
        )}
      </div>
      <strong>{R(a.amountCents)}</strong>
      {editing && <small>Toque para editar</small>}
    </div>
  );
}

function AllocationForm(props: {
  initial: { label: string; amount: string; color: DestColor };
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (v: { label: string; amountCents: number; color: DestColor }) => Promise<void>;
}) {
  const [label, setLabel] = useState(props.initial.label);
  const [amount, setAmount] = useState(props.initial.amount);
  const [color, setColor] = useState<DestColor>(props.initial.color);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cents = parseBRL(amount);
    if (!label.trim()) return setErr('Dê um nome');
    if (cents === null) return setErr('Valor inválido');
    setBusy(true);
    try {
      await props.onSubmit({ label: label.trim(), amountCents: cents, color });
    } catch {
      setBusy(false);
    }
  };

  return (
    <form className={`item editable ${colorClass[color]}`} onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && props.onCancel()}>
      <input className="field" placeholder="Nome (ex.: Para a Júlia)" aria-label="Nome do destino" value={label} maxLength={60} autoFocus onChange={(e) => { setLabel(e.target.value); setErr(null); }} />
      <input className="field money" placeholder="0,00" aria-label="Valor" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setErr(null); }} />
      <div className="row">
        <div className="dots" role="group" aria-label="Cor">
          {(['pink', 'blue', 'ink'] as DestColor[]).map((c) => (
            <button key={c} type="button" className={`dot ${colorClass[c]}`} aria-pressed={color === c} aria-label={{ pink: 'Rosa', blue: 'Azul', ink: 'Preto' }[c]} onClick={() => setColor(c)} />
          ))}
        </div>
        {err && <small>{err}</small>}
      </div>
      <div className="row">
        <button type="button" className="small-btn" onClick={props.onCancel}>Cancelar</button>
        <button type="submit" className="small-btn primary" disabled={busy}>{props.submitLabel}</button>
      </div>
    </form>
  );
}
