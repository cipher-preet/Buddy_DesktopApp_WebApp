import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { FiX, FiZap } from 'react-icons/fi';

import {
  buildUpgradeTitle,
  getPlanResourceLabel,
  getPlanRestriction,
  type PlanRestrictionInfo,
} from '@/features/settings/planRestriction';

type PlanGateContextValue = {
  promptPlanUpgrade: (info: PlanRestrictionInfo | string) => void;
  /** Returns true when the error was handled as a plan restriction. */
  handleApiError: (error: unknown, fallbackMessage?: string) => boolean;
  openPlanUpgrade: () => void;
  closeUpgradePrompt: () => void;
};

const PlanGateContext = createContext<PlanGateContextValue | undefined>(undefined);

type PlanGateProviderProps = {
  children: ReactNode;
  onOpenPlans: () => void;
};

export const PlanGateProvider = ({
  children,
  onOpenPlans,
}: PlanGateProviderProps) => {
  const [prompt, setPrompt] = useState<PlanRestrictionInfo | null>(null);

  const closeUpgradePrompt = useCallback(() => {
    setPrompt(null);
  }, []);

  const promptPlanUpgrade = useCallback((info: PlanRestrictionInfo | string) => {
    if (typeof info === 'string') {
      setPrompt({ message: info });
      return;
    }
    setPrompt(info);
  }, []);

  const openPlanUpgrade = useCallback(() => {
    setPrompt(null);
    onOpenPlans();
  }, [onOpenPlans]);

  const handleApiError = useCallback((error: unknown, _fallbackMessage?: string) => {
    const restriction = getPlanRestriction(error);
    if (restriction) {
      setPrompt(restriction);
      return true;
    }
    return false;
  }, []);

  const value = useMemo(
    () => ({
      promptPlanUpgrade,
      handleApiError,
      openPlanUpgrade,
      closeUpgradePrompt,
    }),
    [promptPlanUpgrade, handleApiError, openPlanUpgrade, closeUpgradePrompt],
  );

  return (
    <PlanGateContext.Provider value={value}>
      {children}
      {prompt ? (
        <UpgradePlanModal
          info={prompt}
          onClose={closeUpgradePrompt}
          onUpgrade={openPlanUpgrade}
        />
      ) : null}
    </PlanGateContext.Provider>
  );
};

export const usePlanGate = () => {
  const context = useContext(PlanGateContext);
  if (!context) {
    throw new Error('usePlanGate must be used within PlanGateProvider');
  }
  return context;
};

type UpgradePlanModalProps = {
  info: PlanRestrictionInfo;
  onClose: () => void;
  onUpgrade: () => void;
};

const UpgradePlanModal = ({ info, onClose, onUpgrade }: UpgradePlanModalProps) => {
  const usageLine =
    info.resource && info.limit != null && info.used != null
      ? `You've used ${info.used} of ${info.limit} ${getPlanResourceLabel(info.resource)} on your current plan.`
      : null;

  return (
    <div className="settings-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="settings-modal settings-action-modal plan-upgrade-modal"
        role="dialog"
        aria-label={buildUpgradeTitle(info.resource)}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div className="plan-upgrade-modal__heading">
            <span className="plan-upgrade-modal__icon" aria-hidden="true">
              <FiZap size={18} />
            </span>
            <div>
              <h2>{buildUpgradeTitle(info.resource)}</h2>
              <p>{info.message}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <FiX aria-hidden="true" size={18} />
          </button>
        </header>

        {usageLine ? <p className="plan-upgrade-modal__usage">{usageLine}</p> : null}

        <div className="settings-modal-actions">
          <button className="settings-secondary-button" type="button" onClick={onClose}>
            Not now
          </button>
          <button className="settings-primary-button" type="button" onClick={onUpgrade}>
            Upgrade plan
          </button>
        </div>
      </div>
    </div>
  );
};
