import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { authReducer } from '@/features/auth/authSlice';
import { shareReducer } from '@/features/share/shareSlice';
import { api } from '@/services/api';
import '@/services/calendarApi';
import '@/services/chatApi';
import '@/services/homeApi';
import '@/services/meetingsApi';
import '@/services/notificationsApi';
import '@/services/plansApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    share: shareReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  devTools: import.meta.env.DEV,
});

// Only queries that opt in (refetchOnFocus / refetchOnReconnect) are affected.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
