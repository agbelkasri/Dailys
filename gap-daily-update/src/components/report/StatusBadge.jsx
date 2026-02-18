import { STATUS_COLORS, STATUS_TEXT_COLORS } from '../../constants/colors';
import styles from './StatusBadge.module.css';

export function StatusBadge({ value, onChange, readOnly }) {
  const color = STATUS_COLORS[value] ?? STATUS_COLORS[''];
  const textColor = STATUS_TEXT_COLORS[value] ?? STATUS_TEXT_COLORS[''];

  return (
    <div className={styles.container}>
      <div
        className={styles.dot}
        style={{ backgroundColor: color }}
        title={value || 'Not set'}
      />
      {readOnly ? (
        <span
          className={styles.readOnlyBadge}
          style={{ backgroundColor: color, color: textColor }}
        >
          {value || '—'}
        </span>
      ) : (
        <select
          className={styles.select}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ borderColor: color }}
        >
          <option value="">—</option>
          <option value="G">G</option>
          <option value="Y">Y</option>
          <option value="R">R</option>
        </select>
      )}
    </div>
  );
}
