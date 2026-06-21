# BACKLOG-027: Weak Default JWT Secret Key

## Issue Description

The application used a weak default placeholder value (`your_super_secret_jwt_key_here`) for the `JWT_SECRET` key in the environment configuration (`.env`). If this key is not replaced in staging or production environments, attackers can easily forge JSON Web Signatures (JWS) and compromise the application by assuming any user's identity, including super admin.

---

## Resolution

1. **Replaced Placeholder Key**:
   We generated a cryptographically secure, high-entropy 256-bit key (encoded in Base64) using Node's crypto module:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   We replaced `your_super_secret_jwt_key_here` with this generated value in the project `.env` file.

2. **Setup Documentation**:
   Developers deploying the application should always regenerate this key. Below are standard commands to generate a secure key:

   ### Option 1: OpenSSL (Recommended)

   Run the following command in your terminal:

   ```bash
   openssl rand -base64 32
   ```

   ### Option 2: Node.js

   If OpenSSL is not available, you can run this Node.js one-liner in your terminal:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   ### Option 3: Python

   Alternatively, you can run this Python script:

   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

   Once generated, update the `JWT_SECRET` variable inside your `.env` file:

   ```env
   JWT_SECRET=<YOUR_NEW_SECURE_KEY>
   ```

---

## Files Changed

### 1. [.env](file:///c:/Users/smufa/Desktop/NexCart_updated/.env)

- Replaced the placeholder key with a secure high-entropy random string.

---

## Verification

- Confirmed the server starts and parses the new environment variable cleanly.
- Successfully ran the test suite using `pnpm.cmd run test` to verify JWT verification continues to function perfectly under the new key.
