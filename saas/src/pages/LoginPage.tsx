import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button, Field, Input } from '../components/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      alert('Indiquez un e-mail et un mot de passe d’au moins 6 caractères.');
      return;
    }
    if (!configured) {
      alert('Les clés Supabase ne sont pas encore dans le fichier .env.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        await signUp(email, password);
        try {
          await signIn(email, password);
        } catch {
          alert('Compte créé. Validez éventuellement l’e-mail dans Supabase, puis utilisez « J’ai déjà un compte ».');
          setMode('login');
          return;
        }
      } else {
        await signIn(email, password);
      }
      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow">
      <Button title="← Accueil" variant="ghost" onClick={() => navigate('/')} />
      <form className="login-form" onSubmit={submit}>
        <p className="kicker">Cloud NEHOC</p>
        <h1>{mode === 'register' ? 'Créer un compte' : 'Se connecter'}</h1>
        <p className="subtitle">
          {mode === 'register'
            ? 'Première fois : créez votre compte équipe avec un e-mail et un mot de passe.'
            : 'Entrez l’e-mail et le mot de passe déjà créés.'}
        </p>
        <Field label="E-mail">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            type="email"
            placeholder="prenom@nehoc.fr"
          />
        </Field>
        <Field label="Mot de passe">
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="au moins 6 caractères"
          />
        </Field>
        <Button
          title={busy ? 'Patientez…' : mode === 'register' ? 'Créer le compte' : 'Se connecter'}
          disabled={busy || !configured}
          type="submit"
        />
        <button type="button" className="switch-link" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
          {mode === 'register' ? 'J’ai déjà un compte → Se connecter' : 'Pas encore de compte → Créer un compte'}
        </button>
      </form>
    </div>
  );
}
