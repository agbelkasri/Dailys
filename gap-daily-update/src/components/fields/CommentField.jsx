import { useEffect, useRef } from 'react';
import styles from './CommentField.module.css';

export function CommentField({ value, onChange, readOnly, onFocus, onBlur }) {
  const ref = useRef(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  if (readOnly) {
    return (
      <div className={styles.readOnly}>
        {value || <span className={styles.empty}>No comments</span>}
      </div>
    );
  }

  return (
    <textarea
      ref={ref}
      className={styles.textarea}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder="Add comments..."
      rows={2}
    />
  );
}
