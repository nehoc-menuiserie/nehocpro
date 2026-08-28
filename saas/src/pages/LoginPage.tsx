import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { Button, Field, Input } from '../components/ui';
import { LanguageSwitcher, useI18n } from '../i18n';

export function LoginPage() {
  const { signIn, configured } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      alert(t('login.needCredentials'));
      return;
    }
    if (!configured) {
      alert(t('login.noKeys'));
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('login.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-gate">
      <form className="login-form" onSubmit={submit}>
        <div className="login-lang">
          <LanguageSwitcher />
        </div>
        <div className="login-brand">
          <img src="/logo-nehoc.jpeg" alt="NEHOC" className="logo" />
          <p className="kicker">{t('login.kicker')}</p>
          <h1>{t('login.title')}</h1>
          <p className="subtitle">{t('login.subtitle')}</p>
        </div>
        <Field label={t('login.email')}>
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
        <Field label={t('login.password')}>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder={t('login.passwordPh')}
          />
        </Field>
        <Button title={busy ? t('login.submitting') : t('login.submit')} disabled={busy || !configured} type="submit" />
      </form>
    </div>
  );
}
