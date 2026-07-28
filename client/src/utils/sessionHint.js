const AUTH_SESSION_HINT_KEY = 'nexcart-auth-session';

export const hasAuthSessionHint = () => localStorage.getItem(AUTH_SESSION_HINT_KEY) === 'true';

export const setAuthSessionHint = () => {
  localStorage.setItem(AUTH_SESSION_HINT_KEY, 'true');
};

export const clearAuthSessionHint = () => {
  localStorage.removeItem(AUTH_SESSION_HINT_KEY);
};
