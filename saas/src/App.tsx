import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { CatalogProvider } from './catalog';
import { Topbar } from './components/Topbar';
import { SitesProvider, useSites } from './context';
import { BackofficePage } from './pages/BackofficePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ReportPage } from './pages/ReportPage';
import { SitePage } from './pages/SitePage';

function Shell() {
  const { session, ready: authReady } = useAuth();
  const { ready: sitesReady } = useSites();

  if (!authReady) {
    return (
      <div className="boot">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  if (!sitesReady) {
    return (
      <div className="boot">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app">
      <Topbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/site/:id" element={<SitePage />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/backoffice" element={<BackofficePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CatalogProvider>
        <SitesProvider>
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
        </SitesProvider>
      </CatalogProvider>
    </AuthProvider>
  );
}
