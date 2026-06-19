# BACKLOG-016: Hardcoded Axios Base URL

## Issue Description
The Axios API client inside `axios.js` (`client/src/api/axios.js`) had a hardcoded backend base URL of `'http://localhost:5000/api'`. This made configuring the frontend in staging, production, or customized local dev environments difficult and was inconsistent with the environment-driven config used in `aiAdvisor.js`.

---

## Resolution
We resolved this by substituting the hardcoded URL configuration:
1. **Dynamic Environment Lookup**: Configured `baseURL` to check `import.meta.env.VITE_API_URL` first.
2. **Local Fallback**: Kept `'http://localhost:5000/api'` as the default fallback value to ensure existing local dev setups continue running out-of-the-box.

---

## Files Changed

### 1. [axios.js](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/api/axios.js)
- Updated `baseURL` config parameter inside `axios.create()`.

---

## Verification
- Verified compilation builds cleanly without syntax or bundling errors.
- Verified backend test suite runs and passes.
