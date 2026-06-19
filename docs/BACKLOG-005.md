# BACKLOG-005: Lax CORS Policy Configuration

## Issue Description
CORS was configured using wildcard defaults (`app.use(cors())`), allowing credentials and API invocations from any origin. Allowing wildcard access with credentials poses severe security risks, including Cross-Site Request Forgery (CSRF) and data exposure to malicious external domains.

---

## Resolution

Refactored the CORS middleware configuration in `src/app.js`:
1. Parsed allowed origins from the `ALLOWED_ORIGINS` environment variable, split as a comma-separated list.
2. Implemented a fallback set of origins (`http://localhost:5173` and `http://localhost:3000`) for development.
3. Created a dynamic matcher callback function that checks the request's incoming `Origin` header against the parsed whitelist or wildcard (`*`).
4. Configured `corsOptions` with the origin matcher and set `credentials: true`.
5. Added `ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000` to the `.env` template.

### Code Implementation

#### [app.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/app.js)
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
```

---

## Verification
- Verified Javascript syntax on `src/app.js` using `node --check`.
- Verified all backend tests (`pnpm run test`) pass successfully.
