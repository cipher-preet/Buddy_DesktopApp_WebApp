import { useEffect, useState } from 'react';
import { FiCalendar, FiGrid, FiHome, FiSettings, FiVideo } from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { RecordingProvider } from '@/app/RecordingProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlobalRecordingBar } from '@/components/recording/GlobalRecordingBar';
import { AiChatPage } from '@/features/ai-chat/AiChatPage';
import { AuthPage } from '@/features/auth/AuthPage';
import { setAuthenticatedFromCheck, setUnauthenticated } from '@/features/auth/authSlice';
import { readAuthSession } from '@/features/auth/authStorage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { IntegrationsPage } from '@/features/integrations/IntegrationsPage';
import { MeetingsPage } from '@/features/meetings/MeetingsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { useLazyCheckAuthQuery, api } from '@/services/api';

type AppRoute = 'home' | 'ai-chat' | 'meetings' | 'calendar' | 'integrations' | 'settings';

const getErrorStatus = (error: unknown): number | string | null => {
  if (typeof error !== 'object' || !error || !('status' in error)) {
    return null;
  }

  return (error as { status?: number | string }).status ?? null;
};

export const App = () => {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);
  const [activeRoute, setActiveRoute] = useState<AppRoute>('home');
  const [checkAuth] = useLazyCheckAuthQuery();

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

      try {
        const data = await checkAuth(undefined, false).unwrap();
        if (!cancelled) {
          dispatch(setAuthenticatedFromCheck({ token: session.token, data }));
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        // Keep the local session on network/proxy blips. Only logout when the token is rejected.
        const status = getErrorStatus(error);
        if (status === 401 || status === 403) {
          dispatch(setUnauthenticated());
          dispatch(api.util.resetApiState());
        }
      }
    };

    void validateSession();

    return () => {
      cancelled = true;
    };
    // Intentionally once on mount; localStorage is the reload source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigationItems = [
    { label: 'Home', icon: FiHome, isActive: activeRoute === 'home', onSelect: () => setActiveRoute('home') },
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

  if (authStatus !== 'authenticated') {
    return (
      <AuthPage
        onAuthenticated={() => {
          setActiveRoute('home');
        }}
      />
    );
  }

  const page = {
    home: <DashboardPage />,
    'ai-chat': <AiChatPage />,
    meetings: <MeetingsPage />,
    calendar: <CalendarPage />,
    integrations: <IntegrationsPage />,
    settings: (
      <SettingsPage
        onNavigateHome={() => setActiveRoute('home')}
        onSignedOut={() => setActiveRoute('home')}
      />
    ),
  }[activeRoute];

  return (
    <RecordingProvider>
      <AppLayout
        navigationItems={navigationItems}
        viewMode={activeRoute === 'ai-chat' ? 'chat' : activeRoute === 'meetings' ? 'wide' : 'default'}
      >
        {page}
      </AppLayout>
      <GlobalRecordingBar />
    </RecordingProvider>
  );
};
