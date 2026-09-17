export type AuthUser = {
  userId: string;
  name?: string | null;
  email?: string | null;
  phone?: number | string | null;
  avatar?: string | null;
  isNewUser?: boolean;
  hasCompletedOnboarding?: boolean;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  authenticatedAt: string;
};

export type AuthApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type AuthPayload = {
  token: string;
  userId: string;
  isNewUser: boolean;
  phone?: number | null;
  email?: string | null;
  name?: string | null;
  avatar?: string | null;
};

export type CheckPhoneData = {
  exists: boolean;
  phone: number;
  name?: string;
  hasCompletedOnboarding?: boolean;
};

export type CheckAuthData = {
  authenticated: boolean;
  userId: string;
  phone?: number | null;
  email?: string | null;
  name?: string | null;
  avatar?: string | null;
  isNewUser?: boolean;
  hasCompletedOnboarding?: boolean;
  sessionAuthenticated?: boolean;
};

export type SendOtpData = {
  message: string;
};

export type LogoutData = {
  message: string;
};
