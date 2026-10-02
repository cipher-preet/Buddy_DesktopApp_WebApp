import appIcon from '@/assets/kukunotes-icon.png';
import { APP_NAME } from '@shared/constants/app';

type BrandLogoProps = {
  size?: 'sm' | 'md';
  showName?: boolean;
  className?: string;
};

const sizeMap = {
  sm: 32,
  md: 44,
} as const;

export const BrandLogo = ({ size = 'sm', showName = true, className }: BrandLogoProps) => {
  const iconSize = sizeMap[size];

  return (
    <span className={`brand-logo brand-logo--${size}${className ? ` ${className}` : ''}`} aria-label={APP_NAME}>
      <span className="brand-logo__mark">
        <img src={appIcon} alt="" width={iconSize} height={iconSize} draggable={false} />
      </span>
      {showName ? (
        <strong className="brand-logo__name">
          Kuku<span className="brand-logo__accent">Notes</span>
        </strong>
      ) : null}
    </span>
  );
};
