type TGWebApp = {
  initData?: string
  initDataUnsafe?: any
  expand?: () => void
  ready?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  HapticFeedback?: { impactOccurred?: (style: 'light' | 'medium' | 'heavy') => void }
  openTelegramLink?: (url: string) => void
}

export function getTelegram(): TGWebApp | null {
  const w = window as any
  return (w?.Telegram?.WebApp as TGWebApp) ?? null
}

export function safeExpand() {
  const tg = getTelegram()
  tg?.expand?.()
  tg?.ready?.()
  tg?.setHeaderColor?.('#0F0F11')
  tg?.setBackgroundColor?.('#0F0F11')
}

export function hapticLight() {
  getTelegram()?.HapticFeedback?.impactOccurred?.('light')
}


export function hapticMedium() {
  try {
    const tg = (window as any)?.Telegram?.WebApp
    tg?.HapticFeedback?.impactOccurred?.('medium')
  } catch {}
}
export function hapticSelection() {
  try {
    const tg = (window as any)?.Telegram?.WebApp
    tg?.HapticFeedback?.selectionChanged?.()
  } catch {}
}
