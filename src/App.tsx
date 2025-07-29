import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { ellipse, square, triangle } from 'ionicons/icons';
import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

import React from "react";
import { useSync } from "./sync/SyncProvider";
import PairingScreen from "./ui/PairingScreen";
import ConnectionBanner from "./ui/ConnectionBanner";
import Tabs from "./pages/Tabs"; // whatever your main shell exports

setupIonicReact();

const AppShell: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/tab1">
            <Tab1 />
          </Route>
          <Route exact path="/tab2">
            <Tab2 />
          </Route>
          <Route path="/tab3">
            <Tab3 />
          </Route>
          <Route exact path="/">
            <Redirect to="/tab1" />
          </Route>
        </IonRouterOutlet>
        <IonTabBar slot="bottom">
          <IonTabButton tab="tab1" href="/tab1">
            <IonIcon aria-hidden="true" icon={triangle} />
            <IonLabel>Tab 1</IonLabel>
          </IonTabButton>
          <IonTabButton tab="tab2" href="/tab2">
            <IonIcon aria-hidden="true" icon={ellipse} />
            <IonLabel>Tab 2</IonLabel>
          </IonTabButton>
          <IonTabButton tab="tab3" href="/tab3">
            <IonIcon aria-hidden="true" icon={square} />
            <IonLabel>Tab 3</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);

function Splash({ duration = 1000, onDone }: { duration?: number; onDone: () => void }) {
  const base = import.meta.env.BASE_URL || "/";
  const started = React.useRef(false);
  const [play, setPlay] = React.useState(false);
  const [fitTransform, setFitTransform] = React.useState<string>("");

  const measureTextRef = React.useRef<SVGTextElement>(null);

  React.useLayoutEffect(() => {
    if (started.current) return;
    started.current = true;

    const measure = () => {
      const t = measureTextRef.current;
      if (!t) return;
      const bb = t.getBBox();
      const scaleY = bb.height > 0 ? 362 / bb.height : 1;
      const centerY = bb.y + bb.height / 2;
      const targetCenter = 362 / 2;
      const dy = targetCenter - centerY;
      setFitTransform(`translate(0 ${dy}) scale(1 ${scaleY})`);

      requestAnimationFrame(() => requestAnimationFrame(() => setPlay(true)));
    };

    // @ts-expect-error fonts API may not be in older TS libs
    (document.fonts?.ready || Promise.resolve()).then(measure);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <style>{`
        @font-face {
          font-family: "Code New Roman";
          src: url("${base}fonts/CodeNewRoman-Regular.woff") format("woff");
          font-weight: 500; font-style: normal; font-display: swap;
        }
        @font-face {
          font-family: "Code New Roman";
          src: url("${base}fonts/CodeNewRoman-Bold.woff") format("woff");
          font-weight: 700; font-style: normal; font-display: swap;
        }
        @font-face {
          font-family: "Code New Roman";
          src: url("${base}fonts/CodeNewRoman-Italic.woff") format("woff");
          font-weight: 500; font-style: italic; font-display: swap;
        }

        :root { --wl-dur: ${duration}ms; }

        /* Overlay stays opaque through 75%; fades in the last quarter */
        @keyframes wl-overlay {
          0% { opacity: 1 }
          75% { opacity: 1 }
          100% { opacity: 0 }
        }

        /* Wordmark scales to full by 25%, then holds */
        @keyframes wl-intro {
          0% { transform: scale(0) }
          25% { transform: scale(1) }
          75% { transform: scale(1) }
          100% { transform: scale(1) }
        }

        .wl-splash {
          position: fixed; inset: 0; z-index: 2147483647;
          display: flex; align-items: center; justify-content: center;
          background: #fff; opacity: 1;
        }
        .wl-splash.play { animation: wl-overlay var(--wl-dur) ease forwards; }

        .wl-word { width: 50vw; height: auto; display: block; }

        /* Start collapsed to avoid a full-size flash before play flips on */
        .wl-anim { transform-origin: 50% 50%; transform: scale(0); }
        .wl-splash.play .wl-anim { animation: wl-intro var(--wl-dur) ease forwards; }

        @media (prefers-reduced-motion: reduce) {
          .wl-splash.play { animation: none }
          .wl-anim { transform: scale(1); animation: none }
        }
      `}</style>

      <div className={`wl-splash ${play ? "play" : ""}`} onAnimationEnd={onDone}>
        {/* hidden measuring clone for accurate vertical fit at weight 500 */}
        <svg className="wl-measure" viewBox="0 0 1848 362" aria-hidden="true" style={{ position: 'absolute', visibility: 'hidden', left: -9999, top: -9999 }}>
          <text
            ref={measureTextRef}
            x="924" y="50%" dominantBaseline="middle" textAnchor="middle"
            textLength="1848" lengthAdjust="spacingAndGlyphs"
            fontFamily='"Code New Roman","Courier New",monospace'
            fontWeight="500" fontSize="300" letterSpacing="0px"
          >
            welliuᴍ
          </text>
        </svg>

        {/* visible wordmark */}
        <svg className="wl-word" viewBox="0 0 1848 362" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <g transform={fitTransform}>
            <g className="wl-anim">
              <text
                x="924" y="50%" dominantBaseline="middle" textAnchor="middle"
                textLength="1848" lengthAdjust="spacingAndGlyphs"
                fontFamily='"Code New Roman","Courier New",monospace'
                fontWeight="500" fontSize="300" fill="#7f7f7f" letterSpacing="0px"
              >
                welliuᴍ
              </text>
            </g>
          </g>
        </svg>
      </div>
    </>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);
  const hasSecret = (() => {
    try { return !!localStorage.getItem("wellium/pairing-secret"); } catch { return false; }
  })();
  const { status } = useSync();

  return (
    <>
      {showSplash && <Splash duration={1000} onDone={() => setShowSplash(false)} />}
      <ConnectionBanner />
      {hasSecret ? <AppShell /> : <PairingScreen />}
    </>
  );
}
