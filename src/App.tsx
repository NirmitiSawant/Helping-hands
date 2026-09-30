import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { ForNGOsPage } from './pages/ForNGOsPage';
import { LoginPage } from './pages/LoginPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { NGODashboardPage } from './pages/NGODashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { DWMAnalyticsPage } from './pages/DWMAnalyticsPage';

function MainApp() {
  const { user, isPlatformAdmin } = useAuth();

  // Page Routing State with Hash Support
  const getInitialPage = () => {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash) return hash;
    return 'home';
  };

  const [currentPage, setCurrentPage] = useState<string>(getInitialPage());

  // Sync hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash) {
        setCurrentPage(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (page: string) => {
    window.location.hash = page;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render correct page
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage navigate={navigate} />;
      case 'about':
        return <AboutPage navigate={navigate} />;
      case 'how-it-works':
        return <HowItWorksPage navigate={navigate} />;
      case 'for-ngos':
        return <ForNGOsPage navigate={navigate} />;
      case 'login':
        return <LoginPage navigate={navigate} />;
      case 'admin-login':
        return <AdminLoginPage navigate={navigate} />;
      case 'donor-dashboard':
        if (!user) return <LoginPage navigate={navigate} defaultTab="donor" />;
        return <UserDashboardPage navigate={navigate} />;
      case 'ngo-dashboard':
        if (!user) return <LoginPage navigate={navigate} defaultTab="ngo" />;
        return <NGODashboardPage navigate={navigate} />;
      case 'admin-dashboard':
        if (!isPlatformAdmin) return <AdminLoginPage navigate={navigate} />;
        return <AdminDashboardPage navigate={navigate} />;
      case 'dwm-analytics':
        return <DWMAnalyticsPage navigate={navigate} />;
      default:
        return <HomePage navigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar
        currentPage={currentPage}
        navigate={navigate}
      />

      <main className="flex-1">
        {renderPage()}
      </main>

      <Footer
        navigate={navigate}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
