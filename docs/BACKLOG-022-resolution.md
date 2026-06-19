# BACKLOG-022 Resolution: State Management Issues - Unhandled Errors & Stock Overdrafts

## Issue Summary

**ID:** BACKLOG-022  
**Category:** Frontend React  
**Priority:** HIGH  
**Effort:** M (Medium)  
**Previous Status:** PARTIALLY RESOLVED

## Problem

Three state management issues were identified:

1. **Auth error state not cleared on success**: `authStore.js` failed to clear the `error` state on successful `login` or `register` calls, causing stale error messages to persist in the UI after a successful retry.

2. **Cart stock overdraft**: `cartStore.js` allowed customers to add items exceeding `product.currentStock`, enabling phantom inventory that would fail at checkout.

3. **Dead code local cart in `Store.jsx`**: The page `Store.jsx` implemented its own local React state cart instead of using the global Zustand `cartStore`, creating confusion and inconsistency.

## Resolution

### Sub-issue 1: Auth error clearing (Previously resolved)

The `authStore.js` `login` and `register` functions now clear the `error` state at the start of each call and on success. This was resolved prior to this backlog item being tracked.

### Sub-issue 2: Cart stock validation (Previously resolved)

The `cartStore.js` `addToCart` function now validates the requested quantity against `product.currentStock` before adding to cart, preventing overdraft scenarios. This was resolved prior to this backlog item being tracked.

### Sub-issue 3: Dead code `Store.jsx` (Resolved in BACKLOG-021)

The `Store.jsx` file was deleted as part of BACKLOG-021 resolution. Its lazy import was also removed from `App.jsx`. Since the file no longer exists in the filesystem, the last remaining active flaw in this backlog item is now resolved.

## Files Modified

| File | Action | Resolved In |
| :--- | :--- | :--- |
| `client/src/store/authStore.js` | Error state clearing added | Prior fix |
| `client/src/store/cartStore.js` | Stock validation added | Prior fix |
| `client/src/pages/Store.jsx` | **Deleted** | BACKLOG-021 |

## Verification

- `authStore.js` clears error on call start and success paths.
- `cartStore.js` checks `product.currentStock` before allowing add-to-cart.
- `Store.jsx` no longer exists; no references to it remain in the codebase.

## Related Items

- **BACKLOG-021** (RESOLVED): Deleted `Store.jsx` and its import, resolving the last active sub-issue here.
