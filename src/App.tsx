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
/*import '@ionic/react/css/palettes/dark.system.css';*/

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

  // 11:3 logical box
  const VBW = 1100;
  const VBH = 300;
  const CX = VBW / 2;

  // compute font size once; center by baseline at mid-height
  const [fs, setFs] = React.useState<number>(160);
  const [fixed, setFixed] = React.useState(false);
  const [doFade, setDoFade] = React.useState(false);

  const measureTextRef = React.useRef<SVGTextElement>(null);

  React.useLayoutEffect(() => {
    if (started.current) return;
    started.current = true;

    const BASE_FS = 160;

    const measure = () => {
      const t = measureTextRef.current;
      if (!t) return;

      // measure at a known size with y=0; get glyph bbox height
      t.setAttribute("font-size", String(BASE_FS));
      t.setAttribute("y", "0");
      const bb = t.getBBox();
      const s = bb.height > 0 ? VBH / bb.height : 1;

      setFs(BASE_FS * s);

      // start; schedule final-quarter fade
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setPlay(true);
          window.setTimeout(() => setDoFade(true), Math.round(duration * 0.75));
        })
      );
    };

    // @ts-expect-error fonts may not exist in some TS lib targets
    (document.fonts?.ready || Promise.resolve()).then(measure);
  }, [duration]);

  const introDur = Math.max(1, Math.round(duration * 0.25));
  const fadeDur = Math.max(1, Math.round(duration * 0.25));

  return (
    <>
      <style>{`
        @font-face {
          font-family: "Code New Roman";
          src: url("${base}fonts/CodeNewRoman-Regular.woff") format("woff");
          font-weight: 500; font-style: normal; font-display: swap;
        }

        @keyframes wl-intro { 0% {transform:scale(0)} 100% {transform:scale(1)} }
        @keyframes wl-fade  { 0% {opacity:1} 100% {opacity:0} }

        .wl-splash { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; }
        /* layering: curtain under, SVG above */
        .wl-curtain { position: absolute; inset: 0; background: #000; opacity: 1; z-index: 0; }
        .wl-curtain.fade { animation: wl-fade ${fadeDur}ms ease forwards; }
        .wl-wordwrap { position: relative; z-index: 1; }

        .wl-word { width: 50vw; height: auto; display: block; }

        /* word scales only in the first quarter; no transform during the hold */
        .wl-anim { transform-origin: 50% 50%; transform: scale(0); }
        .wl-anim.scaleing { animation: wl-intro ${introDur}ms ease forwards; }
        .wl-anim.fade     { animation: wl-fade ${fadeDur}ms ease forwards; }

        /* keep Chrome from forcing grayscale AA */
        .wl-word, .wl-word text { -webkit-font-smoothing: auto; text-rendering: optimizeLegibility; }

        @media (prefers-reduced-motion: reduce) {
          .wl-curtain.fade { animation: none; opacity: 0; }
          .wl-anim { transform: none !important; animation: none !important; }
        }
      `}</style>

      <div
        className="wl-splash"
        onAnimationEnd={(e) => {
          if ((e as AnimationEvent).animationName === "wl-fade" && (e.target as HTMLElement).classList.contains("wl-curtain")) {
            onDone();
          }
        }}
      >
        {/* offscreen measurer; same text and width; no transforms */}
        <svg style={{ position: "absolute", visibility: "hidden", left: -9999, top: -9999 }} viewBox={`0 0 ${VBW} ${VBH}`} aria-hidden="true">
          <text
            ref={measureTextRef}
            x={CX} y={0}
            textLength={VBW} lengthAdjust="spacingAndGlyphs"
            dominantBaseline="alphabetic" textAnchor="middle"
            fontFamily='"Code New Roman","Courier New",monospace'
            fontWeight="500" fontSize={160}
          >welliuᴍ</text>
        </svg>

        {/* opaque curtain behind everything; actually covers the app */}
        <div className={`wl-curtain ${doFade ? "fade" : ""}`} />

        {/* visible wordmark; sits above the curtain; no parent transform during the hold */}
        <div className="wl-wordwrap">
          <svg className="wl-word" viewBox={`0 0 ${VBW} ${VBH}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <g
              className={[
                "wl-anim",
                play && !fixed ? "scaleing" : "",
                doFade ? "fade" : ""
              ].join(" ").trim()}
              onAnimationEnd={(e) => {
                if ((e as AnimationEvent).animationName === "wl-intro") setFixed(true);
              }}
              style={fixed ? { transform: "none" } : undefined}
            >
              <text
                x={CX}
                y={VBH / 2}
                textLength={VBW}
                lengthAdjust="spacingAndGlyphs"
                dominantBaseline="middle"
                textAnchor="middle"
                fontFamily='"Code New Roman","Courier New",monospace'
                fontWeight="500"
                fontSize={fs}
                fill="#7f7f7f"
              >welliuᴍ</text>
            </g>
          </svg>
        </div>
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
