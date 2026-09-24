import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  FiBell,
  FiChevronsLeft,
  FiChevronsRight,
  FiDownload,
  FiList,
  FiMenu,
  FiSearch,
  FiShare2,
  FiX,
} from 'react-icons/fi';
import { RiMic2Line, RiRobot2Line } from 'react-icons/ri';

import { useRecording } from '@/app/RecordingProvider';
import { useAppSelector } from '@/app/hooks';
import { BrandLogo } from '@/components/common/BrandLogo';
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';
import { SidePanelContent, type SidePanelTab } from '@/components/layout/SidePanelContent';
import { StartListeningModal } from '@/components/recording/StartListeningModal';
import type { WorkspaceSpace } from '@/features/dashboard/homeTypes';
import { usePlanGate } from '@/features/settings/PlanGateProvider';
import { useGetPlanStatusQuery } from '@/services/plansApi';

export type NavigationItem = {
  label: string;
  icon: IconType;
  isActive?: boolean;
  onSelect?: () => void;
};

type AppLayoutProps = {
  children: ReactNode;
  navigationItems: NavigationItem[];
  viewMode?: 'default' | 'chat' | 'wide';
  onOpenSettings?: () => void;
};

const panelTabs: { id: SidePanelTab; label: string }[] = [
  { id: 'ai-chat', label: 'AI Chat' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'share', label: 'Share' },
];

const DRAWER_BREAKPOINT = 900;
const PANEL_OVERLAY_BREAKPOINT = 1100;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

const formatRemainingRecording = (limitHours?: number, usedMs?: number) => {
  if (limitHours === undefined || limitHours === null) {
    return { label: 'Recording quota unavailable', remainingMs: 0, progress: 0, unlimited: false };
  }

  if (limitHours < 0) {
    return { label: 'Unlimited recording left', remainingMs: -1, progress: 1, unlimited: true };
  }

  const limitMs = limitHours * MS_PER_HOUR;
  const consumedMs = Math.max(0, usedMs || 0);
  const remainingMs = Math.max(0, limitMs - consumedMs);
  const progress = limitMs > 0 ? Math.min(1, consumedMs / limitMs) : 0;

  const totalMinutes = Math.floor(remainingMs / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (remainingMs <= 0) {
    return { label: '0h 0m remaining', remainingMs: 0, progress: 1, unlimited: false };
  }

  if (hours <= 0) {
    return {
      label: `${minutes}m remaining`,
      remainingMs,
      progress,
      unlimited: false,
    };
  }

  return {
    label: `${hours}h ${minutes}m remaining`,
    remainingMs,
    progress,
    unlimited: false,
  };
};

export const AppLayout = ({
  children,
  navigationItems,
  viewMode = 'default',
  onOpenSettings,
}: AppLayoutProps) => {
  const { openPlanUpgrade, promptPlanUpgrade } = usePlanGate();
  const authUser = useAppSelector((state) => state.auth.user);
  const userId = authUser?.userId || '';
  const {
    data: planStatus,
    isLoading: isPlanStatusLoading,
    isError: isPlanStatusError,
  } = useGetPlanStatusQuery({ userId }, { skip: !userId });

  const planCode = planStatus?.plan?.code || planStatus?.subscription?.planCode || 'free';
  const planName = planStatus?.plan?.name || 'Free';
  const isFreePlan = planCode === 'free';
  const recordingSummary = useMemo(
    () =>
      formatRemainingRecording(
        planStatus?.plan?.limits?.recordingHours,
        planStatus?.usage?.recordingMs,
      ),
    [planStatus?.plan?.limits?.recordingHours, planStatus?.usage?.recordingMs],
  );

  const planBenefit = useMemo(() => {
    const feature = planStatus?.plan?.features?.[0];
    if (feature) {
      return feature;
    }
    if (isFreePlan) {
      return 'Upgrade for more recording time';
    }
    return 'Premium benefits active';
  }, [isFreePlan, planStatus?.plan?.features]);

  const [isMeetingPanelCollapsed, setIsMeetingPanelCollapsed] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDrawerViewport, setIsDrawerViewport] = useState(false);
  const [isListeningPickerOpen, setIsListeningPickerOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<SidePanelTab>('meetings');
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const { startListening, isStarting, isVisible: isRecordingVisible } = useRecording();
  const isChatView = viewMode === 'chat';
  const hideSidePanel = viewMode === 'chat' || viewMode === 'wide';

  const openListeningPicker = () => {
    if (
      !isPlanStatusLoading &&
      !recordingSummary.unlimited &&
      recordingSummary.remainingMs <= 0
    ) {
      promptPlanUpgrade({
        message: 'Recording time limit reached for your plan. Upgrade to continue recording.',
        resource: 'recordingHours',
        planCode,
      });
      return;
    }

    if (isRecordingVisible || isStarting) {
      return;
    }

    setIsListeningPickerOpen(true);
  };

  const handleConfirmListening = async (space: WorkspaceSpace) => {
    await startListening({ spaceId: space.id, spaceName: space.name });
    setIsListeningPickerOpen(false);
  };

  useEffect(() => {
    const drawerQuery = window.matchMedia(`(max-width: ${DRAWER_BREAKPOINT}px)`);
    const panelQuery = window.matchMedia(`(max-width: ${PANEL_OVERLAY_BREAKPOINT}px)`);

    const syncViewport = () => {
      const drawer = drawerQuery.matches;
      const panelOverlay = panelQuery.matches;

      setIsDrawerViewport(drawer);

      if (drawer) {
        setIsSidebarCollapsed(false);
        setIsMobileNavOpen(false);
      }

      if (panelOverlay) {
        setIsMeetingPanelCollapsed(true);
      }
    };

    syncViewport();
    drawerQuery.addEventListener('change', syncViewport);
    panelQuery.addEventListener('change', syncViewport);

    return () => {
      drawerQuery.removeEventListener('change', syncViewport);
      panelQuery.removeEventListener('change', syncViewport);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const offset = isDrawerViewport ? '0px' : isSidebarCollapsed ? '76px' : 'var(--sidebar-width)';
    root.style.setProperty('--recording-inset-left', offset);

    return () => {
      root.style.removeProperty('--recording-inset-left');
    };
  }, [isDrawerViewport, isSidebarCollapsed]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileNavOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobileNavOpen]);

  const openPanel = (tab: SidePanelTab) => {
    setActivePanelTab(tab);
    setIsMeetingPanelCollapsed(false);
    setIsMobileNavOpen(false);
  };

  const handleNavSelect = (item: NavigationItem) => {
    item.onSelect?.();
    setIsMobileNavOpen(false);
    setIsNotificationsOpen(false);
  };

  return (
    <div
      className="app-shell"
      data-recording-active={isRecordingVisible ? 'true' : undefined}
      data-sidebar-collapsed={isSidebarCollapsed && !isDrawerViewport ? 'true' : undefined}
      data-mobile-nav-open={isMobileNavOpen ? 'true' : undefined}
      data-drawer-viewport={isDrawerViewport ? 'true' : undefined}
    >
      <button
        className="mobile-nav-backdrop"
        type="button"
        aria-label="Close navigation"
        tabIndex={isMobileNavOpen ? 0 : -1}
        onClick={() => setIsMobileNavOpen(false)}
      />

      <aside className="app-sidebar" aria-label="Primary navigation">
        <div className="sidebar-topbar">
          <BrandLogo size="sm" />
          <div className="sidebar-topbar__actions">
            {!isDrawerViewport ? (
              <button
                className="nav-icon-button"
                type="button"
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={() => {
                  setIsSidebarCollapsed((collapsed) => !collapsed);
                  setIsNotificationsOpen(false);
                }}
              >
                <FiChevronsLeft aria-hidden="true" size={18} />
              </button>
            ) : (
              <button
                className="nav-icon-button"
                type="button"
                aria-label="Close navigation"
                onClick={() => setIsMobileNavOpen(false)}
              >
                <FiX aria-hidden="true" size={18} />
              </button>
            )}
            <div className="notifications-anchor">
              <button
                ref={notificationsButtonRef}
                className={`nav-icon-button${isNotificationsOpen ? ' is-active' : ''}`}
                type="button"
                aria-label="Notifications"
                aria-expanded={isNotificationsOpen}
                aria-haspopup="dialog"
                onClick={() => setIsNotificationsOpen((open) => !open)}
              >
                <FiBell aria-hidden="true" size={18} />
              </button>
              <NotificationsDropdown
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                anchorRef={notificationsButtonRef}
              />
            </div>
          </div>
        </div>

        <div className="account-panel">
          <button
            className="account-card"
            type="button"
            onClick={() => onOpenSettings?.()}
            aria-label="Open account settings"
          >
            <span className="avatar">
              {(authUser?.name || authUser?.email || 'B').charAt(0).toUpperCase()}
            </span>
            <span className="account-card__text">
              <strong>{authUser?.name || 'Buddy User'}</strong>
              <small>{authUser?.email || authUser?.phone || 'No email added'}</small>
            </span>
          </button>
        </div>

        <nav className="nav-list">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                className="nav-list__item"
                data-active={item.isActive ? 'true' : undefined}
                key={item.label}
                type="button"
                onClick={() => handleNavSelect(item)}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="app-sidebar__footer">
          <div className="download-card">
            <strong>Get the desktop app</strong>
            <p>Local, reliable, bot-free recording</p>
            <a href="#download">
              <span>Download</span>
              <FiDownload aria-hidden="true" size={15} />
            </a>
          </div>

          <div className="plan-card">
            <div className="plan-card__row">
              <strong>
                {isPlanStatusLoading ? 'Loading…' : isPlanStatusError ? 'Plan' : planName}
              </strong>
              <span
                className="plan-card__meter"
                aria-hidden="true"
                style={{ '--plan-progress': String(recordingSummary.progress) } as CSSProperties}
              />
            </div>
            <p className="plan-card__usage">
              {isPlanStatusLoading
                ? 'Checking recording quota…'
                : isPlanStatusError
                  ? 'Unable to load plan usage'
                  : recordingSummary.label}
            </p>
            <small className="plan-card__benefit">{planBenefit}</small>
            <button
              type="button"
              disabled={isPlanStatusLoading}
              onClick={() => openPlanUpgrade()}
            >
              {isFreePlan ? 'Get Buddy Pro' : 'Manage plan'}
            </button>
          </div>
        </div>
      </aside>

      <div className="app-main" data-view-mode={viewMode}>
        {!isChatView ? (
          <header className="app-header">
            <div className="app-header__leading">
              <button
                className="nav-icon-button mobile-nav-trigger"
                type="button"
                aria-label="Open navigation"
                aria-expanded={isMobileNavOpen}
                onClick={() => {
                  setIsMobileNavOpen(true);
                  setIsNotificationsOpen(false);
                }}
              >
                <FiMenu aria-hidden="true" size={20} />
              </button>

              <label className="search-field">
                <FiSearch aria-hidden="true" size={21} />
                <input placeholder="Ask or search" aria-label="Ask or search" />
                <kbd>CtrlK</kbd>
              </label>
            </div>

            <div className="header-actions">
              {!isRecordingVisible ? (
                <button
                  className={`toolbar-button toolbar-button--record${isStarting ? ' is-loading' : ''}`}
                  type="button"
                  disabled={isStarting}
                  onClick={openListeningPicker}
                  aria-label={isStarting ? 'Starting recording' : 'Start recording'}
                >
                  {isStarting ? (
                    <span className="toolbar-button__spinner" aria-hidden="true" />
                  ) : (
                    <RiMic2Line className="toolbar-button__mic" aria-hidden="true" />
                  )}
                  <span>{isStarting ? 'Starting...' : 'Record'}</span>
                </button>
              ) : null}
            </div>
          </header>
        ) : (
          <button
            className="nav-icon-button mobile-nav-trigger mobile-nav-trigger--chat"
            type="button"
            aria-label="Open navigation"
            aria-expanded={isMobileNavOpen}
            onClick={() => {
              setIsMobileNavOpen(true);
              setIsNotificationsOpen(false);
            }}
          >
            <FiMenu aria-hidden="true" size={20} />
          </button>
        )}

        <div
          className="workspace-layout"
          data-panel-collapsed={isMeetingPanelCollapsed ? 'true' : undefined}
          data-view-mode={viewMode}
        >
          <main className="app-content" data-view-mode={viewMode}>
            {children}
          </main>

          {!hideSidePanel ? (
            <>
              <button
                className="meeting-panel-backdrop"
                type="button"
                aria-label="Close side panel"
                tabIndex={isMeetingPanelCollapsed ? -1 : 0}
                hidden={isMeetingPanelCollapsed}
                onClick={() => setIsMeetingPanelCollapsed(true)}
              />
              <aside className="meeting-panel" aria-hidden={isMeetingPanelCollapsed} aria-label="Side panel">
                <div className="meeting-tabs" role="tablist" aria-label="Side panel tabs">
                  {panelTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activePanelTab === tab.id}
                      className={activePanelTab === tab.id ? 'is-active' : undefined}
                      onClick={() => setActivePanelTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <button
                    className="meeting-tabs__collapse"
                    type="button"
                    aria-label="Collapse panel"
                    onClick={() => setIsMeetingPanelCollapsed(true)}
                  >
                    <FiChevronsRight aria-hidden="true" size={18} />
                  </button>
                </div>

                <div className="meeting-panel__content" data-tab={activePanelTab}>
                  <SidePanelContent activeTab={activePanelTab} onStartRecording={openListeningPicker} />
                </div>
              </aside>
            </>
          ) : null}

          {!hideSidePanel ? (
            <div
              className="collapsed-panel-rail"
              aria-hidden={!isMeetingPanelCollapsed}
              data-visible={isMeetingPanelCollapsed ? 'true' : undefined}
            >
              <button type="button" aria-label="Open AI chat panel" onClick={() => openPanel('ai-chat')}>
                <RiRobot2Line aria-hidden="true" size={18} />
              </button>
              <button type="button" aria-label="Open meetings panel" onClick={() => openPanel('meetings')}>
                <FiList aria-hidden="true" size={18} />
              </button>
              <button type="button" aria-label="Open share panel" onClick={() => openPanel('share')}>
                <FiShare2 aria-hidden="true" size={18} />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {isListeningPickerOpen ? (
        <StartListeningModal
          onClose={() => setIsListeningPickerOpen(false)}
          onConfirm={handleConfirmListening}
        />
      ) : null}
    </div>
  );
};
