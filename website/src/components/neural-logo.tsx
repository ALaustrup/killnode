export function NeuralLogo({ className = "h-24 w-24" }: { className?: string }) {
  return (
    <svg
      className={`animate-pulse-neural ${className}`}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="kn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff0000" />
          <stop offset="100%" stopColor="#00ffff" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" stroke="url(#kn-grad)" strokeWidth="1.5" opacity="0.35" />
      <circle cx="60" cy="60" r="38" stroke="#ff0000" strokeWidth="1" opacity="0.55" />
      <circle cx="60" cy="60" r="22" stroke="#00ffff" strokeWidth="1.2" opacity="0.7" />
      <circle cx="60" cy="60" r="6" fill="#ff0000" />
      <line x1="60" y1="8" x2="60" y2="28" stroke="#00ffff" strokeWidth="0.8" opacity="0.6" />
      <line x1="60" y1="92" x2="60" y2="112" stroke="#ff0000" strokeWidth="0.8" opacity="0.6" />
      <line x1="8" y1="60" x2="28" y2="60" stroke="#00ffff" strokeWidth="0.8" opacity="0.6" />
      <line x1="92" y1="60" x2="112" y2="60" stroke="#ff0000" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}
