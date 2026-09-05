import type { ReactNode } from 'react'

/** 라인(stroke) 아이콘 모음 — 와이어프레임 디자인용 */
const ICONS: Record<string, ReactNode> = {
  home: <><path d="m3 10.5 9-7 9 7V20a1.5 1.5 0 0 1-1.5 1.5H15V14H9v7.5H4.5A1.5 1.5 0 0 1 3 20z" /></>,
  clipboard: <><rect width="8" height="4" x="8" y="2" rx="1.5" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6" /><path d="M9 16h6" /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3.2" /></>,
  bowl: <><path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M3 11h18" /><path d="M9.5 7.5c0-1.2.8-2 1.5-2.5" /><path d="M13.5 7.5c0-1.2.8-2 1.5-2.5" /></>,
  pill: <><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></>,
  info: <><circle cx="12" cy="12" r="9.5" /><path d="M12 16.5v-5" /><path d="M12 7.8h.01" /></>,
  pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  arrowLeft: <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>,
  check: <><path d="M21.5 11.1V12a9.5 9.5 0 1 1-5.6-8.7" /><path d="m8.5 11 3.5 3.5L22 4.5" /></>,
  lock: <><rect width="18" height="11" x="3" y="11" rx="2.5" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  alert: <><circle cx="12" cy="12" r="9.5" /><path d="M12 8v4.5" /><path d="M12 16h.01" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></>,
}

interface Props {
  name: keyof typeof ICONS | string
  size?: number
  className?: string
  stroke?: number
}

export default function Icon({ name, size = 24, className = '', stroke = 2 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name] ?? null}
    </svg>
  )
}
