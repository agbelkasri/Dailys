import styles from './OnlineUsers.module.css';

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name) {
  const colors = [
    '#2d6a9f', '#16a34a', '#dc2626', '#7c3aed',
    '#ea580c', '#0891b2', '#be185d', '#65a30d',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function OnlineUsers({ users }) {
  if (!users?.length) return null;

  return (
    <div className={styles.container}>
      <span className={styles.label}>Online:</span>
      <div className={styles.avatars}>
        {users.slice(0, 8).map((user) => (
          <div
            key={user.uid}
            className={styles.avatar}
            style={{ backgroundColor: getAvatarColor(user.displayName) }}
            title={user.displayName}
          >
            {getInitials(user.displayName)}
          </div>
        ))}
        {users.length > 8 && (
          <div className={styles.avatar} style={{ backgroundColor: '#999' }}>
            +{users.length - 8}
          </div>
        )}
      </div>
    </div>
  );
}
