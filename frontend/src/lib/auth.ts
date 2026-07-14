const TOKEN_KEY = 'sevagan_token';

// The refresh token lives in an HTTP-only cookie set by the backend — it is
// never accessible to (or stored by) client-side JS.
export const auth = {
  setToken(accessToken: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, accessToken);
  },
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  },
  isLoggedIn(): boolean {
    return !!this.getToken();
  },
};
