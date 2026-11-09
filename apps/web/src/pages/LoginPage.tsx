import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const PEOPLE = [
  { name: 'Sou o Caio', email: 'caio.victor.santos12@gmail.com', cls: 'blue' },
  { name: 'Sou a Júlia', email: 'juliaandradecamera@gmail.com', cls: 'pink' },
];

export function LoginPage() {
  const [tab, setTab] = useState<'login' | 'first'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (tab === 'first') {
      if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
      if (password !== password2) return setError('As duas senhas não são iguais.');
    }
    setBusy(true);
    try {
      if (tab === 'first') {
        await api('/auth/first-access', { method: 'POST', body: { email, password }, auth: false });
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) {
        setError(
          error.message.includes('Invalid login')
            ? 'E-mail ou senha errados. Se é a primeira vez, use “Primeiro acesso”.'
            : error.message,
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <h1>Nosso dinheiro do mês</h1>
      <p className="lede">Entre para ver quanto entra, quanto sai e o que sobra.</p>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'login'} className={`pill${tab === 'login' ? ' on' : ''}`} onClick={() => { setTab('login'); setError(null); }}>Entrar</button>
        <button role="tab" aria-selected={tab === 'first'} className={`pill${tab === 'first' ? ' on' : ''}`} onClick={() => { setTab('first'); setError(null); }}>Primeiro acesso</button>
      </div>

      <div className="card">
        <div className="who">
          {PEOPLE.map((p) => (
            <button key={p.email} type="button" className={`pill ${p.cls}`} aria-pressed={email === p.email} onClick={() => setEmail(p.email)}>
              {p.name}
            </button>
          ))}
        </div>
        <form className="form" onSubmit={submit}>
          <label>
            E-mail
            <input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            {tab === 'first' ? 'Crie sua senha' : 'Senha'}
            <input
              className="field"
              type="password"
              autoComplete={tab === 'first' ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {tab === 'first' && (
            <>
              <label>
                Repita a senha
                <input className="field" type="password" autoComplete="new-password" required value={password2} onChange={(e) => setPassword2(e.target.value)} />
              </label>
              <p className="hint">Só funciona para os e-mails do Caio e da Júlia, e só uma vez. Depois use “Entrar”.</p>
            </>
          )}
          {error && <div className="banner error" role="alert" style={{ margin: 0 }}><span>{error}</span></div>}
          <button type="submit" className="pill blue big-btn" disabled={busy}>
            {busy ? 'Um instante…' : tab === 'first' ? 'Criar senha e entrar' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
