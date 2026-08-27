import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { Button, Field, Input } from '../components/ui';

export function LoginPage() {
  const { signIn, configured } = useAuth();
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
      alert('Les clés Supabase ne sont pas encore configurées.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-gate">
      <form className="login-form" onSubmit={submit}>
        <img src="/logo-nehoc.jpeg" alt="NEHOC" className="logo" />
        <p className="kicker">Cloud NEHOC</p>
        <h1>Connexion</h1>
        <p className="subtitle">Connectez-vous avec votre compte équipe pour accéder à NEHOCPRO.</p>
        <Field label="E-mail">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            type="email"
            placeholder="prenom@nehoc.fr"
            autoFocus
          />
        </Field>
        <Field label="Mot de passe">
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="mot de passe"
          />
        </Field>
        <Button title={busy ? 'Connexion…' : 'Se connecter'} disabled={busy || !configured} type="submit" />
      </form>
    </div>
  );
}
