export function JusticeBadge({ legajo, size = 112 }: { legajo: string; size?: number }) {
  const gradientId = "justiceBadgeGold";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className="shrink-0"
      role="img"
      aria-label={`Placa del Departamento de Justicia, número ${legajo}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8c766" />
          <stop offset="50%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#8f7118" />
        </linearGradient>
        <path id="badgeTopCurve" d="M 26,100 A 74,74 0 0 1 174,100" fill="none" />
        <path id="badgeBottomCurve" d="M 168,124 A 74,74 0 0 0 32,124" fill="none" />
      </defs>

      <circle cx="100" cy="100" r="94" fill="#0b0d12" stroke={`url(#${gradientId})`} strokeWidth="3" />
      <circle cx="100" cy="100" r="80" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.5" />

      <text fill="#e8c766" fontSize="11.5" fontWeight="700" letterSpacing="1.5">
        <textPath href="#badgeTopCurve" startOffset="50%" textAnchor="middle">
          DEPARTAMENTO DE JUSTICIA
        </textPath>
      </text>
      <text fill="#c9a227" fontSize="10.5" fontWeight="600" letterSpacing="2">
        <textPath href="#badgeBottomCurve" startOffset="50%" textAnchor="middle">
          OLD STATE RP
        </textPath>
      </text>

      {/* balanza de la justicia */}
      <g stroke="#e8c766" strokeWidth="3.2" strokeLinecap="round" fill="none">
        <line x1="100" y1="62" x2="100" y2="118" />
        <line x1="72" y1="72" x2="128" y2="72" />
        <path d="M 72,72 L 62,96 A 15,10 0 0 0 82,96 Z" />
        <path d="M 128,72 L 118,96 A 15,10 0 0 0 138,96 Z" />
        <line x1="86" y1="122" x2="114" y2="122" />
      </g>
      <circle cx="100" cy="72" r="3.5" fill="#e8c766" stroke="none" />

      {/* cinta con el numero de placa */}
      <path d="M 44,142 L 156,142 L 148,168 L 52,168 Z" fill="#0b0d12" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
      <text
        x="100"
        y="160"
        textAnchor="middle"
        fill="#e8c766"
        fontSize="15"
        fontWeight="700"
        fontFamily="var(--font-mono), monospace"
      >
        #{legajo}
      </text>
    </svg>
  );
}
