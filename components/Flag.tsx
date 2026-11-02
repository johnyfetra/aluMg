// Drapeaux dessinés en SVG : les émojis-drapeaux ne s'affichent pas partout (Windows n'en a pas).
const FLAGS = {
  fr: <><rect width="10" height="21" fill="#1d3f8f" /><rect x="10" width="10" height="21" fill="#fff" /><rect x="20" width="10" height="21" fill="#e1262e" /></>,
  mg: <><rect width="30" height="21" fill="#fff" /><rect x="10" width="20" height="10.5" fill="#fc3d32" /><rect x="10" y="10.5" width="20" height="10.5" fill="#007e3a" /></>,
  en: <><rect width="30" height="21" fill="#1d3f8f" /><path d="M0 0L30 21M30 0L0 21" stroke="#fff" strokeWidth="4.2" /><path d="M0 0L30 21M30 0L0 21" stroke="#d3202f" strokeWidth="1.4" /><path d="M15 0v21M0 10.5h30" stroke="#fff" strokeWidth="7" /><path d="M15 0v21M0 10.5h30" stroke="#d3202f" strokeWidth="4.2" /></>,
} as const;

export default function Flag({ code, size = 22 }: { code: keyof typeof FLAGS; size?: number }) {
  return (
    <span aria-hidden className="inline-block shrink-0 overflow-hidden rounded-[4px] shadow-[0_0_0_1px_rgb(0_0_0/0.2)]" style={{ width: size, height: Math.round((size * 21) / 30) }}>
      <svg viewBox="0 0 30 21" width="100%" height="100%" preserveAspectRatio="none" className="block">{FLAGS[code]}</svg>
    </span>
  );
}
