import { useCallback, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Board } from '../components/Board';
import { supabase } from '../lib/supabase';
import { Mode, useBoard, useBoardActions } from '../lib/hooks';
import { addMonths, currentYm, isValidYm, maxYm, monthLabel, relativeTime } from '../lib/months';

export function MonthPage() {
  const { ym } = useParams();
  if (!isValidYm(ym) || ym > maxYm()) return <Navigate to={`/m/${currentYm()}`} replace />;
  return <BoardPage mode={{ kind: 'month', ym }} />;
}

export function TemplatePage() {
  return <BoardPage mode={{ kind: 'template' }} />;
}

function BoardPage({ mode }: { mode: Mode }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onError = useCallback((msg: string) => setError(msg), []);
  const { data, isLoading, error: loadError, refetch } = useBoard(mode, editing);
  const actions = useBoardActions(mode, onError);
  const navigate = useNavigate();
  const isMonth = mode.kind === 'month';

  return (
    <main>
      <div className="topbar">
        {isMonth ? (
          <div className="month-nav">
            <button className="square" aria-label="Mês anterior" onClick={() => navigate(`/m/${addMonths(mode.ym, -1)}`)}>‹</button>
            <span className="name">{monthLabel(mode.ym)}</span>
            <button
              className="square"
              aria-label="Próximo mês"
              disabled={addMonths(mode.ym, 1) > maxYm()}
              onClick={() => navigate(`/m/${addMonths(mode.ym, 1)}`)}
            >›</button>
          </div>
        ) : (
          <Link className="pill" to={`/m/${currentYm()}`}>‹ Voltar ao mês</Link>
        )}
        <div className="actions">
          <button className={`pill${editing ? ' on' : ''}`} onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
            {editing ? 'Pronto' : 'Editar'}
          </button>
          {isMonth && <Link className="pill" to="/modelo">Modelo fixo</Link>}
          <button className="pill" onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </div>

      {error && (
        <div className="banner error" role="alert">
          <span>Não deu para salvar: {error}</span>
          <button aria-label="Fechar aviso" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {isMonth ? (
        <>
          <h1>Nosso dinheiro do mês</h1>
          <p className="lede">Quanto entra, quanto sai e o que fazemos com o que sobra.</p>
        </>
      ) : (
        <>
          <h1>Nosso modelo fixo</h1>
          <p className="lede">O padrão de todo mês. Mudanças aqui valem para os meses que ainda não foram abertos.</p>
        </>
      )}

      {editing && (
        <div className="banner info">
          <span>
            {isMonth
              ? 'Modo edição: toque numa linha para mudar, use × para remover e “+ adicionar” para incluir. Mudanças aqui valem só para este mês.'
              : 'Modo edição: toque numa linha para mudar, use × para remover e “+ adicionar” para incluir.'}
          </span>
        </div>
      )}

      {isLoading && <p className="loading">Carregando…</p>}
      {loadError && !data && (
        <div className="banner error" role="alert">
          <span>Não deu para carregar: {loadError.message}</span>
          <button className="small-btn" onClick={() => refetch()}>Tentar de novo</button>
        </div>
      )}
      {data && <Board data={data} editing={editing} isMonth={isMonth} actions={actions} />}

      {data?.lastChange && (
        <footer>
          Última alteração {data.lastChange.byName ? `por ${data.lastChange.byName} ` : ''}
          {relativeTime(data.lastChange.at)}.
        </footer>
      )}
    </main>
  );
}
