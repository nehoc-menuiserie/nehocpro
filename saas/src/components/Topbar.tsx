import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';
import { LanguageSwitcher, useI18n } from '../i18n';

export function Topbar() {
  const { session, signOut } = useAuth();
  const { t } = useI18n();
  return (
    <header className="topbar">
      <NavLink to="/" className="topbar-brand">
        <img src="/logo-nehoc.jpeg" alt="NEHOC" />
        <div>
          <span className="kicker">{t('brand.kicker')}</span>
          <strong>NEHOCPRO</strong>
        </div>
      </NavLink>
      <nav className="topbar-nav">
        <LanguageSwitcher />
        <NavLink to="/" end>
          {t('common.home')}
        </NavLink>
        <NavLink to="/site/new">{t('common.new')}</NavLink>
        <NavLink to="/backoffice">{t('common.backoffice')}</NavLink>
        {session?.user.email ? <span className="topbar-user">{session.user.email}</span> : null}
        <button type="button" className="topbar-logout" onClick={() => signOut()}>
          {t('common.logout')}
        </button>
      </nav>
    </header>
  );
}
