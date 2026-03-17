import { useNotificationStore, selectOpenMinigame } from '../../store/useNotificationStore'
import { WordleMinigame } from './wordle/Wordle'
import type { MinigameData } from '../../obj/notificationInterfaces'
import styles from './MinigameModal.module.css'

const TYPE_TITLES: Record<string, string> = {
  mail:   'Correspondence Recovered',
  tip:    'Anonymous Intelligence',
  report: 'Forensic Evidence',
}

const MINIGAME_TITLES: Record<string, string> = {
  cipher: 'Decrypt the Message',
  wire:   'Reconnect the Circuit',
  jigsaw: 'Restore the Fragment',
  wordle: 'Identify the Keyword',
}

function MinigameRenderer({
  data,
  onSuccess,
  onFailure,
}: {
  data: MinigameData
  onSuccess: () => void
  onFailure: () => void
}) {
  switch (data.kind) { // add other minigame cases here
    case 'wordle':
      return <WordleMinigame data={data} onSuccess={onSuccess} onFailure={onFailure} />
    default:
      return null;
  }
}

export function MinigameModal() {
  const active = useNotificationStore(selectOpenMinigame)
  const resolveMinigame = useNotificationStore(s => s.resolveMinigame)
  const dismissNotification = useNotificationStore(s => s.dismissNotification)

  if (!active) return null

  const handleSuccess = () => resolveMinigame(active.id, true)
  const handleFailure = () => resolveMinigame(active.id, false)
  const handleClose   = () => dismissNotification(active.id)

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
      >
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
          <button className={styles.closeBtn} onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Divider */}
        <div className={styles.ruledLine} />

        {/* Flavour text */}
        <p className={styles.flavour}>{active.flavorText}</p>

        {/* Minigame */}
        <div className={styles.minigameArea}>
          <MinigameRenderer
            data={active.minigameData}
            onSuccess={handleSuccess}
            onFailure={handleFailure}
          />
        </div>

        {/* Footer */}
        <div className={styles.ruledLine} />
        <div className={styles.footer}>
          <span className={styles.footerNote}>
            Solve the puzzle to unlock the evidence.
          </span>
          <button className={styles.skipBtn} onClick={handleClose}>
            Abandon
          </button>
        </div>
      </div>
    </div>
  )
}