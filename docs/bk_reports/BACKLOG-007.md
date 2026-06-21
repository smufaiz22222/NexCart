# BACKLOG-007: No Token Blacklisting on Logout & Excessive Expiry Duration

## Issue Description

JWT access tokens were configured with a very long 7-day expiration time (`7d`) without refresh token rotation. Furthermore, client-side logout was only clearing local storage, while the backend did not revoke or blacklist the session. This meant any compromised token remained valid and authorized until its expiration, exposing the system to replay and session hijacking attacks.

---

## Resolution

We implemented a robust database-backed JWT blacklist and shortened access token lifespan:

1. **Model Definition**: Added a `BlacklistedToken` model in `schema.prisma` with a unique constraint on `token` and an indexed `token` field for fast querying.
2. **Access Expiration Reduction**: Reduced the JWT access token lifespan in `login` (`src/controllers/authController.js`) from `7d` to `1h`.
3. **Backend Logout Endpoint**: Implemented a `/logout` POST endpoint in `src/routes/authRoutes.js` and `src/controllers/authController.js` that parses the token, decodes the token's expiration timestamp, and stores it in the `BlacklistedToken` table.
4. **Middleware Validation**: Integrated blacklisting checks in the `authenticate` and `optionalAuthenticate` middlewares in `src/middlewares/authMiddleware.js`. Any request presenting a blacklisted token is rejected with `401 Unauthorized`.
5. **Client Store Integration**: Modified the `logout` async function in `client/src/store/authStore.js` to hit `/api/auth/logout` on the backend before clearing local storage.

### Diff of Changes

#### [schema.prisma](file:///c:/Users/smufa/Desktop/NexCart_updated/prisma/schema.prisma)

```prisma
model BlacklistedToken {
  id        String   @id @default(uuid())
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([token])
}
```

#### [authMiddleware.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/middlewares/authMiddleware.js)

```javascript
const blacklisted = await prisma.blacklistedToken.findUnique({
  where: { token },
});
if (blacklisted) {
  return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
}
```

---

## Verification

- Pushed database schema updates using `npx prisma db push` and regenerated Prisma Client.
- Verified Javascript syntax on all modified backend files.
- Ran all unit/integration tests successfully.
