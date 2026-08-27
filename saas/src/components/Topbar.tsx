import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';

export function Topbar() {
  const { session } = useAuth();
  return (
    <header className="topbar">
      <NavLink to="/" className="topbar-brand">
        <img src="/logo-nehoc.jpeg" alt="NEHOC" />
        <div>
          <span className="kicker">Menuiserie aluminium</span>
          <strong>NEHOCPRO</strong>
        </div>
      </NavLink>
      <nav className="topbar-nav">
        <NavLink to="/" end>
          Accueil
        </NavLink>
        <NavLink to="/site/new">Nouveau</NavLink>
        <NavLink to="/backoffice">Back office</NavLink>
        {session ? (
          <span className="topbar-user">{session.user.email}</span>
        ) : (
          <NavLink to="/login">Connexion</NavLink>
        )}
      </nav>
    </header>
  );
}
