# BACKLOG-017: Hand-Rolled Auth Persistence & Missing Expiry Handling

## Issue Description
1. **Manual LocalStorage Handling**: `authStore.js` handled state persistence manually via custom `localStorage.getItem` / `localStorage.setItem` calls upon initialization and logout, instead of leveraging Zustand's built-in, native `persist` middleware.
2. **Missing Token Expiration Redirection**: When the server responded with a `401 Unauthorized` or `403 Forbidden` status code (indicating an expired or invalid session token), the client Axios middleware did not catch these errors. Consequently, the user remained visually logged in on the frontend UI, but all subsequent actions failed silently.

---

## Resolution

1. **Zustand Native Persistence**:
   - Integrated Zustand's native `persist` middleware inside [authStore.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/store/authStore.js).
   - Configured it to persist `user`, `token`, and `isAuthenticated` states automatically under the `'nexcart-auth-storage'` key.
   - Retained backward-compatible manual writes to `localStorage` (via `localStorage.setItem` / `removeItem`) inside the store actions. This ensures other non-Zustand files (such as `cartStore.js` and the Axios request interceptor) that read raw token strings from local storage continue to function normally.

2. **Axios Response Interceptor**:
   - Added a response interceptor inside [axios.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/api/axios.js) to catch response status codes.
   - Intercepted `401 Unauthorized` and `403 Forbidden` statuses.
   - Excluded active auth routes (such as `/auth/login`, `/auth/register`, and `/auth/logout`) to prevent disruption of normal error handling during user onboarding, and to avoid infinite recursion loops on logout.
   - Resolved load-time circular dependencies between the API client and auth store by using a dynamic `import()` statement at runtime to fetch the store before executing `logout()`.
   - Cleansed local/persisted states and triggered a navigation redirect to `/login` if the user is not already on that page.

---

## Files Changed

### 1. [authStore.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/store/authStore.js)
- Refactored store definition to wrap the action builder function in `persist` middleware.
- Configured storage under key `'nexcart-auth-storage'` filtering `user`, `token`, and `isAuthenticated` keys via `partialize`.

### 2. [axios.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/api/axios.js)
- Appended a response interceptor handling `401`/`403` status codes, initiating a clean logout and browser redirection.

---

## Verification
- Verified compilation builds cleanly without syntax or bundling errors.
- Verified all ESLint errors are resolved (zero errors).
- Verified backend test suite runs and passes (47/47 passing tests).
