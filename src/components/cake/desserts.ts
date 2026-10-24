// Shapes and toppings of the Today desserts, ported from design/mockups/Main.dc.html
// (geom(), sideBg(), topBg() and the deco section). Only the cake uses gradients and shadows.
import { mix } from '@/styles/palette'
import type { CakeSegment } from './layers'

export const DESSERT_IDS = [
  'classic',
  'crepe',
  'cupcake',
  'sundae',
  'pudding',
  'pancake',
  'tier',
  'tiramisu',
  'tart',
  'roll',
] as const
export type DessertId = (typeof DESSERT_IDS)[number]

/** Default dessert per weekday, Monday first (settings.cakes_by_weekday). */
export const DEFAULT_WEEK: DessertId[] = [
  'classic',
  'crepe',
  'cupcake',
  'sundae',
  'pudding',
  'pancake',
  'tier',
]

/** Height budget for the layers; layers.ts divides it among the day's tasks. */
export const DESSERT_HEIGHT: Record<DessertId, number> = {
  classic: 120,
  crepe: 120,
  cupcake: 110,
  sundae: 108,
  pudding: 120,
  pancake: 96,
  tier: 120,
  tiramisu: 112,
  tart: 84,
  roll: 112,
}

export function isDessertId(value: unknown): value is DessertId {
  return typeof value === 'string' && (DESSERT_IDS as readonly string[]).includes(value)
}

export interface CakeLayerView {
  key: string
  style: string
  cream: string
}

export interface CakeView {
  /** Top layer first (DOM order); the bottom layer sits on the plate. */
  layers: CakeLayerView[]
  deco: string[]
  base: string[]
  plate: string
  decoBox: string
  cylinder: boolean
}

const INK = '#3D3A36'
const PLATE =
  'radial-gradient(ellipse at 50% 38%, #FFFFFF 0%, #F3EEE5 52%, #DCD2C2 100%); box-shadow: 0 10px 16px rgba(61,58,54,0.14)'

function sideBg(c: string) {
  const d = mix(c, INK, 0.2)
  const l = mix(c, '#FFFFFF', 0.3)
  return `linear-gradient(90deg, ${d} 0%, ${c} 16%, ${l} 36%, ${c} 62%, ${d} 100%)`
}

function topBg(c: string) {
  return `radial-gradient(ellipse at 45% 40%, ${mix(c, '#FFFFFF', 0.55)} 0%, ${mix(c, '#FFFFFF', 0.3)} 60%, ${c} 100%)`
}

function ballBg(c: string) {
  return `radial-gradient(ellipse at 38% 28%, ${mix(c, '#FFFFFF', 0.55)} 0%, ${c} 50%, ${mix(c, INK, 0.22)} 100%)`
}

interface Geom {
  w: number
  ry: number
  shift?: number
}

const CYLINDERS: DessertId[] = [
  'classic',
  'crepe',
  'pudding',
  'pancake',
  'tier',
  'tiramisu',
  'tart',
  'roll',
]

function geom(id: DessertId, k: number, span: number): Geom {
  switch (id) {
    case 'cupcake':
      return { w: Math.round(196 - k * (106 / span)), ry: 0 }
    case 'sundae':
      return { w: 132 - k * 3, ry: 0, shift: k % 2 ? 6 : -6 }
    case 'pudding': {
      const w = 206 - k * 11
      return { w, ry: Math.round(w * 0.08) }
    }
    case 'pancake':
      return { w: 212, ry: 10, shift: k % 2 ? 5 : -5 }
    case 'tier': {
      const w = 236 - k * 21
      return { w, ry: Math.round(w * 0.075) }
    }
    case 'classic':
      return { w: 190, ry: 14 }
    case 'roll':
      return { w: 200, ry: 14 }
    case 'tart':
      return { w: 232, ry: 16 }
    default:
      return { w: 228, ry: 16 }
  }
}

function plateWidth(id: DessertId) {
  if (id === 'cupcake') return 210
  if (id === 'sundae') return 170
  if (id === 'classic' || id === 'roll') return 236
  return 276
}

// --- toppings (absolutely positioned inside a 240px-wide box above the top layer) ---

const a = (st: string) => `position: absolute; ${st}`

function sph(
  x: number,
  b: number,
  sz: number,
  base: string,
  light: string,
  dark: string,
  extra = '',
) {
  return a(
    `left: ${x}px; bottom: ${b}px; width: ${sz}px; height: ${sz}px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, ${light} 0%, ${base} 48%, ${dark} 100%); box-shadow: 0 2px 2px rgba(61,58,54,0.12)${extra}`,
  )
}
const berry = (x: number, b: number, sz: number) =>
  sph(
    x,
    b,
    sz,
    '#E79A9A',
    '#FADADA',
    '#BF6E6E',
    '; border-radius: 50% 50% 46% 46% / 56% 56% 44% 44%',
  )
const dollop = (x: number, b: number, sz: number) => sph(x, b, sz, '#FFF8EE', '#FFFFFF', '#E3D7C3')
const cherry = (x: number, b: number, sz: number) => [
  a(
    `left: ${x + sz / 2}px; bottom: ${b + sz - 4}px; width: 3px; height: 12px; border-radius: 2px; background: #7FA67F; transform: rotate(18deg); transform-origin: bottom`,
  ),
  sph(x, b, sz, '#D97C7C', '#F4C2C2', '#AF5757'),
]
const candle = (x: number, b: number, fill: string, deep: string, delay: number) => [
  a(
    `left: ${x}px; bottom: ${b}px; width: 9px; height: 30px; border-radius: 3px; background: linear-gradient(90deg, ${deep}, ${fill} 40%, #FFFFFF 55%, ${fill} 70%, ${deep})`,
  ),
  a(
    `left: ${x - 2}px; bottom: ${b + 29}px; width: 13px; height: 18px; border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%; background: radial-gradient(circle at 50% 72%, #FFF6D1 0%, #F5C26B 55%, #E49B45 100%); box-shadow: 0 0 10px rgba(245,194,107,0.6); animation: cake-flicker 900ms ease-in-out ${delay}ms infinite`,
  ),
]
const sprinkle = (x: number, b: number, color: string, deg: number) =>
  a(
    `left: ${x}px; bottom: ${b}px; width: 4px; height: 10px; border-radius: 2px; background: ${color}; transform: rotate(${deg}deg)`,
  )
const drip = (x: number, b: number, h: number, dark: string, light: string) =>
  a(
    `left: ${x}px; bottom: ${b}px; width: 11px; height: ${h}px; border-radius: 6px; background: linear-gradient(90deg, ${dark}, ${light}, ${dark})`,
  )

function ring(
  count: number,
  rx: number,
  ry: number,
  sz: number,
  maker: (x: number, b: number, sz: number) => string,
) {
  const pts = Array.from({ length: count }, (_, i) => {
    const ang = (i / count) * Math.PI * 2
    return { x: Math.round(120 + rx * Math.cos(ang) - sz / 2), b: Math.round(-ry * Math.sin(ang)) }
  })
  pts.sort((p, q) => q.b - p.b)
  return pts.map((p) => maker(p.x, p.b, sz))
}

function decorate(id: DessertId, topG: Geom, ryTop: number): string[] {
  const cap = (w: number, c0: string, c1: string, c2: string) => {
    const x = Math.round((240 - w) / 2)
    return a(
      `left: ${x}px; bottom: ${-ryTop - 2}px; width: ${w}px; height: ${2 * ryTop + 4}px; border-radius: 50%; background: radial-gradient(ellipse at 48% 40%, ${c0} 0%, ${c1} 58%, ${c2} 100%)`,
    )
  }
  const crumb = (x: number, b: number, sz: number) => sph(x, b, sz, '#FFFFFF', '#FFFFFF', '#EDE6DA')

  switch (id) {
    case 'classic': {
      const rim = ring(12, 86, ryTop - 3, 16, dollop)
      return [
        cap(194, '#FFFFFF', '#FFF8EE', '#E8DCC8'),
        ...rim.slice(0, 6),
        ...candle(96, 4, '#E8E0F3', '#A891CC', 0),
        ...candle(116, 8, '#DCE8F5', '#7FA3CF', 200),
        ...candle(136, 4, '#DDEBDD', '#8DB58F', 400),
        berry(70, -2, 20),
        berry(150, -2, 20),
        berry(109, -10, 22),
        ...rim.slice(6),
      ]
    }
    case 'crepe':
      return [
        cap(228, '#F0D4A6', '#DDB27A', '#C08A4E'),
        crumb(60, 0, 4),
        crumb(84, -6, 3),
        crumb(160, 2, 4),
        crumb(178, -8, 3),
        a(
          'left: 128px; bottom: 14px; width: 24px; height: 11px; border-radius: 50%; background: linear-gradient(160deg, #B5D6B2, #7FA67F); transform: rotate(-25deg)',
        ),
        a(
          'left: 130px; bottom: 24px; width: 20px; height: 10px; border-radius: 50%; background: linear-gradient(160deg, #A9CFA6, #6F9A70); transform: rotate(22deg)',
        ),
        berry(100, -2, 30),
      ]
    case 'cupcake':
      return [
        sprinkle(80, -2, '#A891CC', 30),
        sprinkle(154, 0, '#7FA3CF', -40),
        sprinkle(98, 6, '#D9BC6E', 70),
        sprinkle(138, 8, '#8DB58F', 10),
        ...cherry(108, 0, 24),
      ]
    case 'sundae':
      return [
        a(
          'left: 146px; bottom: 2px; width: 10px; height: 40px; border-radius: 3px; background: repeating-linear-gradient(to bottom, #E9C99A 0 6px, #D7AE74 6px 8px); transform: rotate(18deg); transform-origin: bottom; box-shadow: 1px 1px 2px rgba(61,58,54,0.15)',
        ),
        dollop(96, -8, 48),
        dollop(104, 12, 32),
        dollop(111, 25, 18),
        sprinkle(98, 2, '#A891CC', 30),
        sprinkle(134, 6, '#7FA3CF', -40),
        sprinkle(112, 18, '#D9BC6E', 70),
        ...cherry(112, 36, 16),
      ]
    case 'pudding': {
      const pw = topG.w + 4
      const px = Math.round((240 - pw) / 2)
      return [
        cap(pw, '#E2AE72', '#C98A4B', '#9F6430'),
        drip(px + 14, -ryTop - 18, 20, '#A86E34', '#CF9555'),
        drip(px + Math.round(pw / 2) - 6, -ryTop - 24, 26, '#A86E34', '#CF9555'),
        drip(px + pw - 26, -ryTop - 14, 16, '#A86E34', '#CF9555'),
        dollop(100, 0, 40),
        ...cherry(110, 28, 20),
      ]
    }
    case 'pancake':
      return [
        cap(214, '#E8BC78', '#D49A4E', '#B07530'),
        drip(34, -ryTop - 22, 22, '#B07530', '#DCA35A'),
        drip(124, -ryTop - 28, 28, '#B07530', '#DCA35A'),
        drip(194, -ryTop - 16, 16, '#B07530', '#DCA35A'),
        a(
          'left: 102px; bottom: 0; width: 36px; height: 12px; background: #E9CF7C; transform: skewX(-20deg)',
        ),
        a(
          'left: 102px; bottom: 10px; width: 36px; height: 12px; background: #FBEDBA; transform: skewX(-20deg)',
        ),
        berry(54, -4, 18),
        berry(168, -4, 18),
      ]
    case 'tiramisu': {
      const cocoa = (x: number, b: number) => sph(x, b, 5, '#7A5444', '#A97C5E', '#5A3B2F')
      return [
        cap(232, '#B98A6A', '#9A6B4E', '#7A5444'),
        cocoa(62, -4),
        cocoa(92, 4),
        cocoa(150, -6),
        cocoa(176, 2),
        dollop(78, -6, 26),
        dollop(136, -6, 26),
        dollop(106, 0, 30),
        sph(114, 22, 14, '#7A5444', '#B98A6A', '#4A3026'),
      ]
    }
    case 'tart':
      return [
        cap(236, '#FFFFFF', '#FFF8EE', '#E8DCC8'),
        ...ring(7, 84, ryTop - 4, 24, berry),
        a(
          'left: 108px; bottom: 6px; width: 22px; height: 10px; border-radius: 50%; background: linear-gradient(160deg, #B5D6B2, #7FA67F); transform: rotate(-25deg)',
        ),
      ]
    case 'roll':
      return [
        cap(204, '#FFFFFF', '#FFF8EE', '#E8DCC8'),
        ...ring(8, 74, ryTop - 3, 18, dollop).slice(0, 4),
        berry(84, 0, 22),
        berry(134, 0, 22),
        a(
          'left: 108px; bottom: 12px; width: 26px; height: 12px; border-radius: 50%; background: linear-gradient(160deg, #B5D6B2, #7FA67F); transform: rotate(-20deg)',
        ),
        ...ring(8, 74, ryTop - 3, 18, dollop).slice(4),
      ]
    default: {
      // tier
      const rim = ring(6, Math.round(topG.w / 2) - 8, ryTop - 2, 12, dollop)
      const rose = (x: number, b: number) => sph(x, b, 18, '#F5DADA', '#FFFFFF', '#D99A9A')
      return [
        ...rim.slice(0, 3),
        ...candle(76, 2, '#DDEBDD', '#8DB58F', 0),
        ...candle(156, 2, '#E8E0F3', '#A891CC', 300),
        rose(103, 6),
        rose(119, 6),
        rose(98, 18),
        rose(124, 18),
        rose(111, 27),
        sph(113, 15, 14, '#F2D78A', '#FFF6D6', '#CDAA4C'),
        ...rim.slice(3),
      ]
    }
  }
}

function baseParts(id: DessertId): string[] {
  if (id === 'cupcake') {
    return [
      'position: relative; z-index: 0; width: 164px; height: 50px; margin-top: -10px; clip-path: polygon(0 0, 100% 0, 88% 100%, 12% 100%); background: linear-gradient(90deg, rgba(61,58,54,0.16) 0%, rgba(61,58,54,0) 24%, rgba(255,255,255,0.35) 42%, rgba(255,255,255,0) 58%, rgba(61,58,54,0.18) 100%), repeating-linear-gradient(90deg, #F3D9C4 0 10px, #E5BF9F 10px 14px)',
    ]
  }
  if (id === 'sundae') {
    return [
      'position: relative; z-index: 20; width: 156px; height: 56px; margin-top: -40px; border-radius: 6px 6px 50% 50% / 6px 6px 100% 100%; background: linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.55) 20%, rgba(255,255,255,0.12) 34%, rgba(255,255,255,0.1) 80%, rgba(255,255,255,0.4) 92%, rgba(255,255,255,0.15) 100%); border: 2px solid rgba(190,205,215,0.9); border-top: 4px solid rgba(210,222,230,0.95); box-sizing: border-box; box-shadow: inset 0 -6px 10px rgba(160,180,195,0.25)',
      'position: relative; z-index: 20; width: 14px; height: 22px; margin-top: -2px; background: linear-gradient(90deg, #C7D4DD, #F4F8FA 45%, #C7D4DD)',
      'position: relative; z-index: 20; width: 96px; height: 14px; margin-top: -2px; border-radius: 50%; background: radial-gradient(ellipse at 45% 35%, #FFFFFF, #DCE5EB 70%, #C2CFD8)',
    ]
  }
  if (id === 'tart') {
    // shortcrust shell in front of the bottom of the filling, with a fluted rim
    return [
      'position: relative; z-index: 30; width: 246px; height: 42px; margin-top: -34px; border-radius: 10px 10px 50% 50% / 10px 10px 18px 18px; background: repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 7px, rgba(61,58,54,0.06) 7px 12px), linear-gradient(90deg, #C99558 0%, #E8C08A 22%, #F2D4A4 40%, #E8C08A 62%, #C99558 100%); border-top: 4px solid #F2D4A4',
    ]
  }
  return []
}

/** Everything Cake.vue needs to draw `dessert` with these layers. */
export function buildCake(id: DessertId, segments: CakeSegment[], allDone: boolean): CakeView {
  const S = segments.length
  const span = S > 1 ? S - 1 : 1
  const cylinder = CYLINDERS.includes(id)
  const layers: CakeLayerView[] = []

  for (let k = S - 1; k >= 0; k--) {
    const g = geom(id, k, span)
    const seg = segments[k]!
    const first = k === S - 1
    const key = `${k}-${seg.color ?? 'ghost'}-${seg.count}`
    const anim = seg.isNew ? '; animation: cake-drop 520ms cubic-bezier(.2,.8,.3,1.2)' : ''
    let style: string
    let cream = 'display: none'

    if (cylinder) {
      style = `position: relative; z-index: ${k + 1}; box-sizing: border-box; width: ${g.w}px; height: ${seg.height + 2 * g.ry}px; margin-top: ${first ? 0 : -2 * g.ry}px; border-radius: 50% / ${g.ry}px${g.shift ? `; left: ${g.shift}px` : ''}`
      if (seg.color) {
        let bg = sideBg(seg.color)
        if (id === 'crepe')
          bg = `repeating-linear-gradient(to bottom, transparent 0 6px, rgba(255,248,238,0.9) 6px 8px), ${bg}`
        if (id === 'tiramisu')
          bg = `linear-gradient(to bottom, transparent 0 60%, rgba(122,84,68,0.35) 60% 70%, transparent 70%), ${bg}`
        const rim =
          id === 'pancake'
            ? '; border-bottom: 4px solid #D9A86B'
            : id === 'pudding'
              ? ''
              : '; border-bottom: 4px solid #FFF8EE'
        style += `; background: ${bg}${rim}; box-shadow: 0 2px 0 rgba(61,58,54,0.05)${anim}`
        cream = `position: absolute; top: 0; left: 0; width: 100%; height: ${2 * g.ry}px; border-radius: 50%; background: ${topBg(seg.color)}; box-shadow: inset 0 -2px 0 rgba(61,58,54,0.05)`
      } else {
        style += '; border: 2px dashed #DDD5C8'
      }
    } else {
      const extra = id === 'cupcake' ? 12 : 16
      const overlap = id === 'cupcake' ? -12 : -14
      const radius = id === 'sundae' ? '50% 50% 46% 46% / 58% 58% 42% 42%' : '50%'
      style = `position: relative; z-index: ${k + 1}; box-sizing: border-box; width: ${g.w}px; height: ${seg.height + extra}px; margin-top: ${first ? 0 : overlap}px; border-radius: ${radius}${g.shift ? `; left: ${g.shift}px` : ''}`
      if (seg.color) {
        style += `; background: ${ballBg(seg.color)}; box-shadow: 0 3px 4px rgba(61,58,54,0.08)${anim}`
        cream =
          'position: absolute; top: 18%; left: 24%; width: 24%; height: 18%; border-radius: 50%; background: rgba(255,255,255,0.55)'
      } else {
        style += '; border: 2px dashed #DDD5C8'
      }
    }
    layers.push({ key, style, cream })
  }

  const topG = geom(id, Math.max(S - 1, 0), span)
  const botG = geom(id, 0, span)
  const ryTop = cylinder ? topG.ry : 6
  const plateRy = cylinder ? botG.ry : 8

  return {
    layers,
    deco: allDone && S > 0 ? decorate(id, topG, ryTop) : [],
    base: baseParts(id),
    plate: `position: relative; z-index: 0; width: ${plateWidth(id)}px; height: ${2 * plateRy + 16}px; margin-top: ${-(plateRy + 10)}px; border-radius: 50%; background: ${PLATE}`,
    decoBox: `position: relative; z-index: 50; width: 240px; height: 64px; margin-bottom: ${-ryTop - (cylinder ? 0 : 4)}px; animation: cake-fadein 500ms ease-out`,
    cylinder,
  }
}

/**
 * 每週隨機換甜點: seven different desserts for the week starting on `monday`, picked from all
 * ten. The same week always gets the same pick, on every device.
 */
export function weeklyDesserts(monday: string): DessertId[] {
  // mulberry32, seeded from the date
  let seed = [...monday].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261)
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
  const pool: DessertId[] = [...DESSERT_IDS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return pool.slice(0, 7)
}
