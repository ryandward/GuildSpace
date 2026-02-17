import { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export interface IndicatorStyle {
  left: number;
  width: number;
  transition: string;
}

export function useSlidingIndicator<E extends HTMLElement = HTMLElement>() {
  const location = useLocation();
  const ref = useRef<E>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) {
      setIndicator(null);
      return;
    }
    const parentRect = el.getBoundingClientRect();
    const linkRect = active.getBoundingClientRect();
    setIndicator({
      left: linkRect.left - parentRect.left,
      width: linkRect.width,
    });
    if (!ready) requestAnimationFrame(() => setReady(true));
  }, [ready]);

  useEffect(() => {
    measure();
  }, [location.pathname, measure]);

  useEffect(() => {
    const onFocus = () => measure();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [measure]);

  const style: IndicatorStyle | null = indicator
    ? {
        left: indicator.left,
        width: indicator.width,
        transition: ready
          ? 'left var(--duration-normal) var(--ease-decelerate), width var(--duration-normal) var(--ease-decelerate)'
          : 'none',
      }
    : null;

  return { ref, style };
}
