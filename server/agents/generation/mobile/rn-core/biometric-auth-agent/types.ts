export type BiometricType = 'fingerprint' | 'face' | 'none';

export type AuthStatus = 'idle' | 'authenticated' | 'locked' | 'failed';

export interface DeviceSecurityReport {
  isRootedOrJailbroken: boolean;
  isEmulator: boolean;
  isDebugMode: boolean;
  safe: boolean;
  reasons: string[];
}

export interface AuthRequest {
  userId: string;
  preferredBiometric?: Exclude<BiometricType, 'none'>;
  promptMessage?: string;
  pin?: string;
  pinHash?: string;
  plainToken?: string;
  encryptedToken?: string;
  refreshToken?: string;
  sessionTimeoutMs?: number;
  timestampMs?: number;
  nativeErrorCode?: string;
  securitySignals?: {
    rootedOrJailbroken?: boolean;
    emulator?: boolean;
    debugMode?: boolean;
  };
  biometricCapabilities?: {
    available: boolean;
    types: Exclude<BiometricType, 'none'>[];
  };
  biometricAuthResult?: {
    fingerprint?: 'success' | 'failure' | 'lockout' | 'cancelled';
    face?: 'success' | 'failure' | 'lockout' | 'cancelled' | 'unsupported';
  };
}

export interface AuthResponse {
  authStatus: AuthStatus;
  method: BiometricType | 'pin';
  token?: string;
  sessionExpiresAt?: number;
  lockUntil?: number;
  standardizedError?: string;
}

export interface AuthState {
  authStatus: AuthStatus;
  attempts: number;
  locked: boolean;
  sessionExpiry: number | null;
}

export interface AgentResult<T = unknown> {
  success: boolean;
  logs: string[];
  error?: string;
  data?: T;
}
