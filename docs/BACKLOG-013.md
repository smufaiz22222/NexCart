# BACKLOG-013: Case-Sensitivity File Import Build Blocker

## Issue Description
On line 22 of `App.jsx`, the Login page component was lazy-imported using the path `./pages/login` (lowercase "l") instead of `./pages/Login` (uppercase "L"). While this compiled successfully on Windows environments because Windows filesystem pathways are case-insensitive by default, running the production build on case-sensitive Linux build environments (e.g. Vercel, Netlify, Docker) threw a fatal module compilation crash.

---

## Resolution

We resolved this case-sensitivity build blocker:
1. **Corrected Import Case**: Modified `client/src/App.jsx` line 22 to lazy-load from `./pages/Login` (matching the exact uppercase filename structure of the page component file).
2. **Verified Production Compilation**: Triggered a full frontend production compilation via `vite build` using the standard `pnpm run client:build` command to verify that all chunks render and compile correctly without any module resolution warnings or case mismatch errors.

---

## Files Changed

### 1. [App.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/App.jsx)
- Corrected lazy-import of the Login page to use capital `L`.

---

## Verification
- Successfully ran the client production build (`pnpm run client:build`) which completed in 2.70 seconds.
