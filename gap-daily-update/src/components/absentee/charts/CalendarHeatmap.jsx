import { useRef, useEffect } from 'react';
import styles from './Chart.module.css';

/** byDay: Map<dateString, number> — count per day */
export function CalendarHeatmap({ byDay, year, month }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cellSize = 30;
    const gap = 4;
    const headerH = 22;
    const labelW = 20;
    const cols = 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
    const totalCells = firstDow + daysInMonth;
    const rows = Math.ceil(totalCells / 7);

    const canvasW = labelW + cols * (cellSize + gap);
    const canvasH = headerH + rows * (cellSize + gap);
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width  = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasW, canvasH);

    const DOW_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    DOW_LABELS.forEach((lbl, i) => {
      ctx.fillText(lbl, labelW + i * (cellSize + gap) + cellSize / 2, 14);
    });

    function getColor(count) {
      if (!count) return '#f3f4f6';
      if (count <= 2) return '#fef08a';
      if (count <= 4) return '#fb923c';
      return '#dc2626';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const count = byDay?.get(dateStr) || 0;
      const cell = firstDow + day - 1;
      const col = cell % 7;
      const row = Math.floor(cell / 7);
      const x = labelW + col * (cellSize + gap);
      const y = headerH + row * (cellSize + gap);

      ctx.fillStyle = getColor(count);
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, 3);
      ctx.fill();

      ctx.fillStyle = count > 3 ? '#fff' : '#374151';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(day, x + cellSize / 2, y + cellSize / 2 + 4);

      if (count > 0) {
        ctx.fillStyle = count > 3 ? 'rgba(255,255,255,0.9)' : '#1a3a5c';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.fillText(count, x + cellSize / 2, y + cellSize / 2 - 6);
      }
    }
  }, [byDay, year, month]);

  return (
    <div>
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
