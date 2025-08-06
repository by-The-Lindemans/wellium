// src/ui/Splash.tsx
import {useRef, useState, useMemo, useEffect} from 'react';
import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capacitor-community/native-audio';

type Props = { duration?: number; onDone: () => void };

const Splash: React.FC<Props> = ({ duration = 2000, onDone }) => {
    const base = import.meta.env.BASE_URL || '/';
    const started = useRef(false);
    const [playAnim, setPlayAnim] = useState(false);

    // 11:3 logical box
    const VBW = 1100;
    const VBH = 300;
    const CX = VBW / 2;

    const [fs, setFs] = useState<number>(160);
    const [fixed, setFixed] = useState(false);
    const [doFade, setDoFade] = useState(false);
    const measureTextRef = useRef<SVGTextElement>(null);

    const isNative = useMemo(() => {
        const p = Capacitor.getPlatform();
        return p === 'ios' || p === 'android';
    }, []);
    const isElectron = useMemo(() => {
        return !!((window as any).process?.versions?.electron || navigator.userAgent.includes('Electron'));
    }, []);

    const audioUrl = useMemo(
        () => new URL('sounds/sonic_logo.wav', window.location.origin + base).toString(),
        [base]
    );

    // ---- Electron predecode (Web Audio) cache ----
    let electronCtxRef = useRef<AudioContext | null>(null);
    let electronBufRef = useRef<AudioBuffer | null>(null);
    async function preloadAudioElectron(url: string) {
        if (!electronCtxRef.current) electronCtxRef.current = new AudioContext();
        if (!electronBufRef.current) {
            const resp = await fetch(url, { cache: 'force-cache' });
            const ab = await resp.arrayBuffer();
            electronBufRef.current = await electronCtxRef.current.decodeAudioData(ab.slice(0));
        }
        return () => playElectronNow();
    }
    async function playElectronNow(offsetSeconds = 0) {
        const ctx = electronCtxRef.current;
        const buf = electronBufRef.current;
        if (!ctx || !buf) return;
        if (ctx.state === 'suspended') {
            try { await ctx.resume(); } catch { }
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        const when = ctx.currentTime + offsetSeconds;
        src.start(when);
    }

    // ---- Native preload via Capacitor community plugin ----
    async function preloadAudioNative(url: string) {
        await NativeAudio.preload({ assetId: 'splash', assetPath: url, isUrl: true });
        return () => NativeAudio.play({ assetId: 'splash' });
    }

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        const measure = () => {
            const t = measureTextRef.current;
            if (!t) return;
            const BASE_FS = 160;
            t.setAttribute('font-size', String(BASE_FS));
            t.setAttribute('y', '0');
            const bb = t.getBBox();
            const s = bb.height > 0 ? VBH / bb.height : 1;
            setFs(BASE_FS * s);
        };

        const prepAudio = async () => {
            try {
                if (isNative) return await preloadAudioNative(audioUrl);
                if (isElectron) return await preloadAudioElectron(audioUrl);
                return () => { };
            } catch {
                return () => { };
            }
        };

        // @ts-expect-error: fonts may not exist in older TS lib targets
        const fontsReady = document.fonts?.ready || Promise.resolve();

        (async () => {
            const startAudio = await prepAudio();
            await fontsReady.catch(() => { });
            measure();

            // Start audio + intro anim
            requestAnimationFrame(() => {
                void startAudio();
                setPlayAnim(true);
                // trigger the fade near the end (as before)
                const fadeT = window.setTimeout(() => setDoFade(true), Math.round(duration * 0.75));
                // NEW: hard fallback to ensure onDone fires even if animations are disabled
                const hardDoneT = window.setTimeout(() => {
                    onDone();
                }, duration + 150);

                // store timers so we can clear them if needed
                (started as any).fadeT = fadeT;
                (started as any).hardDoneT = hardDoneT;
            });
        })();

        return () => {
            // clear timers if the component unmounts early
            if ((started as any).fadeT) window.clearTimeout((started as any).fadeT);
            if ((started as any).hardDoneT) window.clearTimeout((started as any).hardDoneT);
        };
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
        @keyframes wl-intro { 0% { transform: scale(0.001); } 100% { transform: scale(1); } }
        @keyframes wl-fade  { 0% {opacity:1} 100% {opacity:0} }

        .wl-splash { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; }
        .wl-curtain { position: absolute; inset: 0; background: #000; opacity: 1; z-index: 0; }
        .wl-curtain.fade { animation: wl-fade var(--wl-fade-dur) ease forwards; }

        .wl-wordwrap { position: relative; z-index: 1; }
        .wl-word { width: 50vw; height: auto; display: block; }

        .wl-anim { transform-origin: 50% 50%; transform: scale(0.001); }
        .wl-anim.scaleing { animation: wl-intro var(--wl-intro-dur) cubic-bezier(0.4,0,0.6,1) forwards; will-change: transform; }
        .wl-anim.fade { animation: wl-fade var(--wl-fade-dur) ease forwards; will-change: opacity; }

        .wl-word, .wl-word text { -webkit-font-smoothing: auto; text-rendering: optimizeLegibility; }

        @media (prefers-reduced-motion: reduce) {
          .wl-curtain.fade { animation: none; opacity: 0; }
          .wl-anim { transform: none !important; animation: none !important; }
        }
      `}</style>

            <div
                className="wl-splash"
                style={{
                    ['--wl-intro-dur' as any]: `${introDur}ms`,
                    ['--wl-fade-dur' as any]: `${fadeDur}ms`,
                }}
                onAnimationEnd={(e) => {
                    const el = e.target as HTMLElement;
                    if ((e as AnimationEvent).animationName === 'wl-fade' && el.classList.contains('wl-curtain')) {
                        onDone();
                    }
                }}
            >
                <svg style={{ position: 'absolute', visibility: 'hidden', left: -9999, top: -9999 }} viewBox={`0 0 ${VBW} ${VBH}`} aria-hidden="true">
                    <text
                        ref={measureTextRef}
                        x={CX} y={0}
                        textLength={VBW} lengthAdjust="spacingAndGlyphs"
                        dominantBaseline="alphabetic" textAnchor="middle"
                        fontFamily='"Code New Roman","Courier New",monospace'
                        fontWeight="500" fontSize={160}
                    >welliuᴍ</text>
                </svg>

                <div className={`wl-curtain ${doFade ? 'fade' : ''}`} />

                <div className="wl-wordwrap">
                    <svg className="wl-word" viewBox={`0 0 ${VBW} ${VBH}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                        <g
                            className={['wl-anim', playAnim && !fixed ? 'scaleing' : '', doFade ? 'fade' : ''].join(' ').trim()}
                            onAnimationEnd={(e) => {
                                if ((e as AnimationEvent).animationName === 'wl-intro') setFixed(true);
                            }}
                            style={fixed ? { transform: 'none' } : undefined}
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
};

export default Splash;