import appIcon from '@/assets/app-icon.png';

type BrandLogoProps = {
  size?: 'sm' | 'md';
  showName?: boolean;
  className?: string;
};

const sizeMap = {
  sm: 28,
  md: 40,
} as const;

export const BrandLogo = ({ size = 'sm', showName = true, className }: BrandLogoProps) => {
  const iconSize = sizeMap[size];

  return (
    <span className={`brand-logo brand-logo--${size}${className ? ` ${className}` : ''}`} aria-label="Buddy">
      <span className="brand-logo__mark">
        <img src={appIcon} alt="" width={iconSize} height={iconSize} draggable={false} />
      </span>
      {showName ? <strong className="brand-logo__name">Buddy</strong> : null}
    </span>
  );
};
