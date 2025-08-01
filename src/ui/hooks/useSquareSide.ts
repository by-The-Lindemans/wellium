// hooks/useSquareSide.ts
import { useEffect, useRef, useState } from 'react';

export function useSquareSide(pct = 0.9) {
    const ref = useRef<HTMLElement | null>(null);
    const [side, setSide] = useState(0);

    useEffect(() => {
        // Find the nearest ion-content once on mount
        const el = ref.current || document.querySelector('ion-content ion-scroll')?.parentElement
            || document.querySelector('ion-content') as HTMLElement;
        if (!el) return;

        const ro = new ResizeObserver(entries => {
            const { inlineSize, blockSize } = entries[0].contentBoxSize[0];
            // safe block size excludes toolbar + safe-area paddings
            const short = Math.min(inlineSize, blockSize);
            setSide(Math.floor(short * pct));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [pct]);

    return { side, containerRef: ref };
}
