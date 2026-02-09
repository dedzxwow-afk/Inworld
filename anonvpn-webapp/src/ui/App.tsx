import { useEffect, useMemo, useRef, useState } from 'react'
import { getTelegram, hapticLight, hapticMedium, safeExpand } from '../tg'

function getParam(name: string) {
  try {
    const v = new URLSearchParams(window.location.search).get(name)
    return v ?? undefined
  } catch { return undefined }
}

function useParallax() {
  const reduceMotion =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
const [v, setV] = useState({ x: 0, y: 0 })
  const [gyroAvailable, setGyroAvailable] = useState(false)
  const [gyroEnabled, setGyroEnabled] = useState(false)
  const [gyroNeedsPermission, setGyroNeedsPermission] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const has = typeof (window as any).DeviceOrientationEvent !== 'undefined'
    setGyroAvailable(has)
    // iOS-style permission gate
    const req = (window as any).DeviceOrientationEvent?.requestPermission
    setGyroNeedsPermission(typeof req === 'function')
    // On Android (no permission API), enable automatically
    if (has && typeof req !== 'function') setGyroEnabled(true)
  }, [])

  const requestGyro = async () => {
    try {
      const req = (window as any).DeviceOrientationEvent?.requestPermission
      if (typeof req === 'function') {
        const res = await req()
        if (res === 'granted') setGyroEnabled(true)
      } else {
        setGyroEnabled(true)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (reduceMotion) return

    let raf: number | null = null
    let loopRaf: number | null = null

    let tx = 0, ty = 0
    let cx = 0, cy = 0
    let a = 0

    const clamp = (n: number, m: number) => Math.max(-m, Math.min(m, n))

    const update = () => {
      raf = null
      cx += (tx - cx) * 0.10
      cy += (ty - cy) * 0.10
      setV({ x: cx * 1.55, y: cy * 1.35 })
    }

    const schedule = () => {
      if (raf == null) raf = requestAnimationFrame(update)
    }

    const onPointer = (clientX: number, clientY: number) => {
      const w = window.innerWidth || 1
      const h = window.innerHeight || 1
      const x = (clientX / w - 0.5) * 2
      const y = (clientY / h - 0.5) * 2
      tx = clamp(x, 1)
      ty = clamp(y, 1)
      schedule()
    }

    const onMove = (e: PointerEvent) => onPointer(e.clientX, e.clientY)
    const onTouch = (e: TouchEvent) => {
      if (!e.touches?.length) return
      const t = e.touches[0]
      onPointer(t.clientX, t.clientY)
    }

    const onOrient = (e: DeviceOrientationEvent) => {
      if (!gyroEnabled) return
      // gamma: left/right (-90..90), beta: front/back (-180..180)
      const g = typeof e.gamma === 'number' ? e.gamma : 0
      const b = typeof e.beta === 'number' ? e.beta : 0
      const x = clamp(g / 30, 1) // more sensitive
      const y = clamp(b / 45, 1)
      // blend with any pointer influence by nudging target
      tx = x
      ty = y
      schedule()
    }

    // tiny drift so it feels alive even on desktop
    const loop = () => {
      a += 0.012
      if (!gyroEnabled) {
        tx = clamp(tx + Math.sin(a) * 0.00035, 1)
        ty = clamp(ty + Math.cos(a * 0.9) * 0.00035, 1)
        schedule()
      }
      loopRaf = requestAnimationFrame(loop)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('deviceorientation', onOrient as any, { passive: true })
    loopRaf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('deviceorientation', onOrient as any)
      if (raf != null) cancelAnimationFrame(raf)
      if (loopRaf != null) cancelAnimationFrame(loopRaf)
    }
  }, [reduceMotion, gyroEnabled])

  return { ...v, gyroAvailable, gyroEnabled, gyroNeedsPermission, requestGyro }
}


type Tab = 'connect' | 'plans' | 'share' | 'profile'
type VpnState = 'disconnected' | 'connecting' | 'connected'

const PLANS = [
  { id: '3d', label: '3 дня', price: 2 },
  { id: '7d', label: '7 дней', price: 4 },
  { id: '14d', label: '14 дней', price: 8 },
  { id: '30d', label: '30 дней', price: 15 },
  { id: '60d', label: '60 дней', price: 25 },
  { id: '90d', label: '90 дней', price: 40 },
  { id: '360d', label: '360 дней', price: 60 },
]

const LOCATIONS = [
  { id: 'se', code: 'SE', name: 'Швеция', ping: 42 },
  { id: 'de', code: 'DE', name: 'Германия', ping: 56 },
  { id: 'nl', code: 'NL', name: 'Нидерланды', ping: 48 },
]

function cn(...xs: Array<string | false | undefined>) { return xs.filter(Boolean).join(' ') }

function Icon({ children, className }: { children: any; className?: string }) {
  return <span className={cn('inline-flex h-5 w-5 items-center justify-center', className)}>{children}</span>
}

function IShield() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 4v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  )
}
function IPower() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v8" />
      <path d="M6.2 4.9A10 10 0 1 0 17.8 4.9" />
    </svg>
  )
}
function IStar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.8l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20.8l1.2-6.5-4.8-4.6 6.6-.9L12 2.8z"/>
    </svg>
  )
}
function IShare() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16v-9" />
      <path d="M8.5 10.5L12 7l3.5 3.5" />
      <path d="M5 14v6h14v-6" />
    </svg>
  )
}
function IUser() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  )
}
function ISwap() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h11l-2.5-2.5" />
      <path d="M17 17H6l2.5 2.5" />
    </svg>
  )
}
function IArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17L17 7" />
      <path d="M10 7h7v7" />
    </svg>
  )
}
function IArrowRight() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}
function ISignal() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h2" />
      <path d="M7 20h2v-4H7z" />
      <path d="M11 20h2v-8h-2z" />
      <path d="M15 20h2v-12h-2z" />
      <path d="M19 20h2v-16h-2z" />
    </svg>
  )
}
function LocationBadge({ code }: { code: string }) {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-2xl glass edge-glow text-[11px] font-semibold tracking-widest text-text">
      {code}
      <div className="noise-overlay" />

</div>
  )
}


function Glass({ children, className }: { children: any; className?: string }) {
  return (
    <div className={cn('rounded-3xl border border-white/10 bg-surface backdrop-blur shadow-soft', className)}>
      {children}
    </div>
  )
}

function Pill({ children }: { children: any }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl glass edge-glow px-3 py-2 text-xs text-subtext">
      {children}
    </div>
  )
}

function AccentDot({ state }: { state: VpnState }) {
  const cls = state === 'connected' ? 'dot dot-connected' : state === 'connecting' ? 'dot dot-connecting' : 'dot dot-off'
  return <span className={cls} />
}


function BokehLayer({ intensity = 1 }: { intensity?: number }) {
  const dots = useMemo(() => {
    const arr: Array<{ t: 'dot' | 'blur' | 'streak'; x: number; y: number; s: number; d: number; del: number; r?: number }> = []
    const n = Math.round(18 * intensity)
    for (let i = 0; i < n; i++) {
      arr.push({ t: 'dot', x: Math.random() * 100, y: Math.random() * 100, s: 2 + Math.random() * 3, d: 3.6 + Math.random() * 2.8, del: Math.random() * 3.5 })
    }
    const nb = Math.round(10 * intensity)
    for (let i = 0; i < nb; i++) {
      arr.push({ t: 'blur', x: Math.random() * 100, y: Math.random() * 100, s: 10 + Math.random() * 22, d: 4.2 + Math.random() * 3.6, del: Math.random() * 4.0 })
    }
    const ns = Math.round(6 * intensity)
    for (let i = 0; i < ns; i++) {
      arr.push({ t: 'streak', x: Math.random() * 100, y: Math.random() * 100, s: 20 + Math.random() * 34, d: 3.8 + Math.random() * 3.4, del: Math.random() * 4.3, r: (Math.random() * 60 - 30) })
    }
    return arr
  }, [intensity])

  return (
    <div className="bokeh">
      {dots.map((p, idx) => {
        const common = {
          left: `${p.x}%`,
          top: `${p.y}%`,
          ['--dur' as any]: `${p.d}s`,
          ['--delay' as any]: `${p.del}s`,
          ['--rot' as any]: `${p.r ?? 0}deg`,
        } as any
        if (p.t === 'dot') {
          return <div key={idx} className="bokeh-dot" style={{ ...common, width: p.s, height: p.s }} />
        }
        if (p.t === 'blur') {
          return <div key={idx} className="bokeh-blur" style={{ ...common, width: p.s, height: p.s }} />
        }
        return <div key={idx} className="bokeh-streak" style={{ ...common, width: p.s, height: 3 }} />
      })}
    </div>
  )
}


function SpringBackdrop({ px, py }: { px: number; py: number }) {
  // Spring: visible sky, warm sun & rays, pollen particles, layered trees, brighter grass (still premium)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* sky gradient */}
      <div
        className="absolute inset-0 dof-far"
        style={{
          background:
            'linear-gradient(180deg, rgba(26,34,44,1) 0%, rgba(18,24,30,1) 28%, rgba(12,20,18,1) 55%, rgba(7,26,20,1) 100%)',
        }}
      />

      {/* vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 30%, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.60) 100%)' }} />
      {/* sky haze */}
      <div className="parallax-layer absolute inset-0 opacity-40" style={{ transform: `translate3d(${px * 4}px, ${py * 3}px, 0)`, background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 35%, rgba(255,255,255,0.0) 70%)' }} />

      {/* soft clouds */}
      <div className="parallax-layer absolute left-[-80px] top-10 h-24 w-72 rounded-full opacity-35"
           style={{ transform: `translate3d(${px * 18}px, ${py * 12}px, 0)`, background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 55%, rgba(255,255,255,0) 72%)', filter: 'blur(2px)' }} />
      <div className="parallax-layer absolute left-24 top-20 h-20 w-64 rounded-full opacity-25"
           style={{ transform: `translate3d(${px * 12}px, ${py * 9}px, 0)`, background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 58%, rgba(255,255,255,0) 75%)', filter: 'blur(3px)' }} />

      {/* sun */}
      <div className="parallax-layer absolute -top-28 -right-28 h-80 w-80 rounded-full"
           style={{
             transform: `translate3d(${px * -14}px, ${py * -12}px, 0)`,
             background: 'radial-gradient(circle at 40% 40%, rgba(230,196,106,0.50) 0%, rgba(230,196,106,0.18) 45%, rgba(230,196,106,0.0) 72%)',
           }} />
      <div className="parallax-layer absolute top-6 right-6 h-28 w-28 rounded-full border border-white/10"
           style={{
             transform: `translate3d(${px * -18}px, ${py * -14}px, 0)`,
             background: 'radial-gradient(circle at 32% 30%, rgba(255,244,200,0.92) 0%, rgba(230,196,106,0.55) 38%, rgba(230,196,106,0.18) 62%, rgba(230,196,106,0.0) 82%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.0) 55%)',
             boxShadow: '0 0 80px rgba(230,196,106,0.16)'
           }} />
      

      {/* sun quality layers */}
      <div className="parallax-layer absolute top-10 right-14 h-44 w-44 rounded-full opacity-50"
           style={{
             transform: `translate3d(${px * -14}px, ${py * -12}px, 0)`,
             background: 'radial-gradient(circle at 45% 45%, rgba(255,232,170,0.10) 0%, rgba(230,196,106,0.10) 40%, rgba(230,196,106,0.0) 72%)',
             filter: 'blur(0.6px)'
           }} />
      <div className="parallax-layer absolute top-2 right-2 h-56 w-56 rounded-full opacity-35"
           style={{
             transform: `translate3d(${px * -12}px, ${py * -10}px, 0)`,
             background: 'conic-gradient(from 220deg, rgba(230,196,106,0.0), rgba(230,196,106,0.10), rgba(230,196,106,0.0))',
             filter: 'blur(1px)'
           }} />
<div className="parallax-layer absolute top-6 right-6 h-28 w-28 rounded-full opacity-35" style={{ transform: `translate3d(${px * -18}px, ${py * -14}px, 0)`, background: 'repeating-radial-gradient(circle at 40% 40%, rgba(255,255,255,0.06) 0 2px, rgba(255,255,255,0.0) 3px 6px)', filter: 'blur(0.6px)' }} />

      {/* rays */}
      <div
        className="parallax-layer absolute top-0 right-0 h-72 w-72 opacity-50"
        style={{ transform: `translate3d(${px * -18}px, ${py * -14}px, 0)` }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 h-40 w-[3px] rounded-full"
            style={{
              background:
                'linear-gradient(to bottom, rgba(230,196,106,0.0), rgba(230,196,106,0.18), rgba(230,196,106,0.0))',
              transform: `rotate(${i * 15}deg) translateY(-92px)`,
              transformOrigin: 'center bottom',
              filter: 'blur(0.3px)',
            }}
          />
        ))}
      </div>

{/* pollen particles */}
      <div
        className="parallax-layer absolute inset-0 opacity-70"
        style={{ transform: `translate3d(${px * 14}px, ${py * 10}px, 0)`,
          backgroundImage:
            'radial-gradient(circle at 10% 20%, rgba(230,196,106,0.38) 0 1px, transparent 2px),'
            + 'radial-gradient(circle at 80% 30%, rgba(255,255,255,0.18) 0 1px, transparent 2px),'
            + 'radial-gradient(circle at 40% 70%, rgba(230,196,106,0.24) 0 1px, transparent 2px),'
            + 'radial-gradient(circle at 70% 80%, rgba(255,255,255,0.14) 0 1px, transparent 2px),'
            + 'radial-gradient(circle at 20% 55%, rgba(230,196,106,0.20) 0 1px, transparent 2px)',
          backgroundSize: '260px 260px, 320px 320px, 380px 380px, 420px 420px, 300px 300px',
          animation: 'floaty 7s ease-in-out infinite',
        }}
      />

      {/* distant tree line */}
      <svg className="absolute bottom-36 left-0 right-0 w-full opacity-55" style={{ transform: `translate3d(${px * 10}px, ${py * 8}px, 0)` }} viewBox="0 0 390 140" preserveAspectRatio="none">
        <path d="M0,140 L0,86 L16,74 L26,86 L38,64 L52,86 L66,70 L78,86 L92,62 L106,86 L120,68 L132,86 L148,70 L160,86 L176,68 L188,86 L204,60 L218,86 L234,72 L246,86 L262,66 L276,86 L292,70 L304,86 L320,64 L334,86 L352,74 L366,86 L390,92 L390,140 Z"
              fill="rgba(9,34,26,0.88)" />
      </svg>


      {/* mid tree line */}
      <svg className="parallax-layer absolute bottom-28 left-0 right-0 w-full opacity-50" style={{ transform: `translate3d(${px * 8}px, ${py * 6}px, 0)` }} viewBox="0 0 390 160" preserveAspectRatio="none">
        <path d="M0,160 L0,108 L14,92 L26,108 L40,84 L54,108 L70,90 L84,108 L100,82 L114,108 L130,92 L144,108 L160,90 L176,108 L192,84 L208,108 L224,94 L238,108 L254,86 L268,108 L284,92 L298,108 L314,86 L330,108 L346,94 L360,108 L390,116 L390,160 Z"
              fill="rgba(7,26,20,0.88)" />
      </svg>

      {/* near forest + brighter grass hills */}
      <svg className="absolute -bottom-6 left-0 right-0 w-full" style={{ transform: `translate3d(${px * 6}px, ${py * 4}px, 0)` }} viewBox="0 0 390 420" preserveAspectRatio="none">
        <path
          d="M0,240 C60,210 110,230 160,250 C220,275 250,250 310,230 C340,220 365,225 390,235 L390,420 L0,420 Z"
          fill="rgba(15,70,52,0.78)"
        />
        <path
          d="M0,265 C70,250 115,268 165,290 C210,310 260,292 310,275 C345,262 365,270 390,280 L390,420 L0,420 Z"
          fill="rgba(22,96,66,0.70)"
        />
        <path
          d="M0,292 C65,285 125,305 175,330 C215,350 265,338 310,322 C350,308 370,316 390,325 L390,420 L0,420 Z"
          fill="rgba(34,128,80,0.55)"
        />
        <path
          d="M0,240 C60,210 110,230 160,250 C220,275 250,250 310,230 C340,220 365,225 390,235 L390,420 L0,420 Z"
          fill="rgba(255,255,255,0.06)"
        />
        {/* tree silhouettes in foreground */}
        <path
          d="M0,420 L0,338 C16,320 34,326 52,338 C68,308 88,316 104,338 C120,296 144,306 160,338 C176,314 198,320 216,338 C234,304 254,312 270,338 C288,316 306,320 324,338 C342,328 360,332 390,352 L390,420 Z"
          fill="rgba(5,18,14,0.78)"
        />
        <path
          d="M26,420 L26,368 L18,380 L26,356 L34,380 L26,368 Z
             M70,420 L70,360 L62,372 L70,348 L78,372 L70,360 Z
             M118,420 L118,358 L110,370 L118,346 L126,370 L118,358 Z
             M172,420 L172,368 L164,380 L172,356 L180,380 L172,368 Z
             M232,420 L232,362 L224,374 L232,350 L240,374 L232,362 Z
             M300,420 L300,366 L292,378 L300,354 L308,378 L300,366 Z
             M350,420 L350,372 L342,384 L350,360 L358,384 L350,372 Z"
          fill="rgba(8,26,20,0.70)"
        />
        <path
          d="M10,420 L10,388 L4,396 L10,378 L16,396 L10,388 Z
             M44,420 L44,386 L38,394 L44,376 L50,394 L44,386 Z
             M92,420 L92,392 L86,400 L92,382 L98,400 L92,392 Z
             M146,420 L146,388 L140,396 L146,378 L152,396 L146,388 Z
             M206,420 L206,392 L200,400 L206,382 L212,400 L206,392 Z
             M262,420 L262,388 L256,396 L262,378 L268,396 L262,388 Z
             M326,420 L326,392 L320,400 L326,382 L332,400 L326,392 Z
             M378,420 L378,388 L372,396 L378,378 L384,396 L378,388 Z"
          fill="rgba(10,34,26,0.58)"
        />
      </svg>
    </div>
  )
}

function Timer({ seconds }: { seconds: number }) {
  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return <div className="text-5xl font-semibold tracking-tight tabular-nums">{hh}:{mm}:{ss}</div>
}

function ConnectRing({ state, onToggle }: { state: VpnState; onToggle: () => void }) {
  const connected = state === 'connected'
  const connecting = state === 'connecting'
  return (
    <button onClick={onToggle} className="relative mx-auto mt-10 flex h-[230px] w-[230px] items-center justify-center rounded-full" aria-label="toggle">
      <div className="absolute inset-0 rounded-full border border-white/15 bg-black/20" />
      <div className={cn("absolute inset-2 rounded-full border", connected ? "border-accent/70" : "border-white/10")}
           style={{ animation: connected ? 'pulseRing 2.6s ease-in-out infinite' : undefined }} />
      <div className={cn("absolute inset-0 rounded-full", connecting && "ring-1 ring-accent/35 animate-pulse")} />
      <div className="absolute inset-[72px] rounded-2xl border border-accent/55 bg-black/40" />
      <div className="absolute inset-[86px] rounded-xl border border-white/10 bg-white/5" />
      <div className={cn("relative z-10 h-12 w-12 rounded-2xl border", connected ? "border-accent bg-black/25" : "border-white/15 bg-black/20")} />
      <div className={cn("absolute inset-[18px] rounded-full border", connected ? "border-accent/70" : "border-white/10")} />
    </button>
  )
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'connect', label: 'Подключение', icon: <IPower /> },
    { id: 'plans', label: 'Тарифы', icon: <IStar /> },
    { id: 'share', label: 'Поделиться', icon: <IShare /> },
    { id: 'profile', label: 'Профиль', icon: <IUser /> },
  ]
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-bg/85 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-[520px] grid-cols-4 gap-1 px-2 py-2">
        {items.map(i => (
          <button key={i.id} onClick={() => { hapticLight(); setTab(i.id) }}
                  className={cn('rounded-2xl px-2 py-3 text-[11px] active:bg-white/5', tab === i.id ? 'text-accent' : 'text-subtext')}>
            <div className="flex items-center justify-center">{i.icon}</div>
            <div className="mt-1">{i.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const par = useParallax()
  const tg = getTelegram()
  const [tgUser, setTgUser] = useState<any | null>(null)

  // Demo: active devices out of 3 (can be overridden with ?devices=1..3)
  const [deviceCount, setDeviceCount] = useState<number>(() => {
    const p = Number(getParam('devices'))
    const v = Number.isFinite(p) ? Math.max(0, Math.min(3, Math.round(p))) : NaN
    const saved = Number(localStorage.getItem('anonvpn_devices') || NaN)
    const sv = Number.isFinite(saved) ? Math.max(0, Math.min(3, Math.round(saved))) : NaN
    return Number.isFinite(v) ? v : (Number.isFinite(sv) ? sv : 1)
  })
  const [tab, setTab] = useState<Tab>('connect')
  const [locationId, setLocationId] = useState('se')
  const [locSheetOpen, setLocSheetOpen] = useState(false)
  const [sheetY, setSheetY] = useState(0)
  const draggingRef = useRef(false)
  const startYRef = useRef(0)
  const baseYRef = useRef(0)
  const lastYRef = useRef(0)
  const lastTRef = useRef(0)
  const velocityRef = useRef(0)

  const closeSheet = () => { setLocSheetOpen(false); setSheetY(0) }


  const onSheetPointerDown = (e: React.PointerEvent) => {
    if (!locSheetOpen) return
    draggingRef.current = true
    startYRef.current = e.clientY
    baseYRef.current = sheetY
    lastYRef.current = e.clientY
    lastTRef.current = performance.now()
    velocityRef.current = 0
    ;(e.currentTarget as any).setPointerCapture?.(e.pointerId)
  }

  const onSheetPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const now = performance.now()
    const dy = e.clientY - startYRef.current
    const next = Math.max(0, baseYRef.current + dy)
    setSheetY(next)

    const dt = Math.max(8, now - lastTRef.current)
    const vy = (e.clientY - lastYRef.current) / dt
    velocityRef.current = vy
    lastYRef.current = e.clientY
    lastTRef.current = now
  }

  const onSheetPointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const v = velocityRef.current
    // iOS-like: close if pulled enough OR fast swipe down
    if (sheetY > 150 || v > 0.75) {
      closeSheet()
      return
    }
    // snap back
    setSheetY(0)
  }


  
  const [vpnState, setVpnState] = useState<VpnState>((getParam('state') as VpnState) || 'disconnected')
  const [stage, setStage] = useState<number>(0)
  const stageLabel = useMemo(() => {
    if (vpnState === 'connecting') {
      const labels = ['Рукопожатие', 'Маршрутизация', 'Проверка сети', 'Готово']
      return labels[Math.min(stage, labels.length - 1)]
    }
    return ''
  }, [vpnState, stage])

  const [seconds, setSeconds] = useState(() => {
    const s = Number(getParam('seconds'))
    return Number.isFinite(s) && s >= 0 ? Math.floor(s) : 0
  })
  const [toast, setToast] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (vpnState !== 'connecting') { setStage(0); return }
    hapticMedium()
    const t1 = setTimeout(() => setStage(1), 650)
    const t2 = setTimeout(() => setStage(2), 1350)
    const t3 = setTimeout(() => setStage(3), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [vpnState])


  useEffect(() => {
    if (vpnState === 'connected' || vpnState === 'disconnected') {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 600)
      return () => clearTimeout(t)
    }
  }, [vpnState])

  const [remainingDays, setRemainingDays] = useState(() => {
    const d = Number(getParam('days') ?? localStorage.getItem('anonvpn_days') ?? '0')
    return Number.isFinite(d) && d >= 0 ? Math.floor(d) : 0
  })

  useEffect(() => {
    safeExpand()
    try { setTgUser(tg?.initDataUnsafe?.user ?? null) } catch { setTgUser(null) }
  }, [])
  useEffect(() => { try { localStorage.setItem('anonvpn_days', String(remainingDays)) } catch {} }, [remainingDays])
  useEffect(() => {
    if (vpnState !== 'connected') return
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [vpnState])

  const location = useMemo(() => LOCATIONS.find(l => l.id === locationId)!, [locationId])

  function toggle() {
    hapticLight()
    if (vpnState === 'disconnected') {
      setVpnState('connecting')
      setTimeout(() => setVpnState('connected'), 900)
    } else {
      setVpnState('disconnected')
    }
  }

  return (
    <div className="relative min-h-screen bg-bg text-text">
      <SpringBackdrop px={par.x} py={par.y} />

      <div className="relative mx-auto min-h-screen max-w-[520px] px-4 pb-24 pt-4">
        <div className="flex items-start justify-between">
          <Glass className="px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black">
                {vpnState === 'connected' ? 'Стоп' : 'Старт'}
              </div>
              <div className="text-sm text-text/90"><span className="font-semibold">{remainingDays}</span> дней</div>
            </div>
          </Glass>

          <Glass className="px-3 py-3">
            <div className="flex items-center gap-2 text-sm text-subtext">
              {/* swap */}<Icon className="text-subtext"><ISwap /></Icon>
              {/* up-right */}<Icon className="text-subtext"><IArrowUpRight /></Icon>
            </div>
          </Glass>
        </div>

        {tab === 'connect' && (
          <div key="connect" className="animate-fadeIn">
            <div className="mt-12 text-center">
              <div className="mx-auto inline-flex items-center gap-2 text-sm text-subtext">
                <Icon className="text-subtext"><IShield /></Icon>
                Соединение защищено
              </div>

              <div className="mt-6"><Timer seconds={seconds} /></div>

              <div className="mt-4 inline-flex items-center gap-3 text-lg font-semibold">
                <AccentDot state={vpnState} />
                {vpnState === 'connected' ? 'Подключено' : vpnState === 'connecting' ? 'Подключение…' : 'Отключено'}
              </div>
            </div>

            <ConnectRing state={vpnState} onToggle={toggle} />

            <div className="mt-10">
              <button className="w-full text-left" onClick={() => { hapticLight(); hapticLight(); setLocSheetOpen(true) }}>
              <Glass className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <LocationBadge code={location.code} />
                  <div className="flex-1">
                    <div className="text-base font-semibold">{location.name}</div>
                    <div className="mt-1 text-xs text-subtext">Выбранная локация</div>
                  </div>
                  <div className="text-right">
                    <Icon className="text-subtext"><ISignal /></Icon>
                    <div className="text-sm text-subtext">{location.ping} ms</div>
                  </div>
                  <button onClick={() => { hapticLight(); setTab('plans') }}
                          className="ml-2 rounded-2xl glass edge-glow px-3 py-2 text-sm text-text active:bg-white/10">
                    →
                  </button>
                </div>
              </Glass>
            </button>
            </div>
          </div>
        )}

        {tab === 'plans' && (
          <div key="plans" className="mt-6 space-y-4 animate-fadeIn">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-lg font-semibold">Тарифы</div>
                <div className="mt-1 text-sm text-subtext">Оплата в TON через Telegram-бота</div>
              </div>
              <Pill><AccentDot state={vpnState} /> {deviceCount}/3 устройства</Pill>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PLANS.map(p => (
                <button key={p.id} onClick={() => { hapticLight(); setToast('Оплата будет подключена на следующем шаге') }}
                        className="rounded-3xl border border-white/10 bg-white/5 p-4 text-left active:bg-white/10">
                  <div className="text-sm text-subtext">{p.label}</div>
                  <div className="mt-2 text-2xl font-semibold">{p.price} <span className="text-sm font-medium text-subtext">TON</span></div>
                </button>
              ))}
            </div>

            <Glass className="p-4">
              <div className="text-sm font-semibold">Как это будет работать</div>
              <div className="mt-2 text-sm text-subtext leading-relaxed">
                После оплаты бот выдаёт токен и конфиг WireGuard/QR. WebApp показывает статус подписки и устройства (1/3…3/3).
              </div>
            </Glass>
          </div>
        )}

        {tab === 'share' && (
          <div key="share" className="mt-6 space-y-4 animate-fadeIn">
            <Glass className="p-5">
              <div className="text-lg font-semibold">Поделиться</div>
              <div className="mt-2 text-sm text-subtext">Позже добавим реферальную ссылку/промокод.</div>
              <div className="mt-4">
                <button onClick={async () => { hapticLight(); try { await navigator.clipboard.writeText('https://t.me/AnonVPNBot'); setToast('Ссылка скопирована') } catch { setToast('Не удалось скопировать') } }}
                        className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-black active:opacity-90">
                  Скопировать ссылку на бота
                </button>
              </div>
            </Glass>
          </div>
        )}

        {tab === 'profile' && (
          <div key="profile" className="mt-6 space-y-4 animate-fadeIn">
            <Glass className="p-5">
              <div className="text-lg font-semibold">Профиль</div>
              <div className="mt-2 text-sm text-subtext">Токен, подписка, устройства</div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl glass edge-glow p-4">
                  <div className="text-xs text-subtext">Telegram</div>
                  <div className="mt-1 text-sm font-semibold">
                    {tgUser ? `@${tgUser.username ?? tgUser.first_name ?? 'user'}` : 'Не открыт через Telegram'}
                  </div>
                  <div className="mt-1 text-xs text-subtext">
                    {tgUser ? 'initData получен (для backend-авторизации)' : 'Открой WebApp из бота, чтобы получить initData'}
                  </div>
                </div>

                {par.gyroAvailable && par.gyroNeedsPermission && !par.gyroEnabled && (
                  <div className="rounded-2xl glass edge-glow p-4">
                    <div className="text-xs text-subtext">Параллакс</div>
                    <div className="mt-1 text-sm font-semibold">Гироскоп выключен</div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="rounded-2xl glass edge-glow px-4 py-2 text-sm font-semibold"
                        onClick={async () => { hapticLight(); await par.requestGyro() }}
                      >
                        Включить гироскоп
                      </button>
                      <div className="text-xs text-subtext">Нужно разрешение браузера</div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl glass edge-glow p-4">
                  <div className="text-xs text-subtext">Подписка</div>
                  <div className="mt-1 text-sm font-semibold">{remainingDays > 0 ? `Активна • осталось ${remainingDays} дней` : 'Нет активной подписки'}</div>
                </div>

                <div className="rounded-2xl glass edge-glow p-4">
                  <div className="text-xs text-subtext">Токен доступа</div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-semibold">ANON-XXXX-XXXX-XXXX</div>
                    <button onClick={async () => { hapticLight(); try { await navigator.clipboard.writeText('ANON-XXXX-XXXX-XXXX'); setToast('Токен скопирован') } catch { setToast('Не удалось скопировать') } }}
                            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-subtext active:bg-white/10">
                      Copy
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl glass edge-glow p-4">
                  <div className="text-xs text-subtext">Локация</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LOCATIONS.map(l => (
                      <button key={l.id} onClick={() => { hapticLight(); setLocationId(l.id) }}
                              className={cn('rounded-2xl border px-3 py-2 text-sm',
                                l.id === locationId ? 'border-accent/50 bg-accent/10 text-text' : 'border-white/10 bg-white/5 text-subtext')}>
                        {/* no emoji */}<span className="mr-2 opacity-90">{l.code}</span>{l.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Glass>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed left-0 right-0 top-4 z-50 px-4">
          <div className="mx-auto max-w-[520px]">
            <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-text backdrop-blur shadow-soft">
              {toast}
            </div>
          </div>
        </div>
      )}


      {locSheetOpen && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fadeIn"
            onClick={() => setLocSheetOpen(false)}
          />
          <div className="absolute left-0 right-0 bottom-0 mx-auto w-full max-w-[520px] px-4 pb-4">
            <div className="sheet card-glass animate-sheetUp rounded-3xl border border-white/10 bg-black/55 backdrop-blur-xl">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-base font-semibold">Выбор локации</div>
                  <div className="mt-0.5 text-xs text-subtext">Свайп вниз или тап по фону — закрыть</div>
                </div>
                <button
                  className="grid h-10 w-10 place-items-center rounded-2xl glass edge-glow"
                  onClick={() => { hapticLight(); setLocSheetOpen(false) }}
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>

              <div className="px-3 pb-3">
                {LOCATIONS.map((l) => (
                  <button
                    key={l.id}
                    className={cn(
                      'w-full text-left rounded-2xl glass edge-glow px-4 py-3 mb-2',
                      l.id === locationId && 'border-white/20 bg-white/8'
                    )}
                    onClick={() => {
                      hapticLight()
                      setLocationId(l.id)
                      setLocSheetOpen(false)
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <LocationBadge code={l.code} />
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{l.name}</div>
                        <div className="mt-0.5 text-xs text-subtext">Пинг: {l.ping} ms</div>
                      </div>
                      <div className={cn('text-xs font-semibold', l.id === locationId ? 'text-accent' : 'text-subtext')}>
                        {l.id === locationId ? 'Выбрано' : 'Выбрать'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="px-5 pb-5 text-xs text-subtext">
                Позже здесь добавим регионы и автоподбор по пингу.
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Location bottom sheet */}
      <div className={cn('sheet-backdrop', locSheetOpen && 'open')} onClick={closeSheet} />
      <div
        className="sheet-panel"
        style={{
          transform: locSheetOpen
            ? `translateX(-50%) translateY(${Math.min(sheetY, 520)}px)`
            : `translateX(-50%) translateY(105%)`,
          transition: draggingRef.current ? 'none' : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4"
          onPointerDown={onSheetPointerDown}
          onPointerMove={onSheetPointerMove}
          onPointerUp={onSheetPointerUp}
          onPointerCancel={onSheetPointerUp}
        >
          <div className="sheet-handle" />
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Локации</div>
            <button
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-text hover:bg-white/7"
              onClick={closeSheet}
            >
              Закрыть
            </button>
          </div>
        </div>

        <div className="max-h-[62vh] overflow-auto px-4 pb-6 pt-2">
          <div className="grid gap-2">
            {LOCATIONS.map((l) => {
              const selected = l.id === locationId
              return (
                <button
                  key={l.id}
                  className={cn(
                    'relative flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-200',
                    selected
                      ? 'border-accent/55 bg-accent/12 shadow-[0_18px_55px_rgba(230,196,106,0.10)]'
                      : 'border-white/10 bg-white/3 hover:bg-white/5'
                  )}
                  onClick={() => {
                    hapticSelection()
                    setLocationId(l.id)
                    setTimeout(() => closeSheet(), 120)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'grid h-10 w-10 place-items-center rounded-xl border bg-black/20 text-sm uppercase transition-all duration-200',
                        selected ? 'border-accent/50 text-text' : 'border-white/10 text-subtext'
                      )}
                    >
                      {l.code}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{l.name}</div>
                      <div className="text-xs text-subtext">{l.desc}</div>
                    </div>
                  </div>
                  <div className="text-xs text-subtext">{l.ping ? `${l.ping} ms` : '—'}</div>

                  {selected && (
                    <>
                      <div className="row-sweep" />
                      <div
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{
                        boxShadow: 'inset 0 0 0 1px rgba(230,196,106,0.18)',
                        background:
                          'radial-gradient(circle at 30% 40%, rgba(230,196,106,0.10), rgba(230,196,106,0.0) 60%)',
                        opacity: 0.95,
                      }}
                    />
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>


      <BottomNav tab={tab} setTab={setTab} />
    </div>
  )
}
