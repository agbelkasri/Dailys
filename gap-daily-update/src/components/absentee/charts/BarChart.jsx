import { useRef, useEffect } from 'react';
import styles from './Chart.module.css';

/**
 * data: Array of { label, value, color } or { label, segments: [{value, color}] }
 * options: { height, stacked, showValues }
 */
export function BarChart({ data, options = {} }) {
  const canvasRef = useRef(null);
  const {
    height = 220,
    stacked = false,
    showValues = true,
    barGap = 4,
    paddingLeft = 36,
    paddingBottom = 28,
    paddingTop = 16,
    paddingRight = 8,
  } = options;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.length) return;

    const width = canvas.parentElement?.clientWidth || 500;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    let maxVal = 0;
    data.forEach(d => {
      if (stacked && d.segments) {
        const t = d.segments.reduce((s, seg) => s + seg.value, 0);
        if (t > maxVal) maxVal = t;
      } else {
        if ((d.value || 0) > maxVal) maxVal = d.value;
      }
    });
    if (maxVal === 0) maxVal = 1;

    // Grid lines
    const steps = Math.min(5, maxVal);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    for (let i = 0; i <= steps; i++) {
      const y = paddingTop + chartH - (i / steps) * chartH;
      ctx.beginPath(); ctx.moveTo(paddingLeft, y); ctx.lineTo(width - paddingRight, y); ctx.stroke();
      ctx.fillText(Math.round((i / steps) * maxVal), paddingLeft - 4, y + 3);
    }

    const barW = Math.max(3, (chartW / data.length) - barGap);

    data.forEach((d, i) => {
      const x = paddingLeft + i * (barW + barGap) + barGap / 2;

      if (stacked && d.segments) {
        let yOff = 0;
        d.segments.forEach(seg => {
          const bh = (seg.value / maxVal) * chartH;
          const y  = paddingTop + chartH - yOff - bh;
          ctx.fillStyle = seg.color || '#2563eb';
          ctx.fillRect(x, y, barW, Math.max(1, bh));
          yOff += bh;
        });
      } else {
        const bh = ((d.value || 0) / maxVal) * chartH;
        const y  = paddingTop + chartH - bh;
        ctx.fillStyle = d.color || '#1a3a5c';
        ctx.fillRect(x, y, barW, Math.max(1, bh));
        if (showValues && d.value > 0 && bh > 14) {
          ctx.fillStyle = '#fff';
          ctx.font = '10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(d.value, x + barW / 2, y + 11);
        }
      }

      // X label
      if (d.label) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label, x + barW / 2, height - 6);
      }
    });
  }, [data, height, stacked, showValues]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
