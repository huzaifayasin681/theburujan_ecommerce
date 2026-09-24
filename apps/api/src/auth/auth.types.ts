import type { Request } from 'express';

export type AuthUser = { id: string; sessionId: string; email: string; roles: string[]; permissions: string[] };
export type AuthRequest = Request & { user: AuthUser; requestId?: string };
