import { STATUS_COLORS, STATUS_TEXT_COLORS } from '../../constants/colors';
import styles from './SubTable.module.css';

export const STATUS_OPTIONS = ['', 'G', 'Y', 'R'];

export function RowStatusCell({ value, onChange, readOnly }) {
  const color = STATUS_COLORS[value] ?? STATUS_COLORS[''];
  const textColor = STATUS_TEXT_COLORS[value] ?? STATUS_TEXT_COLORS[''];

  if (readOnly) {
    return (
      <span
        className={styles.statusBadge}
        style={{ backgroundColor: color, color: textColor }}
      >
        {value || '—'}
      </span>
    );
  }

  return (
    <select
      className={styles.statusSelect}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{
        borderColor: color,
        backgroundColor: value ? color : undefined,
        color: value ? textColor : undefined,
      }}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>{opt || '—'}</option>
      ))}
    </select>
  );
}
