export type AuthStrategy = 'JWT' | 'OAUTH' | 'SESSION';

export interface AuthConfig {
  strategy: AuthStrategy | string;
  issuer: string;
  audience: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  oauthProviders?: Array<'google' | 'github'>;
  session?: {
    secureCookies: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    cookieName: string;
    maxAgeMs: number;
  };
  roles?: string[];
  permissions?: string[];
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface Role {
  name: string;
  permissions: string[];
}

export interface Permission {
  name: string;
  description: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface AuthModuleOutput {
  success: boolean;
  files: GeneratedFile[];
  strategy: string;
  logs: string[];
  error?: string;
}

export type AuthStatus = 'IDLE' | 'GENERATING' | 'SUCCESS' | 'FAILED';
