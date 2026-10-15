import type { IconType } from 'react-icons';
import {
  FiActivity,
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiCheckSquare,
  FiClipboard,
  FiLayers,
  FiMail,
  FiMessageSquare,
  FiPieChart,
  FiSun,
  FiTarget,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import { HiOutlineLightBulb, HiSparkles } from 'react-icons/hi';
import { MdOutlineDocumentScanner } from 'react-icons/md';

export type MarketplaceInstallTier = 'pro' | 'business';

export type MarketplaceAgentTone = 'blue' | 'red' | 'navy' | 'teal' | 'orange' | 'purple' | 'green';

export type MarketplaceAgent = {
  id: string;
  title: string;
  description: string;
  author: string;
  installs: string;
  tone: MarketplaceAgentTone;
  icon: IconType;
  iconKey: string;
  /** Minimum plan that can install without upgrade. */
  installTier: MarketplaceInstallTier;
  /** Controlled by backend — when false, Hire Agent stays disabled. */
  hireEnabled: boolean;
};

const ICON_MAP: Record<string, IconType> = {
  activity: FiActivity,
  bell: FiBell,
  briefcase: FiBriefcase,
  calendar: FiCalendar,
  'check-square': FiCheckSquare,
  clipboard: FiClipboard,
  layers: FiLayers,
  mail: FiMail,
  message: FiMessageSquare,
  'pie-chart': FiPieChart,
  scan: MdOutlineDocumentScanner,
  sparkles: HiSparkles,
  sun: FiSun,
  target: FiTarget,
  users: FiUsers,
  zap: FiZap,
  bulb: HiOutlineLightBulb,
};

const TONES: MarketplaceAgentTone[] = ['blue', 'red', 'navy', 'teal', 'orange', 'purple', 'green'];

export const resolveAgentIcon = (iconKey?: string | null): IconType => {
  const key = String(iconKey || '')
    .trim()
    .toLowerCase();
  return ICON_MAP[key] || HiSparkles;
};

export const normalizeAgentTone = (tone?: string | null): MarketplaceAgentTone => {
  const value = String(tone || '')
    .trim()
    .toLowerCase();
  return (TONES.find((item) => item === value) as MarketplaceAgentTone | undefined) || 'blue';
};

export const normalizeInstallTier = (tier?: string | null): MarketplaceInstallTier =>
  String(tier || '')
    .trim()
    .toLowerCase() === 'business'
    ? 'business'
    : 'pro';
