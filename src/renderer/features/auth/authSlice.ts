import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
  writeAuthSessionFromCheck,
} from './authStorage';
import type { AuthPayload, AuthSession, AuthUser, CheckAuthData } from './authTypes';

type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  token: string | null;
  user: AuthUser | null;
  authenticatedAt: string | null;
};

const storedSession = readAuthSession();

// Keep the local session across reloads. Server validation happens in the background.
const initialState: AuthState = {
  status: storedSession ? 'authenticated' : 'unauthenticated',
  token: storedSession?.token ?? null,
  user: storedSession?.user ?? null,
  authenticatedAt: storedSession?.authenticatedAt ?? null,
};

const applySession = (state: AuthState, session: AuthSession) => {
  state.status = 'authenticated';
  state.token = session.token;
  state.user = session.user;
  state.authenticatedAt = session.authenticatedAt;
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setBootstrapping(state) {
      state.status = 'bootstrapping';
    },
    setAuthenticatedFromPayload(state, action: PayloadAction<AuthPayload>) {
      applySession(state, writeAuthSession(action.payload));
    },
    setAuthenticatedFromCheck(state, action: PayloadAction<{ token: string; data: CheckAuthData }>) {
      applySession(state, writeAuthSessionFromCheck(action.payload.token, action.payload.data));
    },
    hydrateFromStorage(state) {
      const session = readAuthSession();
      if (!session) {
        state.status = 'unauthenticated';
        state.token = null;
        state.user = null;
        state.authenticatedAt = null;
        return;
      }

      applySession(state, session);
    },
    setUnauthenticated(state) {
      clearAuthSession();
      state.status = 'unauthenticated';
      state.token = null;
      state.user = null;
      state.authenticatedAt = null;
    },
    updateAuthUser(state, action: PayloadAction<Partial<AuthUser>>) {
      if (!state.user || !state.token) {
        return;
      }

      state.user = { ...state.user, ...action.payload };
      writeAuthSession({
        token: state.token,
        userId: state.user.userId,
        isNewUser: Boolean(state.user.isNewUser),
        phone: state.user.phone as number | null | undefined,
        email: state.user.email,
        name: state.user.name,
        avatar: state.user.avatar,
      });
    },
  },
});

export const {
  setBootstrapping,
  setAuthenticatedFromPayload,
  setAuthenticatedFromCheck,
  hydrateFromStorage,
  setUnauthenticated,
  updateAuthUser,
} = authSlice.actions;

export const authReducer = authSlice.reducer;
