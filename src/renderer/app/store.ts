import { configureStore } from '@reduxjs/toolkit';

import { authReducer } from '@/features/auth/authSlice';
import { api } from '@/services/api';
import '@/services/calendarApi';
import '@/services/chatApi';
import '@/services/homeApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
