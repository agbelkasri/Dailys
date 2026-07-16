import { useRef } from 'react';
import styles from './DateJumpButton.module.css';

/**
 * A clickable date label that opens the native calendar picker (or accepts a
 * typed date). Renders `children` (the formatted date) plus a ▾ affordance;
 * behind it sits a real <input type="date"> whose picker is opened via
 * showPicker() (fallback: focus + click for older browsers).
 *
 * Props
 * ─────
 *  value     – current date as 'YYYY-MM-DD' (drives the input)
 *  max       – latest selectable date as 'YYYY-MM-DD' (usually today)
 *  onSelect  – called with the picked 'YYYY-MM-DD' string
 *  children  – the visible date label
 */
export function DateJumpButton({ value, max, onSelect, children }) {
  const inputRef = useRef(null);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try { el.showPicker(); return; } catch { /* fall through to focus */ }
    }
    el.focus();
    el.click();
  }

  return (
    <span className={styles.wrap}>
      <button type="button" className={styles.btn} onClick={openPicker} title="Pick a date">
        {children}
        <span className={styles.cal} aria-hidden="true">▾</span>
      </button>
      {/* Kept in the DOM (not display:none) so showPicker() works. */}
      <input
        ref={inputRef}
        type="date"
        className={styles.input}
        value={value || ''}
        max={max}
        onChange={(e) => e.target.value && onSelect?.(e.target.value)}
        tabIndex={-1}
        aria-label="Jump to date"
      />
    </span>
  );
}
