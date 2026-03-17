import { useEffect, useState } from "react";
import { useNotificationStore, selectActiveToast } from "../../store/useNotificationStore";
import type { NotificationPayload, NotificationType } from "../../obj/notificationInterfaces";
import styles from "./notificationToast.module.css";
import notificationSound from "../../../assets/notification_sound.mp3";

const TYPE_ICONS: Record<NotificationType, string> = {
  mail:   '✉',
}
 
const TYPE_LABELS: Record<NotificationType, string> = {
  mail:   'New Mail Has Arrived',
}

function CountdownRing({
  createdAt,
  expiresAt,
}: {
  createdAt: number;
  expiresAt: number;
}) {
  const [pct, setPct] = useState(1)
 
  useEffect(() => {
    const total = Math.max(1, expiresAt - createdAt)
    const tick = () => {
      const remaining = Math.max(0, expiresAt - Date.now())
      setPct(remaining / total)
    }
    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [createdAt, expiresAt])
 
  const r = 14
  const circ = 2 * Math.PI * r
  const dash = pct * circ
 
  return (
    <svg className={styles.ring} width={36} height={36} viewBox="0 0 36 36">
      <circle cx="18" cy="18" r={r} fill="none" stroke="#2e2820" strokeWidth="2.5" />
      <circle
        cx="18" cy="18" r={r}
        fill="none"
        stroke={pct > 0.4 ? '#04c82c' : '#8b2a14'}
        strokeWidth="2.5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
        style={{ transition: 'stroke 0.4s' }}
      />
    </svg>
  )
}

interface ToastProps {
  notification: NotificationPayload
}

function Toast({ notification }: ToastProps) {
  const openNotification = useNotificationStore(s => s.openNotification)
  const dismissNotification = useNotificationStore(s => s.dismissNotification)
  const [visible, setVisible] = useState(false)
  const [audioData] = useState(notificationSound)
 
  useEffect(() => {
    // Slight delay for entrance animation
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (audioData) {
      let audio = new Audio(audioData)
      audio.play()
      return;
    }
  }, [])
 
  const handleOpen = () => {
    openNotification(notification.id)
  }
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    dismissNotification(notification.id)
  }
 
  return (
    <div
      className={`${styles.toast} ${visible ? styles.toastVisible : ''}`}
      onClick={handleOpen}
    >
      <div className={styles.toastLeft}>
        <span className={styles.toastIcon}>{TYPE_ICONS[notification.type]}</span>
      </div>
 
      <div className={styles.toastBody}>
        <p className={styles.toastType}>{TYPE_LABELS[notification.type]}</p>
        <p className={styles.toastHeadline}>{notification.headline}</p>
        <p className={styles.toastCta}>Click to investigate →</p>
      </div>
 
      <div className={styles.toastRight}>
        <CountdownRing createdAt={notification.createdAt} expiresAt={notification.expiresAt + 1000000} />
        <button className={styles.dismissBtn} onClick={handleDismiss} title="Dismiss">×</button>
      </div>
    </div>
  )
}
 
export function NotificationToast() {
  const active = useNotificationStore(selectActiveToast)
  if (!active) return null
  return (
    <div className={styles.toastContainer}>
      <Toast key={active.id} notification={active} />
    </div>
  )
}
 
