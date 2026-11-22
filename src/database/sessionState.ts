export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_USER_EMAIL = 'demo@ironpulse.app';
export const DEMO_USER_PASSWORD = '123456';
export const DEMO_USER_NAME = 'Atleta Demo';

let currentUserId: string | null = null;

export function setActiveUserId(userId: string | null): void {
  currentUserId = userId;
}

export function getActiveUserId(): string {
  return currentUserId ?? DEMO_USER_ID;
}

export function getOptionalActiveUserId(): string | null {
  return currentUserId;
}
