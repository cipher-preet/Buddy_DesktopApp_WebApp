import { useEffect, useState } from 'react';
import {
  FiBookOpen,
  FiCalendar,
  FiFileText,
  FiGitBranch,
  FiGrid,
  FiHome,
  FiSettings,
  FiShoppingBag,
  FiTarget,
  FiUsers,
  FiVideo,
} from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { RecordingProvider } from '@/app/RecordingProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlobalRecordingBar } from '@/components/recording/GlobalRecordingBar';
import { AchieveGoalPage } from '@/features/achieve-goal/AchieveGoalPage';
import { AiChatPage } from '@/features/ai-chat/AiChatPage';
import { AuthPage } from '@/features/auth/AuthPage';
import {
  completeBootstrap,
  setAuthenticatedFromCheck,
  setUnauthenticated,
} from '@/features/auth/authSlice';
import { bootstrapAuthSession } from '@/features/auth/bootstrapAuthSession';
import { readAuthSession } from '@/features/auth/authStorage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DocumentationPage } from '@/features/documentation/DocumentationPage';
import { DocumentItPage } from '@/features/document-it/DocumentItPage';
import { IntegrationsPage } from '@/features/integrations/IntegrationsPage';
import { MarketplacePage } from '@/features/marketplace/MarketplacePage';
import { MeetingsPage } from '@/features/meetings/MeetingsPage';
import { MindmapPage } from '@/features/mindmap/MindmapPage';
import { PlanGateProvider } from '@/features/settings/PlanGateProvider';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { TeamsPage } from '@/features/teams/TeamsPage';
import { InvitePage } from '@/features/teams/InvitePage';
import type {
  CalendarFocusTarget,
  DashboardFocusTarget,
  MeetingFocusTarget,
  SearchNavigationTarget,
} from '@/features/search/searchTypes';
import { useLazyCheckAuthQuery, api } from '@/services/api';

type AppRoute =
  | 'home'
  | 'ai-chat'
  | 'achieve-goal'
  | 'mindmap'
  | 'document-it'
  | 'meetings'
  | 'calendar'
  | 'integrations'
  | 'marketplace'
  | 'teams'
  | 'settings'
  | 'documentation';

const APP_ROUTES: readonly AppRoute[] = [
  'home',
  'ai-chat',
  'achieve-goal',
  'mindmap',
  'document-it',
  'meetings',
  'calendar',
  'integrations',
  'marketplace',
  'teams',
  'settings',
  'documentation',
] as const;

const isAppRoute = (value: string): value is AppRoute =>
  (APP_ROUTES as readonly string[]).includes(value);

const readRouteFromHash = (): AppRoute => {
  if (typeof window === 'undefined') {
    return 'home';
  }
  const raw = window.location.hash.replace(/^#\/?/, '').split(/[/?#]/)[0] ?? '';
  return isAppRoute(raw) ? raw : 'home';
};

const readInviteToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [route, token] = raw.split(/[/?#]/);
  if (route !== 'invite' || !token) {
    return null;
  }
  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
};

const writeRouteToHash = (route: AppRoute) => {
  if (typeof window === 'undefined') {
    return;
  }
  const next = `#/${route}`;
  const current = window.location.hash;
  if (current === next || current.startsWith(`${next}?`)) {
    return;
  }
  window.location.hash = next;
};

type HomeSectionFocus = 'notes' | 'tasks' | 'spaces';
type SettingsFocus = 'plans' | null;

export const App = () => {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);
  const [activeRoute, setActiveRouteState] = useState<AppRoute>(() => readRouteFromHash());
  const [homeSectionFocus, setHomeSectionFocus] = useState<HomeSectionFocus | null>(null);
  const [settingsFocus, setSettingsFocus] = useState<SettingsFocus>(null);
  const [dashboardTarget, setDashboardTarget] = useState<DashboardFocusTarget | null>(null);
  const [meetingTarget, setMeetingTarget] = useState<MeetingFocusTarget | null>(null);
  const [calendarTarget, setCalendarTarget] = useState<CalendarFocusTarget | null>(null);
  const [checkAuth] = useLazyCheckAuthQuery();
  const [inviteToken, setInviteToken] = useState<string | null>(() => readInviteToken());
  const [inviteNeedsAuth, setInviteNeedsAuth] = useState(false);

  const setActiveRoute = (route: AppRoute) => {
    setActiveRouteState(route);
    writeRouteToHash(route);
  };

  useEffect(() => {
    if (!readInviteToken()) {
      writeRouteToHash(activeRoute);
    }

    const handleHashChange = () => {
      const nextToken = readInviteToken();
      setInviteToken(nextToken);
      if (nextToken) {
        setInviteNeedsAuth(false);
        return;
      }
      const nextRoute = readRouteFromHash();
      setActiveRouteState((current) => (current === nextRoute ? current : nextRoute));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
    // Sync listener once; route writes go through setActiveRoute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoute]);

  const handleSearchNavigate = (target: SearchNavigationTarget) => {
    const nonce = Date.now();
    if (target.kind === 'meeting') {
      setMeetingTarget({ meetingId: target.meetingId, tab: target.tab, nonce });
      setActiveRoute('meetings');
      return;
    }
    if (target.kind === 'event') {
      setCalendarTarget({ dateKey: target.dateKey, nonce });
      setActiveRoute('calendar');
      return;
    }
    setDashboardTarget(
      target.kind === 'space'
        ? { spaceId: target.spaceId, nonce }
        : { spaceId: target.spaceId, section: target.kind === 'task' ? 'tasks' : 'notes', itemId: target.itemId, nonce },
    );
    setActiveRoute('home');
  };

  const goHome = (section?: HomeSectionFocus) => {
    setHomeSectionFocus(section ?? 'spaces');
    setActiveRoute('home');
  };

  const openPlans = () => {
    setActiveRoute('settings');
    setSettingsFocus('plans');
  };

  useEffect(() => {
    let cancelled = false;

    const validateSession = async () => {
      const session = readAuthSession();

      if (!session?.token || !session.user?.userId) {
        if (!cancelled) {
          // The cache is already empty on a fresh visit. Resetting it here runs
          // again under Strict Mode after the invite page has subscribed, which
          // drops that request and leaves the page on "Loading invitation".
          dispatch(setUnauthenticated());
        }
        return;
      }

      const result = await bootstrapAuthSession(true, async () =>
        checkAuth(undefined, false).unwrap(),
      );

      if (cancelled) {
        return;
      }

      if (result.kind === 'authenticated') {
        dispatch(setAuthenticatedFromCheck({ token: session.token, data: result.data }));
        return;
      }

      if (result.kind === 'offline') {
        // Keep local session across flaky refreshes / brief API blips.
        dispatch(completeBootstrap());
        return;
      }

      dispatch(setUnauthenticated());
      dispatch(api.util.resetApiState());
    };

    void validateSession();

    return () => {
      cancelled = true;
    };
    // Intentionally once on mount; localStorage is the reload source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigationItems = [
    {
      label: 'Home',
      icon: FiHome,
      isActive: activeRoute === 'home',
      onSelect: () => goHome('spaces'),
    },
    {
      label: 'AI Chat',
      icon: RiRobot2Line,
      isActive: activeRoute === 'ai-chat',
      onSelect: () => setActiveRoute('ai-chat'),
    },
    {
      label: 'Achieve Goal',
      icon: FiTarget,
      isActive: activeRoute === 'achieve-goal',
      onSelect: () => setActiveRoute('achieve-goal'),
    },
    {
      label: 'Document it',
      icon: FiFileText,
      isActive: activeRoute === 'document-it',
      onSelect: () => setActiveRoute('document-it'),
    },
    {
      label: 'Mindmap',
      icon: FiGitBranch,
      isActive: activeRoute === 'mindmap',
      onSelect: () => setActiveRoute('mindmap'),
    },
    {
      label: 'Meetings',
      icon: FiVideo,
      isActive: activeRoute === 'meetings',
      onSelect: () => setActiveRoute('meetings'),
    },
    {
      label: 'Calendar',
      icon: FiCalendar,
      isActive: activeRoute === 'calendar',
      onSelect: () => setActiveRoute('calendar'),
    },
    {
      label: 'Integrations',
      icon: FiGrid,
      isActive: activeRoute === 'integrations',
      onSelect: () => setActiveRoute('integrations'),
    },
    {
      label: 'Marketplace',
      icon: FiShoppingBag,
      isActive: activeRoute === 'marketplace',
      onSelect: () => setActiveRoute('marketplace'),
      badge: 'Beta',
    },
    {
      label: 'Teams',
      icon: FiUsers,
      isActive: activeRoute === 'teams',
      onSelect: () => setActiveRoute('teams'),
    },
    {
      label: 'Settings',
      icon: FiSettings,
      isActive: activeRoute === 'settings',
      onSelect: () => setActiveRoute('settings'),
    },
    {
      label: 'Documentation',
      icon: FiBookOpen,
      isActive: activeRoute === 'documentation',
      onSelect: () => setActiveRoute('documentation'),
    },
  ];

  if (authStatus === 'bootstrapping') {
    return (
      <div className="app-boot-screen" role="status" aria-live="polite">
        <p>Connecting to KukuNotes…</p>
      </div>
    );
  }

  if (inviteToken) {
    if (authStatus !== 'authenticated' && inviteNeedsAuth) {
      return (
        <AuthPage
          onAuthenticated={() => {
            setInviteNeedsAuth(false);
          }}
        />
      );
    }
    return (
      <InvitePage
        token={inviteToken}
        isAuthenticated={authStatus === 'authenticated'}
        onRequireAuth={() => setInviteNeedsAuth(true)}
        onOpenDashboard={() => {
          setInviteToken(null);
          setInviteNeedsAuth(false);
          setHomeSectionFocus(null);
          setActiveRoute('home');
        }}
      />
    );
  }

  if (authStatus !== 'authenticated') {
    return (
      <AuthPage
        onAuthenticated={() => {
          setHomeSectionFocus(null);
          setActiveRoute('home');
        }}
      />
    );
  }

  const page = {
    home: (
      <DashboardPage
        focusSection={homeSectionFocus}
        onFocusHandled={() => setHomeSectionFocus(null)}
        focusTarget={dashboardTarget}
        onFocusTargetHandled={() => setDashboardTarget(null)}
      />
    ),
    'ai-chat': <AiChatPage />,
    'achieve-goal': <AchieveGoalPage />,
    mindmap: <MindmapPage />,
    'document-it': <DocumentItPage />,
    meetings: <MeetingsPage focusTarget={meetingTarget} onFocusTargetHandled={() => setMeetingTarget(null)} />,
    calendar: <CalendarPage focusTarget={calendarTarget} onFocusTargetHandled={() => setCalendarTarget(null)} />,
    integrations: <IntegrationsPage />,
    marketplace: <MarketplacePage />,
    teams: <TeamsPage />,
    settings: (
      <SettingsPage
        focusSection={settingsFocus}
        onFocusHandled={() => setSettingsFocus(null)}
        onNavigateHome={goHome}
        onSignedOut={() => {
          setHomeSectionFocus(null);
          setActiveRoute('home');
        }}
      />
    ),
    documentation: <DocumentationPage />,
  }[activeRoute];

  const viewMode =
    activeRoute === 'ai-chat'
      ? 'chat'
      : activeRoute === 'mindmap'
        ? 'canvas'
        : activeRoute === 'meetings' || activeRoute === 'achieve-goal'
          ? 'wide'
          : 'default';

  return (
    <PlanGateProvider onOpenPlans={openPlans}>
      <RecordingProvider>
        <AppLayout
          navigationItems={navigationItems}
          viewMode={viewMode}
          onOpenSettings={() => setActiveRoute('settings')}
          onSearchNavigate={handleSearchNavigate}
        >
          {page}
        </AppLayout>
        <GlobalRecordingBar onOpenPlans={openPlans} />
      </RecordingProvider>
    </PlanGateProvider>
  );
};
