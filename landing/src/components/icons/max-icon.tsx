type IconProps = {
  className?: string;
};

export const MaxIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2C6.48 2 2 5.58 2 10c0 2.24 1.12 4.27 2.94 5.74L4 20l4.46-2.14C9.58 18.26 10.76 18.5 12 18.5c5.52 0 10-3.58 10-8S17.52 2 12 2z" />
  </svg>
);
