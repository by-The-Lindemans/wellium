import React from 'react';
import { IonApp, setupIonicReact } from '@ionic/react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import './theme/variables.css';
import './theme/global-layout.css';

import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import HostPairingScreen from './ui/HostPairingScreen';
import JoinPairingScreen from './ui/JoinPairingScreen';
import Splash from './ui/Splash';

setupIonicReact();

const SECRET_KEY = 'wellium/pairing-secret';

function Guard() {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = React.useState(
    () => !sessionStorage.getItem('wl/splash-shown')
  );

  React.useEffect(() => {
    if (showSplash) return;

    const hasSecret = !!localStorage.getItem(SECRET_KEY);
    const onboarded = localStorage.getItem('wl/onboarding-ok') === '1';

    if (!hasSecret && !onboarded) {
      navigate('/onboarding', { replace: true });
    } else {
      navigate('/home', { replace: true });
    }
  }, [showSplash, navigate]);

  return showSplash ? (
    <Splash
      duration={2000}
      onDone={() => {
        sessionStorage.setItem('wl/splash-shown', '1');
        setShowSplash(false);
      }}
    />
  ) : null;
}

export default function App() {
  return (
    <IonApp>
      <HashRouter>
        <Routes>
          {/* Always start in Guard so we show Splash once then route */}
          <Route path="/" element={<Navigate to="/guard" replace />} />
          <Route path="/guard" element={<Guard />} />

          {/* Main app */}
          <Route path="/home" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/pairing" element={<HostPairingScreen />} />

          {/* Onboarding / first device */}
          <Route path="/onboarding" element={<JoinPairingScreen />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/guard" replace />} />
        </Routes>
      </HashRouter>
    </IonApp>
  );
}
