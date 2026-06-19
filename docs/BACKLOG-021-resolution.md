# BACKLOG-021 Resolution: Folderisation Standard Deviations & Dead Code

## Issue Summary

**ID:** BACKLOG-021  
**Category:** Frontend React  
**Priority:** MEDIUM  
**Effort:** S (Small)  
**Previous Status:** PARTIALLY RESOLVED

## Problem

Three folderisation and dead code issues were identified during the codebase audit:

1. **Dead code file `Store.jsx`**: The file `client/src/pages/Store.jsx` was imported in `App.jsx` via `lazy()` but never rendered in any active route. The actual storefront is handled by `Storefront.jsx`. The dead file also contained its own local cart state instead of using the global Zustand `cartStore`, creating confusion.

2. **Login import casing inconsistency**: Originally `App.jsx` imported Login as `./pages/login` (lowercase), which breaks on case-sensitive Linux build environments (Vercel, Docker). This was already corrected in BACKLOG-013.

3. **Empty `components/customer` directory**: The directory `client/src/components/customer/` existed but contained no files, while `components/wholesaler/` was actively populated. The empty directory added noise to the project structure.

## Resolution

### 1. Removed dead Store import from App.jsx

```jsx
// Removed this unused lazy import
const Store = lazy(() => import('./pages/Store'));
```

The `Store` component was never referenced in any `<Route>` element, making the import pure dead code that would still cause Webpack/Vite to bundle the module unnecessarily.

### 2. Deleted `client/src/pages/Store.jsx`

The entire file was removed from the filesystem. It contained a standalone page with local React state cart management that duplicated and conflicted with the global Zustand `cartStore`. The active storefront route uses `Storefront.jsx`.

### 3. Login import casing (no action needed)

The Login import in `App.jsx` already reads `'./pages/Login'` with correct casing, as this was resolved in BACKLOG-013.

### 4. Removed empty `client/src/components/customer/` directory

The empty directory was deleted to keep the project structure clean. If customer-specific components are extracted in the future, the directory can be recreated at that time.

## Files Modified / Deleted

| File | Action |
| :--- | :--- |
| `client/src/App.jsx` | Removed dead `Store` lazy import |
| `client/src/pages/Store.jsx` | **Deleted** |
| `client/src/components/customer/` | **Deleted** (empty directory) |

## Verification

- No remaining references to `Store` exist in `App.jsx` or any route configuration.
- The application routes remain intact; `Storefront.jsx` continues to handle `/store` index rendering.
- The `components/wholesaler/` directory remains populated and unaffected.
- Login import casing is correct for case-sensitive environments.

## Related Items

- **BACKLOG-013** (RESOLVED): Fixed the Login import casing issue.
- **BACKLOG-022** (PARTIAL): Referenced `Store.jsx` dead code — now fully resolved with this deletion.
