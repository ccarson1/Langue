import { useRef } from 'react';

export function useDotAnimation(setters = [], maxDots = 3, interval = 500) {
  const animatingRef = useRef(false);
  const dotCountRef = useRef(0);

  const startAnimation = () => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    dotCountRef.current = 0;
    animate();
  };

  const stopAnimation = () => {
    animatingRef.current = false;
  };

  const animate = () => {
    if (!animatingRef.current) return;
    dotCountRef.current = (dotCountRef.current + 1) % (maxDots + 1);
    const dots = '.'.repeat(dotCountRef.current) || '.';

    // Apply dot animation to all bound state setters
    setters.forEach(setFn => setFn(dots));

    setTimeout(animate, interval);
  };

  return { startAnimation, stopAnimation };
}