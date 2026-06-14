// Pixel-accurate tracing helpers: extract a binary mask from the source
// logo, walk it with marching squares to get contour polylines, then
// simplify + smooth into an SVG path. Used to faithfully reproduce the
// original CloseEye icon mark rather than redrawing it from scratch.

import sharp from 'sharp'

// Load a region of `file` as a grayscale "foreground" mask.
// Returns { data: Float32Array (0..1), width, height } where 1 = foreground.
export async function loadMask(file, { left, top, width, height, threshold = 0.25 }) {
  const { data } = await sharp(file)
    .extract({ left, top, width, height })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const out = new Float32Array(width * height)
  for (let i = 0; i < out.length; i++) {
    out[i] = data[i] / 255 >= threshold ? 1 : 0
  }
  return { data: out, width, height }
}

// Marching squares over a binary grid, producing one polyline per grid
// edge crossing. We then stitch edges into closed contours.
export function marchingSquares({ data, width, height }) {
  const at = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0
    return data[y * width + x]
  }

  const segments = []
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const tl = at(x, y), tr = at(x + 1, y), bl = at(x, y + 1), br = at(x + 1, y + 1)
      const idx = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0)
      if (idx === 0 || idx === 15) continue

      // Midpoints of the 4 cell edges
      const top = [x + 0.5, y]
      const right = [x + 1, y + 0.5]
      const bottom = [x + 0.5, y + 1]
      const left = [x, y + 0.5]

      // Each case lists pairs of edge-midpoints forming line segment(s).
      // Saddle cases (5, 10) are split using the average corner value.
      const cases = {
        1: [[left, bottom]],
        2: [[bottom, right]],
        3: [[left, right]],
        4: [[top, right]],
        5: [[left, top], [bottom, right]],
        6: [[top, bottom]],
        7: [[left, top]],
        8: [[top, left]],
        9: [[top, bottom]],
        10: [[top, right], [left, bottom]],
        11: [[top, right]],
        12: [[right, left]],
        13: [[bottom, right]],
        14: [[left, bottom]],
      }
      for (const seg of cases[idx] || []) segments.push(seg)
    }
  }

  // Stitch segments into closed polylines by matching endpoints.
  const key = (p) => `${p[0]},${p[1]}`
  const adj = new Map()
  for (const [a, b] of segments) {
    ;(adj.get(key(a)) ?? adj.set(key(a), []).get(key(a))).push({ a, b })
    ;(adj.get(key(b)) ?? adj.set(key(b), []).get(key(b))).push({ a: b, b: a })
  }

  const used = new Set()
  const contours = []
  for (const [, edges] of adj) {
    for (const e of edges) {
      const id = `${key(e.a)}->${key(e.b)}`
      if (used.has(id)) continue
      // walk
      const path = [e.a, e.b]
      used.add(id)
      used.add(`${key(e.b)}->${key(e.a)}`)
      let current = e.b
      let guard = 0
      while (guard++ < 100000) {
        const opts = adj.get(key(current)) || []
        const next = opts.find((o) => !used.has(`${key(o.a)}->${key(o.b)}`))
        if (!next) break
        used.add(`${key(next.a)}->${key(next.b)}`)
        used.add(`${key(next.b)}->${key(next.a)}`)
        current = next.b
        path.push(current)
        if (key(current) === key(path[0])) break
      }
      if (path.length > 3) contours.push(path)
    }
  }
  return contours
}

function signedArea(pts) {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

export function contourArea(pts) {
  return Math.abs(signedArea(pts))
}

export function contourWinding(pts) {
  return signedArea(pts) >= 0 ? 'ccw' : 'cw'
}

// Ramer-Douglas-Peucker simplification.
export function simplify(points, epsilon) {
  if (points.length < 3) return points
  const dmax = { dist: 0, idx: 0 }
  const [x1, y1] = points[0]
  const [x2, y2] = points[points.length - 1]
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i]
    const num = Math.abs((x2 - x1) * (y - y1) - (x - x1) * (y2 - y1))
    const den = Math.hypot(x2 - x1, y2 - y1) || 1
    const dist = num / den
    if (dist > dmax.dist) { dmax.dist = dist; dmax.idx = i }
  }
  if (dmax.dist > epsilon) {
    const left = simplify(points.slice(0, dmax.idx + 1), epsilon)
    const right = simplify(points.slice(dmax.idx), epsilon)
    return left.slice(0, -1).concat(right)
  }
  return [points[0], points[points.length - 1]]
}

// RDP simplification for a CLOSED contour. The plain `simplify()` collapses
// closed loops to 2 points because its start/end anchor is the same point
// (zero-length baseline => zero deviation everywhere). Here we pick the point
// farthest from the start as a second anchor, split the loop into two open
// polylines across those anchors, simplify each independently, then rejoin.
export function simplifyClosed(points, epsilon) {
  // Drop the duplicate closing point (marching squares repeats the start).
  const pts = (points.length > 1 &&
    points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1])
    ? points.slice(0, -1)
    : points.slice()

  if (pts.length < 4) return pts

  let m = 1, best = -1
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1])
    if (d > best) { best = d; m = i }
  }

  const segA = simplify(pts.slice(0, m + 1), epsilon) // pts[0] ... pts[m]
  const segB = simplify(pts.slice(m).concat([pts[0]]), epsilon) // pts[m] ... pts[0]

  return segA.slice(0, -1).concat(segB.slice(0, -1))
}

// Build a smooth closed SVG path (cubic Beziers via Catmull-Rom) through
// a simplified, closed point list.
export function smoothClosedPath(points, { decimals = 2 } = {}) {
  const n = points.length
  const p = (i) => points[((i % n) + n) % n]
  const f = (v) => Number(v.toFixed(decimals))
  let d = `M ${f(points[0][0])} ${f(points[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2)
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + ' Z'
}
