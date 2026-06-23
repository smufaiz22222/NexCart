const DEFAULT_AUTH_COOKIE_NAME = 'nexcart_auth_token';
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || DEFAULT_AUTH_COOKIE_NAME;

export const parseCookies = (cookieHeader = '') => {
  return String(cookieHeader)
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce((cookies, segment) => {
      const separatorIndex = segment.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = decodeURIComponent(segment.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(segment.slice(separatorIndex + 1).trim());
      cookies[key] = value;
      return cookies;
    }, {});
};

export const extractAuthToken = (req) => {
  const bearerToken = req.headers.authorization?.split(' ')[1];
  if (bearerToken) {
    return bearerToken;
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[AUTH_COOKIE_NAME] || null;
};

const buildCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: ONE_HOUR_IN_MS,
  };
};

export const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, buildCookieOptions());
};

export const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
};
