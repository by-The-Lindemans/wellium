import { Redirect, Route } from 'react-router-dom';
import { Capacitor } from "@capacitor/core";
import { NativeAudio } from "@capacitor-community/native-audio";
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
import './theme/global-layout.css';

import React from "react";
import JoinPairingScreen from "./ui/JoinPairingScreen";
import DashboardPage from './pages/DashboardPage';

setupIonicReact();

function Splash({
  duration = 2000,
  onDone,
}: {
  duration?: number;
  onDone: () => void;
}) {
  const base = import.meta.env.BASE_URL || "/";
  const started = React.useRef(false);
  const [playAnim, setPlayAnim] = React.useState(false);

  // 11:3 logical box
  const VBW = 1100;
  const VBH = 300;
  const CX = VBW / 2;

  const [fs, setFs] = React.useState<number>(160);
  const [fixed, setFixed] = React.useState(false);
  const [doFade, setDoFade] = React.useState(false);

  const measureTextRef = React.useRef<SVGTextElement>(null);

  const isNative = React.useMemo(() => {
    const p = Capacitor.getPlatform();
    return p === "ios" || p === "android";
  }, []);

  const isElectron = React.useMemo(() => {
    return !!(
      (window as any).process?.versions?.electron ||
      navigator.userAgent.includes("Electron")
    );
  }, []);

  // Build a URL to the audio asset (served by dev server / packaged app)
  const audioUrl = React.useMemo(
    () => new URL("sounds/sonic_logo.wav", window.location.origin + base).toString(),
    [base]
  );

  // ---- Electron predecode (Web Audio) cache ----
  let electronCtxRef = React.useRef<AudioContext | null>(null);
  let electronBufRef = React.useRef<AudioBuffer | null>(null);

  async function preloadAudioElectron(url: string) {
    if (!electronCtxRef.current) electronCtxRef.current = new AudioContext();
    if (!electronBufRef.current) {
      const resp = await fetch(url, { cache: "force-cache" });
      const ab = await resp.arrayBuffer();
      // decodeAudioData is async, but resolves quickly for local files
      electronBufRef.current = await electronCtxRef.current.decodeAudioData(ab.slice(0));
    }
    return () => playElectronNow(); // return starter fn
  }

  async function playElectronNow(offsetSeconds = 0.00) {
    const ctx = electronCtxRef.current;
    const buf = electronBufRef.current;
    if (!ctx || !buf) return;
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch { }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    // start just ahead of now to align with the frame we flip the CSS class
    const when = ctx.currentTime + offsetSeconds;
    src.start(when);
  }

  // ---- Native preload via Capacitor community plugin ----
  async function preloadAudioNative(url: string) {
    await NativeAudio.preload({ assetId: "splash", assetPath: url, isUrl: true });
    return () => NativeAudio.play({ assetId: "splash" }); // return starter fn
  }

  React.useEffect(() => {
    if (started.current) return;
    started.current = true;

    // 1) Pre-measure fonts so we can set FS and not have a janky first frame
    const measure = () => {
      const t = measureTextRef.current;
      if (!t) return;
      const BASE_FS = 160;
      t.setAttribute("font-size", String(BASE_FS));
      t.setAttribute("y", "0");
      const bb = t.getBBox();
      const s = bb.height > 0 ? VBH / bb.height : 1;
      setFs(BASE_FS * s);
    };

    // 2) Prepare audio *first*, return a function that starts it instantly
    const prepAudio = async () => {
      try {
        if (isNative) return await preloadAudioNative(audioUrl);
        if (isElectron) return await preloadAudioElectron(audioUrl);
        return () => { }; // web: no audio
      } catch {
        return () => { };
      }
    };

    // 3) Wait for fonts (if supported), measure, then start BOTH in same rAF
    //    We chain the audio prep and fonts so we’re ready to start tightly.
    // @ts-expect-error: fonts may not exist in older TS lib targets
    const fontsReady = document.fonts?.ready || Promise.resolve();

    (async () => {
      const startAudio = await prepAudio();
      await fontsReady.catch(() => { });
      measure();

      // Align start to the same vsync tick
      requestAnimationFrame(() => {
        // Start audio first, then flip the CSS class in the same frame
        void startAudio();
        setPlayAnim(true);
        window.setTimeout(() => setDoFade(true), Math.round(duration * 0.75));
      });
    })();
  }, [duration, audioUrl, isNative, isElectron]);

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

        @keyframes wl-intro {
          0%   { transform: scale(0.001); }  /* tiny nonzero to avoid first-frame stick */
          100% { transform: scale(1); }
        }
        @keyframes wl-fade  { 0% {opacity:1} 100% {opacity:0} }

        .wl-splash { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; }
        .wl-curtain { position: absolute; inset: 0; background: #000; opacity: 1; z-index: 0; }
        .wl-curtain.fade { animation: wl-fade var(--wl-fade-dur) ease forwards; }

        .wl-wordwrap { position: relative; z-index: 1; }
        .wl-word { width: 50vw; height: auto; display: block; }

        .wl-anim { transform-origin: 50% 50%; transform: scale(0.001); }

        /* S-curve (short in/out, long middle) */
        .wl-anim.scaleing {
          animation: wl-intro var(--wl-intro-dur) cubic-bezier(0.4, 0, 0.6, 1) forwards;
          will-change: transform;
        }

        /* Logo fade to match the curtain fade */
        .wl-anim.fade {
          animation: wl-fade var(--wl-fade-dur) ease forwards;
          will-change: opacity;
        }

        .wl-word, .wl-word text { -webkit-font-smoothing: auto; text-rendering: optimizeLegibility; }

        @media (prefers-reduced-motion: reduce) {
          .wl-curtain.fade { animation: none; opacity: 0; }
          .wl-anim { transform: none !important; animation: none !important; }
        }
      `}</style>

      <div
        className="wl-splash"
        style={{
          // feed durations to CSS
          ['--wl-intro-dur' as any]: `${introDur}ms`,
          ['--wl-fade-dur' as any]: `${fadeDur}ms`,
        }}
        onAnimationEnd={(e) => {
          const el = e.target as HTMLElement;
          if ((e as AnimationEvent).animationName === "wl-fade" && el.classList.contains("wl-curtain")) {
            onDone();
          }
        }}
      >
        {/* offscreen measurer */}
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

        {/* opaque curtain behind everything */}
        <div className={`wl-curtain ${doFade ? "fade" : ""}`} />

        {/* visible wordmark */}
        <div className="wl-wordwrap">
          <svg className="wl-word" viewBox={`0 0 ${VBW} ${VBH}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <g
              className={[
                "wl-anim",
                playAnim && !fixed ? "scaleing" : "",
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
  const [skipPairing, setSkipPairing] = React.useState(false);

  return (
    <>
      {showSplash && <Splash duration={2000} onDone={() => setShowSplash(false)} />}
            {hasSecret || skipPairing
              ? <DashboardPage />
              : <JoinPairingScreen onFirstDevice={() => setSkipPairing(true)} />}    </>
  );
}