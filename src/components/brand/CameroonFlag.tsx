type Props = { className?: string; size?: number };

/**
 * Drapeau du Cameroun — 3 bandes VERTICALES vert/rouge/jaune + étoile jaune centrée.
 * SVG inline, accessible.
 */
export function CameroonFlag({ className, size = 20 }: Props) {
  const h = Math.round((size * 2) / 3);
  return (
    <svg
      role="img"
      aria-label="Drapeau du Cameroun"
      width={size}
      height={h}
      viewBox="0 0 30 20"
      className={className}
      style={{ borderRadius: 2, overflow: "hidden" }}
    >
      <rect x="0"  y="0" width="10" height="20" fill="#007A5E" />
      <rect x="10" y="0" width="10" height="20" fill="#CE1126" />
      <rect x="20" y="0" width="10" height="20" fill="#FCD116" />
      {/* Étoile jaune centrée */}
      <polygon
        points="15,6 16.18,9.12 19.5,9.27 16.95,11.38 17.85,14.6 15,12.7 12.15,14.6 13.05,11.38 10.5,9.27 13.82,9.12"
        fill="#FCD116"
      />
    </svg>
  );
}

export default CameroonFlag;
