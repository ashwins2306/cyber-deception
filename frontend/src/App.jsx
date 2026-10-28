import React, { useState, useEffect } from 'react';
import { SimulationProvider } from './context/SimulationContext';
import AttackerPage from './pages/AttackerPage';
import DeceptionPage from './pages/DeceptionPage';
import PortalPage from './pages/PortalPage';

function RouterApp() {
  const [route, setRoute] = useState(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (hash.includes('attacker') || path.includes('attacker')) return 'attacker';
    if (hash.includes('deception') || path.includes('deception')) return 'deception';
    return 'portal';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash.includes('attacker') || path.includes('attacker')) {
        setRoute('attacker');
      } else if (hash.includes('deception') || path.includes('deception')) {
        setRoute('deception');
      } else {
        setRoute('portal');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const navigateTo = (target) => {
    window.location.hash = `/${target}`;
    setRoute(target);
  };

  return (
    <>
      {route === 'attacker' && <AttackerPage />}
      {route === 'deception' && <DeceptionPage />}
      {route === 'portal' && <PortalPage onNavigate={navigateTo} />}
    </>
  );
}

export default function App() {
  return (
    <SimulationProvider>
      <RouterApp />
    </SimulationProvider>
  );
}
