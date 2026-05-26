import { useRef, useEffect, useState } from 'react';
import styles from './Chart.module.css';

/** byDay: Map<dateString, number> — count per day.
 *
 * Renders a calendar grid for the given month that grows to fill its
 * parent container's width. Cell size is computed from the container
 * width on every resize so the calendar always uses the full card
 * instead of sitting at a fixed 30px-cell size in the top-left corner.
 */
export function CalendarHeatmap({ byDay, year, month }) {
  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);

  // Width state drives the cellSize calculation in the draw effect.
  // ResizeObserver fires once on observe(), so we don't need a separate
  // synchronous read inside the effect body (which would trip the
  // "no setState in effect" lint rule).
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width ?? 0;
      setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track dark-mode state via body[data-theme] — canvas doesn't inherit
  // CSS variables, so we pick colors conditionally and re-render when
  // the theme toggles.
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.body.dataset.theme === 'dark'
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.body.dataset.theme === 'dark');
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;

    // Grid geometry — gap and labelW are constant; cellSize scales with
    // the container so the whole calendar fills the available width.
    const gap     = 6;
    const labelW  = 24;
    const cols    = 7;
    const minCell = 30;
    const maxCell = 96;

    // Container width minus the row-label gutter (currently unused for
    // labels but reserved so the grid doesn't kiss the left edge), with
    // 7 inter-cell gaps. Clamped so very narrow containers still render
    // legibly and ultra-wide containers don't blow up cell size past
    // any reasonable viewing height.
    const available = Math.max(0, width - labelW);
    const rawCell   = (available - (cols - 1) * gap) / cols;
    const cellSize  = Math.min(maxCell, Math.max(minCell, Math.floor(rawCell)));

    const headerH = Math.max(20, Math.round(cellSize * 0.36));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow    = new Date(year, month, 1).getDay(); // 0=Sun
    const rows        = Math.ceil((firstDow + daysInMonth) / 7);

    const canvasW = labelW + cols * cellSize + (cols - 1) * gap;
    const canvasH = headerH + rows * cellSize + (rows - 1) * gap;
    const dpr     = window.devicePixelRatio || 1;
    canvas.width  = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width  = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Font sizes scale with cell size so labels stay proportional.
    const dowFont    = Math.max(11, Math.round(cellSize * 0.32));
    const dayFont    = Math.max(11, Math.round(cellSize * 0.32));
    const countFont  = Math.max(10, Math.round(cellSize * 0.28));

    // DOW header row
    const DOW_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    ctx.font      = `${dowFont}px system-ui, sans-serif`;
    ctx.fillStyle = isDark ? '#cbd5e1' : '#94a3b8';
    ctx.textAlign = 'center';
    DOW_LABELS.forEach((lbl, i) => {
      const x = labelW + i * (cellSize + gap) + cellSize / 2;
      ctx.fillText(lbl, x, headerH - 6);
    });

    // Color scale — empty cells flip with theme so they don't glow on
    // dark backgrounds; heat colors stay constant in both modes.
    const emptyCellColor = isDark ? '#334155' : '#f3f4f6';
    function getColor(count) {
      if (!count)        return emptyCellColor;
      if (count <= 2)    return '#fef08a';
      if (count <= 4)    return '#fb923c';
      return '#dc2626';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const mm      = String(month + 1).padStart(2, '0');
      const dd      = String(day).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const count   = byDay?.get(dateStr) || 0;
      const cell    = firstDow + day - 1;
      const col     = cell % 7;
      const row     = Math.floor(cell / 7);
      const x       = labelW + col * (cellSize + gap);
      const y       = headerH + row * (cellSize + gap);

      ctx.fillStyle = getColor(count);
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, Math.round(cellSize * 0.12));
      ctx.fill();

      // Day-number text — pick contrast based on cell background.
      if (!count) {
        ctx.fillStyle = isDark ? '#cbd5e1' : '#374151';
      } else {
        ctx.fillStyle = count > 3 ? '#fff' : '#374151';
      }
      ctx.font      = `${dayFont}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      // Day number anchored to top of cell; count anchored below it.
      const dayY = y + dayFont + 4;
      ctx.fillText(day, x + cellSize / 2, dayY);

      if (count > 0) {
        ctx.fillStyle = count > 3 ? 'rgba(255,255,255,0.95)' : '#1a3a5c';
        ctx.font      = `bold ${countFont}px system-ui, sans-serif`;
        // Count badge sits in the lower portion of the cell, larger
        // and visually anchored so it reads as the day's score.
        const countY = y + cellSize - Math.round(cellSize * 0.18);
        ctx.fillText(count, x + cellSize / 2, countY);
      }
    }
  }, [byDay, year, month, isDark, width]);

  return (
    <div ref={wrapRef} className={styles.heatmapWrap}>
      <canvas ref={canvasRef} />
      <div className={styles.heatmapLegend}>
        <span>Low</span>
        <span className={styles.legendSwatch} style={{ background: '#fef08a' }} />
        <span className={styles.legendSwatch} style={{ background: '#fb923c' }} />
        <span className={styles.legendSwatch} style={{ background: '#dc2626' }} />
        <span>High</span>
      </div>
    </div>
  );
}
