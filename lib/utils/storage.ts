/**
 * LocalStorage keys
 */
const ADMIN_SESSION_KEY = "chit_admin_session";
const USER_CODE_KEY = "chit_user_code";

/**
 * Admin session management
 */
export const adminStorage = {
  /**
   * Set admin session (authenticated)
   */
  setSession(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(ADMIN_SESSION_KEY, "authenticated");
    }
  },

  /**
   * Check if admin is authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ADMIN_SESSION_KEY) === "authenticated";
  },

  /**
   * Clear admin session (logout)
   */
  clearSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    }
  },
};

/**
 * User session management
 */
export const userStorage = {
  /**
   * Store user code
   */
  setCode(code: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(USER_CODE_KEY, code);
    }
  },

  /**
   * Get stored user code
   */
  getCode(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(USER_CODE_KEY);
  },

  /**
   * Clear user code (logout/switch user)
   */
  clearCode(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(USER_CODE_KEY);
    }
  },

  /**
   * Check if user code exists
   */
  hasCode(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(USER_CODE_KEY) !== null;
  },
};
