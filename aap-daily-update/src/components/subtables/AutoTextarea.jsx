import { useRef, useLayoutEffect, useEffect } from 'react';

export function AutoTextarea({ value, onChange, placeholder, className }) {
  const ref = useRef(null);
  const prevWidthRef = useRef(null);

  const doResize = (el) => {
    if (!el || !el.isConnected) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  // Resize whenever value changes (covers typing + data loading into empty DOM)
  useLayoutEffect(() => {
    doResize(ref.current);
  }, [value]);

  // Re-resize whenever the element's own width changes.
  // This fires when the surrounding table column settles its width after
  // Firestore data loads — the previous timer-based approach was too early.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        // Only act on width changes to avoid an infinite loop from
        // our own height adjustments triggering the observer again.
        if (prevWidthRef.current !== w) {
          prevWidthRef.current = w;
          requestAnimationFrame(() => doResize(el));
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      rows={1}
    />
  );
}
