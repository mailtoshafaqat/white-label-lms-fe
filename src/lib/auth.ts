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
  bundlePriceEditEnabled: boolean;
  mcqBulkImportEnabled: boolean;
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

/** Auth endpoints where 401 means bad credentials, not an expired session. */
export function isAuthApiPath(path: string): boolean {
  const normalized = path.split("?")[0];
  return (
    normalized.startsWith("/api/v1/auth/") || normalized.startsWith("/api/v1/public/")
  );
}

/** Clear session and send user to institute login (expired/invalid token). */
export function redirectToLogin() {
  if (typeof window === "undefined") return;

  const session = getSession();
  const isPlatform = session?.role === "SuperAdmin" || session?.role === "Support";

  clearSession();

  const loginUrl = isPlatform
    ? "/login/platform"
    : `/login?tenant=${encodeURIComponent(
        session?.tenant?.slug ??
          localStorage.getItem("lms.tenantSlug") ??
          "demo"
      )}`;
  const onLogin =
    window.location.pathname === "/login" ||
    window.location.pathname.startsWith("/login/");

  if (!onLogin) {
    window.location.replace(loginUrl);
  }
}

const ADMIN_ROLES = ["SuperAdmin", "InstituteAdmin", "Teacher"];

export function isAdmin(session: AuthSession | null): boolean {
  return !!session && ADMIN_ROLES.includes(session.role);
}

/** Institute owners/admins — not platform SuperAdmin (they use /superadmin). */
export function canManageInstitute(session: AuthSession | null): boolean {
  return session?.role === "InstituteAdmin";
}

export function isTeacherRole(session: AuthSession | null): boolean {
  return session?.role === "Teacher";
}

export const INSTITUTE_SETUP_WIZARD_KEY = "lms.institute_setup_wizard_v1";

export function isInstituteAdmin(session: AuthSession | null): boolean {
  return session?.role === "InstituteAdmin";
}

export function isSetupWizardComplete(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(INSTITUTE_SETUP_WIZARD_KEY) === "complete";
}

export function markSetupWizardComplete() {
  if (typeof window !== "undefined") {
    localStorage.setItem(INSTITUTE_SETUP_WIZARD_KEY, "complete");
  }
}

export function isSuperAdmin(session: AuthSession | null): boolean {
  return session?.role === "SuperAdmin";
}

/** Human-readable role for UI labels, e.g. InstituteAdmin → "Institute Admin". */
export function formatRoleLabel(role: string | undefined | null): string {
  switch (role) {
    case "InstituteAdmin":
      return "Institute Admin";
    case "SuperAdmin":
      return "SuperAdmin";
    case "Teacher":
      return "Teacher";
    case "Student":
      return "Student";
    case "Support":
      return "Support";
    default:
      return role?.trim() || "";
  }
}

export function isSupport(session: AuthSession | null): boolean {
  return session?.role === "Support";
}

export function isPlatformStaff(session: AuthSession | null): boolean {
  return isSuperAdmin(session) || isSupport(session);
}

export function canSelfEnroll(session: AuthSession | null): boolean {
  return !!session?.tenant?.allowStudentSelfEnroll;
}

/** Where to send the user immediately after a successful login or forced password change. */
export function getPostLoginPath(session: AuthSession): string {
  if (session.mustChangePassword) return "/account/password";
  if (isSupport(session)) return "/support";
  if (isSuperAdmin(session)) return "/superadmin";
  if (isInstituteAdmin(session)) {
    if (typeof window !== "undefined" && !isSetupWizardComplete()) return "/admin/setup";
    return "/admin";
  }
  if (isTeacherRole(session)) return "/admin/home";
  if (isAdmin(session)) return "/admin";
  return "/dashboard";
}
