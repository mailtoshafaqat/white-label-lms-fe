// Prototype token storage. For production, move tokens to httpOnly cookies.
export type TenantFeatures = {
  tenantId: string;
  tenantName: string;
  slug: string;
  status: string;
  plan: string;
  liveClassesEnabled: boolean;
  zoomMode: string;
  paymentMode: string;
  allowStudentSelfEnroll: boolean;
  allowAdminCreateStudent: boolean;
};

export type AuthSession = {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  mustChangePassword?: boolean;
  tenant?: TenantFeatures | null;
};

const KEY = "lms.session";

export function saveSession(session: AuthSession) {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(session));
  }
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as AuthSession) : null;
}

export function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY);
  }
}

const ADMIN_ROLES = ["SuperAdmin", "InstituteAdmin", "Teacher"];

export function isAdmin(session: AuthSession | null): boolean {
  return !!session && ADMIN_ROLES.includes(session.role);
}

const MANAGE_ROLES = ["SuperAdmin", "InstituteAdmin"];

/** Tenant administrators who can manage students and platform settings. */
export function canManageInstitute(session: AuthSession | null): boolean {
  return !!session && MANAGE_ROLES.includes(session.role);
}

export function isSuperAdmin(session: AuthSession | null): boolean {
  return session?.role === "SuperAdmin";
}

export function canSelfEnroll(session: AuthSession | null): boolean {
  return !!session?.tenant?.allowStudentSelfEnroll;
}
