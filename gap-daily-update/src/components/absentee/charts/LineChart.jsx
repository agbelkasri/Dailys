import { useRef, useEffect } from 'react';
import styles from './Chart.module.css';

/** datasets: [{data: number[], color, label, fill, fillColor}], labels: string[] */
export function LineChart({ datasets, labels = [], options = {} }) {
  const canvasRef = useRef(null);
  const {
    height = 200,
    paddingLeft = 40,
    paddingBottom = 28,
    paddingTop = 16,
    paddingRight = 16,
  } = options;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !datasets?.length) return;

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
    datasets.forEach(ds => ds.data.forEach(v => { if (v > maxVal) maxVal = v; }));
    if (maxVal === 0) maxVal = 1;

    // Grid
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

    const pointCount = labels.length || (datasets[0]?.data.length || 0);
    const xStep = pointCount > 1 ? chartW / (pointCount - 1) : chartW;

    if (labels.length > 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      labels.forEach((lbl, i) => {
        ctx.fillText(lbl, paddingLeft + i * xStep, height - 6);
      });
    }

    datasets.forEach(ds => {
      const pts = ds.data.map((v, i) => ({
        x: paddingLeft + i * xStep,
        y: paddingTop + chartH - (v / maxVal) * chartH,
      }));

      if (ds.fill && pts.length > 0) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, paddingTop + chartH);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, paddingTop + chartH);
        ctx.closePath();
        ctx.fillStyle = ds.fillColor || (ds.color + '20');
        ctx.fill();
      }

      if (pts.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = ds.color || '#1a3a5c';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        pts.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = ds.color || '#1a3a5c';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
        });
      }
    });
  }, [datasets, labels, height]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
