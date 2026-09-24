import { useEffect, useState } from 'react';
import { FiCalendar, FiGrid, FiHome, FiSettings, FiVideo } from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { RecordingProvider } from '@/app/RecordingProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlobalRecordingBar } from '@/components/recording/GlobalRecordingBar';
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
import { IntegrationsPage } from '@/features/integrations/IntegrationsPage';
import { MeetingsPage } from '@/features/meetings/MeetingsPage';
import { PlanGateProvider } from '@/features/settings/PlanGateProvider';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { useLazyCheckAuthQuery, api } from '@/services/api';

type AppRoute = 'home' | 'ai-chat' | 'meetings' | 'calendar' | 'integrations' | 'settings';
type HomeSectionFocus = 'notes' | 'tasks' | 'spaces';
type SettingsFocus = 'plans' | null;

export const App = () => {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);
  const [activeRoute, setActiveRoute] = useState<AppRoute>('home');
  const [homeSectionFocus, setHomeSectionFocus] = useState<HomeSectionFocus | null>(null);
  const [settingsFocus, setSettingsFocus] = useState<SettingsFocus>(null);
  const [checkAuth] = useLazyCheckAuthQuery();

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
          dispatch(setUnauthenticated());
          dispatch(api.util.resetApiState());
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
      label: 'Settings',
      icon: FiSettings,
      isActive: activeRoute === 'settings',
      onSelect: () => setActiveRoute('settings'),
    },
  ];

  if (authStatus === 'bootstrapping') {
    return (
      <div className="app-boot-screen" role="status" aria-live="polite">
        <p>Connecting to Buddy…</p>
      </div>
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
      />
    ),
    'ai-chat': <AiChatPage />,
    meetings: <MeetingsPage />,
    calendar: <CalendarPage />,
    integrations: <IntegrationsPage />,
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
  }[activeRoute];

  return (
    <PlanGateProvider onOpenPlans={openPlans}>
      <RecordingProvider>
        <AppLayout
          navigationItems={navigationItems}
          viewMode={activeRoute === 'ai-chat' ? 'chat' : activeRoute === 'meetings' ? 'wide' : 'default'}
          onOpenSettings={() => setActiveRoute('settings')}
        >
          {page}
        </AppLayout>
        <GlobalRecordingBar onOpenPlans={openPlans} />
      </RecordingProvider>
    </PlanGateProvider>
  );
};
