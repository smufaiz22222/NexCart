# BACKLOG-023 Resolution: Client-Side Request Lifecycle Memory Leaks & Race Conditions

## Issue Summary

**ID:** BACKLOG-023  
**Category:** Frontend React  
**Priority:** HIGH  
**Effort:** M (Medium)  
**Previous Status:** PARTIALLY RESOLVED

## Problem

Asynchronous data fetching routines inside `useEffect` hooks in `BusinessAdvisor.jsx` and `SellerProductDetails.jsx` lacked request cancellation or active-flag checks on unmount. This caused two issues:

1. **Memory leaks**: When a user navigates away before a request completes, the pending promise resolves and calls `setState` on an unmounted component, preventing garbage collection until the network request finishes.

2. **Race conditions**: If dependencies change while a request is in-flight (e.g., navigating to a different product), the stale response can resolve after the newer one, overwriting the UI with outdated data.

## Resolution

Added an **active-flag pattern** to all affected `useEffect` hooks. Each effect creates a mutable reference (`{ current: true }`) that is set to `false` in the cleanup function. All `setState` calls are guarded behind an `if (active.current)` check.

### BusinessAdvisor.jsx

**Two hooks fixed:**

1. `fetchBusinessContext` — now accepts an `active` ref parameter:

```jsx
const fetchBusinessContext = async (active) => {
  try {
    setIsLoadingContext(true);
    const response = await apiClient.get('/stats/advisor-context');
    if (active.current) {
      setBusinessContext(response.data);
      setError('');
    }
  } catch (fetchError) {
    if (active.current) {
      setError(fetchError.response?.data?.error || 'Failed to load advisor business context.');
    }
  } finally {
    if (active.current) {
      setIsLoadingContext(false);
    }
  }
};

useEffect(() => {
  const active = { current: true };
  fetchBusinessContext(active);
  return () => { active.current = false; };
}, []);
```

The "Refresh Metrics" button passes `{ current: true }` directly since manual user-initiated calls don't need cleanup (the user is still on the page).

2. `fetchHistory` — uses a local `let active` boolean:

```jsx
useEffect(() => {
  let active = true;
  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await aiAdvisorClient.get('/history', { params: { sessionId } });
      if (active) {
        setMessages(response.data.messages || []);
        setHistoryError('');
      }
    } catch (fetchError) {
      if (active) {
        setHistoryError(fetchError.response?.data?.detail || '...');
      }
    } finally {
      if (active) {
        setIsLoadingHistory(false);
      }
    }
  };
  fetchHistory();
  return () => { active = false; };
}, [sessionId]);
```

### SellerProductDetails.jsx

**One hook fixed:**

`fetchProduct` — now accepts an `active` ref parameter:

```jsx
const fetchProduct = useCallback(async (active) => {
  try {
    setIsLoading(true);
    const response = await apiClient.get(`/products/${id}`);
    if (active.current) {
      setProduct(response.data);
      setError('');
    }
  } catch (fetchError) {
    if (active.current) {
      setError(fetchError.response?.data?.error || 'Failed to load product details.');
    }
  } finally {
    if (active.current) {
      setIsLoading(false);
    }
  }
}, [id]);

useEffect(() => {
  const active = { current: true };
  fetchProduct(active);
  return () => { active.current = false; };
}, [fetchProduct]);
```

## Files Modified

| File | Change |
| :--- | :--- |
| `client/src/pages/BusinessAdvisor.jsx` | Added active-flag guards to `fetchBusinessContext` and `fetchHistory` useEffect hooks |
| `client/src/pages/SellerProductDetails.jsx` | Added active-flag guard to `fetchProduct` useEffect hook |

## Verification

- State updates (`setProduct`, `setBusinessContext`, `setMessages`, etc.) only execute when the component is still mounted.
- Rapid navigation between pages no longer triggers "setState on unmounted component" warnings.
- If `id` changes in SellerProductDetails (e.g., navigating between products), the previous request's response is discarded, preventing stale data from overwriting the UI.
- Manual refresh actions (button clicks) remain unaffected since they are user-initiated on an active page.

## Design Notes

The `{ current: true }` object pattern (rather than a plain boolean) was chosen for `fetchProduct` and `fetchBusinessContext` because these functions are defined outside the effect and passed the reference. This allows the cleanup to mutate the same object the async function closes over. The `fetchHistory` function uses a simpler `let active` boolean since it's defined inline within the effect closure.
