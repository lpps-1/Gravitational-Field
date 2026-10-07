/** Small inline icons (24×24 grid, currentColor). Decorative: always paired with a text label or aria-label. */
type IconProps = { className?: string };

const base = (path: React.ReactNode, className = "h-5 w-5") => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    focusable="false"
  >
    {path}
  </svg>
);

export const PlayIcon = ({ className }: IconProps) => base(<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />, className);
export const PauseIcon = ({ className }: IconProps) =>
  base(
    <>
      <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    </>,
    className,
  );
export const StepIcon = ({ className }: IconProps) =>
  base(
    <>
      <path d="M5 5v14l10-7z" fill="currentColor" stroke="none" />
      <path d="M18 5v14" />
    </>,
    className,
  );
export const ResetIcon = ({ className }: IconProps) =>
  base(
    <>
      <path d="M4 12a8 8 0 1 0 2.3-5.6" />
      <path d="M4 4v4.5h4.5" />
    </>,
    className,
  );
export const HelpIcon = ({ className }: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.8" />
      <circle cx="12" cy="17.2" r="0.6" fill="currentColor" />
    </>,
    className,
  );
export const KeyboardIcon = ({ className }: IconProps) =>
  base(
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
    </>,
    className,
  );
export const SettingsIcon = ({ className }: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>,
    className,
  );
export const TourIcon = ({ className }: IconProps) =>
  base(
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </>,
    className,
  );
export const PanelIcon = ({ className }: IconProps) =>
  base(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </>,
    className,
  );
export const CloseIcon = ({ className }: IconProps) => base(<path d="M6 6l12 12M18 6L6 18" />, className);
export const ChevronUpIcon = ({ className }: IconProps) => base(<path d="M6 15l6-6 6 6" />, className);
export const ChevronDownIcon = ({ className }: IconProps) => base(<path d="M6 9l6 6 6-6" />, className);
export const BeamIcon = ({ className }: IconProps) =>
  base(
    <>
      <circle cx="5" cy="12" r="2" fill="currentColor" />
      <path d="M8 12c4 0 6-4 13-4" />
    </>,
    className,
  );
export const LabelIcon = ({ className }: IconProps) =>
  base(
    <>
      <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z" />
      <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" />
    </>,
    className,
  );
