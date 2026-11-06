/** Mix `fg` toward `bg` (both #RRGGBB) — poor man's alpha compositing. Pure (no react-native import). */
export function mixHex(fg: string, bg: string, t: number): string {
  const f = [1, 3, 5].map((i) => parseInt(fg.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
  const mixed = f.map((c, i) => Math.round(c * t + b[i]! * (1 - t)));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
