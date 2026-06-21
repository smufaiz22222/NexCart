# BACKLOG-031 Resolution: Unused calculateDecay in popularityService.js

## Issue Summary

**ID:** BACKLOG-031  
**Category:** Linter & Code Standards  
**Priority:** LOW  
**Effort:** S (Small)

## Problem

During the BACKLOG-028 refactoring of popularity calculations into raw PostgreSQL queries, the exponential time-decay logic was moved entirely in-database using `power(0.5, ...)` expressions. However, the original JavaScript helper function `calculateDecay` and its supporting `DAY_MS` constant were left behind in the file:

```javascript
const DAY_MS = 24 * 60 * 60 * 1000;

const calculateDecay = (createdAt, halfLifeDays = 14) => {
  const ageDays = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / DAY_MS);
  return Math.pow(0.5, ageDays / halfLifeDays);
};
```

This dead code raised an ESLint `no-unused-vars` warning, causing noise in lint output and CI pipelines.

## Resolution

Removed both the `DAY_MS` constant and the `calculateDecay` function entirely from `src/services/popularityService.js`. The decay calculation is now exclusively handled in-database via the raw SQL `power(0.5, ...)` expression, so the JavaScript implementation serves no purpose.

## Files Modified

| File                                | Change                                                         |
| :---------------------------------- | :------------------------------------------------------------- |
| `src/services/popularityService.js` | Removed unused `DAY_MS` constant and `calculateDecay` function |

## Verification

- The ESLint `no-unused-vars` warning for `calculateDecay` is eliminated.
- No other file in the codebase imports or references `calculateDecay` from this module.
- The popularity scoring logic is unaffected — decay is computed in the PostgreSQL queries using `power(0.5, (extract(epoch from (now() - "createdAt")) / 86400.0) / 14.0)`.
