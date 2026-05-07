import { useRef, useEffect } from 'react';
import styles from './Chart.module.css';

/** segments: [{label, value, color}] */
export function DonutChart({ segments, centerText = '', size = 180, lineWidth = 32 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const center = size / 2;
    const radius = (size - lineWidth) / 2;
    const total  = segments.reduce((s, seg) => s + seg.value, 0);

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No data', center, center);
      return;
    }

    let angle = -Math.PI / 2;
    segments.forEach((seg, i) => {
      const sweep = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(center, center, radius, angle, angle + sweep);
      ctx.strokeStyle = seg.color || '#1a3a5c';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'butt';
      ctx.stroke();
      angle += sweep;
    });

    if (centerText) {
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold 18px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(centerText, center, center);
    }
  }, [segments, centerText, size, lineWidth]);

  return (
    <div className={styles.donutWrapper}>
      <canvas ref={canvasRef} />
      {segments.filter(s => s.value > 0).length > 0 && (
        <div className={styles.legend}>
          {segments.filter(s => s.value > 0).map((s, i) => (
            <div key={i} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: s.color }} />
              <span>{s.label}: {s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
