// Generates the app icon: a white to-do card whose check boxes are little scalloped cookies
// in the task category colors (tokens.css), with an optional strawberry.
// Usage: node scripts/make-icon.mjs <out.svg> [--no-berry] [--maskable]
//   --maskable shrinks the artwork into the Android safe zone. PNG sizes are rendered from the SVG.
import { writeFileSync } from 'node:fs'

const [out, ...flags] = process.argv.slice(2)
const strawberry = !flags.includes('--no-berry')
const maskable = flags.includes('--maskable')

const BG = '#F1ECE4'
const CARD = '#FFFFFF'

const roundRect = ({ x, y, w, h, r }, attrs) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${attrs}/>`

// A square cookie with a scalloped edge, `size` across including the scallops:
// four evenly spaced round bumps per side, like a biscuit cutter.
function cookie(x, y, size, fill) {
  const perSide = 4
  const spacing = size / (perSide - 1 + 1.2)
  const bump = spacing * 0.6
  const start = x + bump, top = y + bump, side = spacing * (perSide - 1)
  const pts = []
  for (let i = 0; i < perSide - 1; i++) {
    const d = i * spacing
    pts.push([start + d, top], [start + side, top + d], [start + side - d, top + side], [start, top + side - d])
  }
  const scallops = pts
    .map(([px, py]) => `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${bump.toFixed(1)}" fill="${fill}"/>`)
    .join('')
  return scallops + `<rect x="${start}" y="${top}" width="${side}" height="${side}" fill="${fill}"/>`
}

const card = { x: 212, y: 192, w: 600, h: 640, r: 104 }
const box = 128, x = 296, barX = 470
const rows = [
  { y: 288, deep: '#7FA3CF', bar: '#BCCDE6', w: 250, done: true },
  { y: 458, deep: '#A891CC', bar: '#D5C8EA', w: 200, done: true },
  { y: 628, deep: '#8DB58F', bar: '#C6DBB6', w: 230, done: false },
]
const row = (r) => {
  let check = cookie(x, r.y, box, r.deep)
  if (r.done) {
    check += `<path d="M${x + 36} ${r.y + 66}l27 27 34-48" fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`
  } else {
    const inset = 34
    check += roundRect(
      { x: x + inset, y: r.y + inset, w: box - 2 * inset, h: box - 2 * inset, r: 14 },
      `fill="${CARD}"`,
    )
  }
  return `${check}<rect x="${barX}" y="${r.y + 40}" width="${r.w}" height="48" rx="24" fill="${r.bar}"/>`
}

const berrySvg = strawberry
  ? `<g transform="translate(772 236) rotate(18) scale(1.6)">
      <path d="M0 -34 C28 -34 42 -18 38 6 C34 28 14 44 0 48 C-14 44 -34 28 -38 6 C-42 -18 -28 -34 0 -34 Z" fill="#DE9C9C"/>
      <g fill="#FFF8EE"><ellipse cx="-14" cy="-2" rx="3" ry="4.5"/><ellipse cx="13" cy="-6" rx="3" ry="4.5"/><ellipse cx="-2" cy="16" rx="3" ry="4.5"/><ellipse cx="18" cy="18" rx="3" ry="4.5"/><ellipse cx="-20" cy="20" rx="3" ry="4.5"/><ellipse cx="2" cy="34" rx="3" ry="4.5"/></g>
      <path d="M0 -32 L-24 -46 L-10 -34 L-20 -24 L0 -30 L20 -24 L10 -34 L24 -46 Z" fill="#8DB58F" stroke="#8DB58F" stroke-width="4" stroke-linejoin="round"/>
      <rect x="-3" y="-58" width="6" height="20" rx="3" fill="#8DB58F"/>
    </g>`
  : ''

const art = `${roundRect(card, `fill="${CARD}"`)}
${rows.map(row).join('\n')}
${berrySvg}`

writeFileSync(
  out,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<rect width="1024" height="1024" fill="${BG}"/>
${maskable ? `<g transform="translate(512 512) scale(0.8) translate(-512 -512)">${art}</g>` : art}
</svg>
`,
)
