type IconProps = {
  className?: string;
};

export const ProfiIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M6 3h8a5 5 0 0 1 0 10H10v8H6V3zm4 6h4a1 1 0 1 0 0-2h-4v2z" />
  </svg>
);
