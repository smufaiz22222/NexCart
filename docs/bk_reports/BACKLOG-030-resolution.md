# BACKLOG-030 Resolution: Missing Rollup Vendor Chunks for Large Libraries

## Issue Summary

**ID:** BACKLOG-030  
**Category:** Frontend React  
**Priority:** MEDIUM  
**Effort:** S (Small)

## Problem

The Vite configuration (`client/vite.config.js`) had no custom Rollup chunk-splitting setup. Heavy libraries such as `recharts` (~250KB minified) and `lucide-react` (large barrel-export icon set) were bundled directly into route-level chunks. This caused:

1. **Layout chunk bloat**: Pages that import even a single icon or chart pull in the entire library within their route bundle.
2. **Poor caching**: Any application code change invalidates the entire chunk, forcing users to re-download large vendor code that rarely changes.
3. **Slower initial page loads**: Larger route bundles increase time-to-interactive, especially on slower connections.

## Resolution

Added `build.rollupOptions.output.manualChunks` configuration to `vite.config.js` to split heavy dependencies into dedicated vendor chunks:

```javascript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-query': ['@tanstack/react-query'],
        },
      },
    },
  },
});
```

### Chunk Strategy

| Chunk Name        | Libraries                                | Rationale                                                                                        |
| :---------------- | :--------------------------------------- | :----------------------------------------------------------------------------------------------- |
| `vendor-react`    | `react`, `react-dom`, `react-router-dom` | Core framework — shared across all routes, very stable, excellent cache retention                |
| `vendor-recharts` | `recharts`                               | Heavy charting library (~250KB) only used on analytics/dashboard pages                           |
| `vendor-icons`    | `lucide-react`                           | Large icon barrel export used across many pages — isolating prevents duplication in route chunks |
| `vendor-query`    | `@tanstack/react-query`                  | Data-fetching layer used across most pages — stable dependency, benefits from long caching       |

## Benefits

- **Better caching**: Vendor chunks change rarely and get long-lived browser cache hits, even when application code is updated.
- **Smaller route bundles**: Each lazy-loaded page chunk only contains its own component code, not duplicated vendor libraries.
- **Parallel loading**: The browser can fetch vendor chunks and route chunks in parallel, improving time-to-interactive.
- **Reduced total transfer**: Users who visit multiple pages don't re-download shared libraries embedded in each route chunk.

## Files Modified

| File                    | Change                                                        |
| :---------------------- | :------------------------------------------------------------ |
| `client/vite.config.js` | Added `build.rollupOptions.output.manualChunks` configuration |

## Verification

Run a production build to confirm the chunks are generated:

```bash
pnpm --filter frontend build
```

The `dist/assets/` output should show separate files like:

- `vendor-react-[hash].js`
- `vendor-recharts-[hash].js`
- `vendor-icons-[hash].js`
- `vendor-query-[hash].js`

These will be loaded on-demand alongside their consuming route chunks.
