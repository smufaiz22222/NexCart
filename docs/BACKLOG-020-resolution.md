# BACKLOG-020 Resolution: Redundant useMemo for Simple Primitives

## Issue Summary

**ID:** BACKLOG-020  
**Category:** Frontend React / Vercel React Best Practices  
**Priority:** LOW  
**Effort:** S (Small)  
**Rule Violated:** `rerender-simple-expression-in-memo`

## Problem

In `client/src/pages/SellerProductDetails.jsx`, the `stockStatus` variable was wrapped in `useMemo` with `[product]` as its sole dependency. The computation inside was a trivial series of conditional checks comparing primitive values (`product.currentStock` against `0` and `product.minStock`), returning a small object literal with two string properties.

```jsx
// Before (unnecessary memoization)
const stockStatus = useMemo(() => {
  if (!product)
    return { label: 'Unknown', className: '...' };
  if (product.currentStock === 0)
    return { label: 'Out of Stock', className: '...' };
  if (product.currentStock <= (product.minStock || 10))
    return { label: 'Low Stock', className: '...' };
  return { label: 'Healthy Stock', className: '...' };
}, [product]);
```

### Why This Is a Problem

- **Unnecessary overhead:** `useMemo` registers a dependency array that React must shallow-compare on every render. For a computation that involves only a few integer comparisons and returns a small object, this bookkeeping cost exceeds the cost of simply re-running the logic.
- **Memory cost:** React retains the previous memoized value in memory between renders for comparison purposes, which is wasteful for trivially cheap computations.
- **Code complexity:** Wrapping simple expressions in `useMemo` obscures intent and makes the component harder to read without providing measurable performance benefit.

## Resolution

Removed the `useMemo` wrapper and computed `stockStatus` directly during render using an immediately-invoked function expression (IIFE):

```jsx
// After (direct inline computation)
const stockStatus = (() => {
  if (!product)
    return { label: 'Unknown', className: 'bg-zinc-800/60 text-zinc-300 border-zinc-700' };
  if (product.currentStock === 0)
    return { label: 'Out of Stock', className: 'bg-red-500/10 text-red-300 border-red-500/20' };
  if (product.currentStock <= (product.minStock || 10))
    return { label: 'Low Stock', className: 'bg-amber-500/10 text-amber-300 border-amber-500/20' };
  return { label: 'Healthy Stock', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' };
})();
```

Additionally, `useMemo` was removed from the React import statement since it is no longer used anywhere in the file:

```jsx
// Before
import { useCallback, useEffect, useMemo, useState } from 'react';

// After
import { useCallback, useEffect, useState } from 'react';
```

## Files Modified

| File | Change |
| :--- | :--- |
| `client/src/pages/SellerProductDetails.jsx` | Removed `useMemo` import; replaced memoized `stockStatus` with direct IIFE computation |

## Verification

- The logic and return values remain identical; no behavioral change.
- The component renders correctly with the same stock status badges.
- No remaining references to `useMemo` in the file.

## Guideline Reference

This fix aligns with the Vercel React Best Practices rule **`rerender-simple-expression-in-memo`**: avoid wrapping trivial expressions (primitive comparisons, simple conditionals) in `useMemo` or `useCallback` when the computation cost is negligible compared to the memoization overhead itself.
