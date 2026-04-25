import { useNotificationStore, selectOpenMinigame } from '../../store/useNotificationStore';
import { WordleMinigame } from './wordle/Wordle';
import { ImageUnshuffleMinigame } from './unshuffle/ImageUnshuffleMinigame';
import { CipherMinigame } from './cipher/CipherMinigame';
import type { MinigameData } from '../../obj/notificationInterfaces';
import styles from './MinigameModal.module.css';

const TYPE_TITLES: Record<string, string> = {
  mail: 'Mail Recovered',
};

const MINIGAME_TITLES: Record<string, string> = {
  wordle: 'Identify the Keyword',
  'image-unshuffle': 'Reconstruct the Evidence',
  cipher: 'Decipher the Message',
};

function MinigameRenderer({
  data,
  onSuccess,
  onFailure,
}: {
  data: MinigameData;
  onSuccess: () => void;
  onFailure: () => void;
}) {
  switch (data.kind) {
    case 'wordle':
      return <WordleMinigame data={data} onSuccess={onSuccess} onFailure={onFailure} />;
    case 'image-unshuffle':
      return <ImageUnshuffleMinigame data={data} onSuccess={onSuccess} onFailure={onFailure} />;
    case 'cipher':
      return <CipherMinigame data={data} onSuccess={onSuccess} onFailure={onFailure} />;
    default:
      return null;
  }
}

export function MinigameModal() {
  const active = useNotificationStore(selectOpenMinigame);
  const resolveMinigame = useNotificationStore(s => s.resolveMinigame);
  const dismissNotification = useNotificationStore(s => s.dismissNotification);
  const abandonNotification = useNotificationStore(s => s.abandonMinigame);

  if (!active) return null;

  const handleSuccess = () => resolveMinigame(active.id, true);
  const handleAbandon = () => abandonNotification(active.id);
  const handleFailure = () => resolveMinigame(active.id, false);
  const handleClose = () => dismissNotification(active.id);

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modalFrame}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>

          {/* Newspaper masthead */}
          <div className={styles.masthead}>
            ★ &nbsp; Daily Mail — Crime Edition &nbsp; ★
          </div>

          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerMeta}>
              <span className={styles.notifType}>
                {TYPE_TITLES[active.type] ?? 'Evidence'}
              </span>
              <span className={styles.separator}>·</span>
              <span className={styles.minigameTitle}>
                {MINIGAME_TITLES[active.minigameType] ?? 'Puzzle'}
              </span>
            </div>
            <button className={styles.closeBtn} onClick={handleClose}>✕</button>
          </div>

          <div className={styles.minigameBox}>
            <MinigameRenderer
              data={active.minigameData}
              onSuccess={handleSuccess}
              onFailure={handleFailure}
            />
          </div>

          <div className={styles.footer}>
            <span className={styles.footerNote}>
              Solve the puzzle to unlock the evidence.
            </span>
            <button className={styles.skipBtn} onClick={handleAbandon}>
              Abandon
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}