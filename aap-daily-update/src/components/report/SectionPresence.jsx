import styles from './SectionPresence.module.css';

export function SectionPresence({ presenceMap, sectionId }) {
  const editors = Object.values(presenceMap || {}).filter(
    (p) => p.online && p.currentSection === sectionId
  );

  if (editors.length === 0) return null;

  return (
    <div className={styles.container}>
      {editors.map((editor) => (
        <span key={editor.uid} className={styles.badge} title={editor.displayName}>
          <span className={styles.dot} />
          {editor.displayName} is editing
        </span>
      ))}
    </div>
  );
}
