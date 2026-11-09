import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './lib/hooks';
import { currentYm } from './lib/months';
import { LoginPage } from './pages/LoginPage';
import { MonthPage, TemplatePage } from './pages/BoardPage';

export function App() {
  const session = useSession();
  if (session === undefined) return <main><p className="loading">Carregando…</p></main>;

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/m/:ym" element={<MonthPage />} />
      <Route path="/modelo" element={<TemplatePage />} />
      <Route path="*" element={<Navigate to={`/m/${currentYm()}`} replace />} />
    </Routes>
  );
}
