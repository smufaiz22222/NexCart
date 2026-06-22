# NexCart Email Service Documentation

This document provides a comprehensive technical overview of the email system inside the **NexCart** platform. It details the third-party integrations, rate-limiting protections, asynchronous background delivery architecture, database schemas, and all email notifications dispatched by the system.

---

## 1. Core Integration & Delivery Flow

NexCart uses **Brevo (formerly Sendinblue)** as its transaction email service provider. The service is implemented in [emailService.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/services/emailService.js).

### 1.1 Modes of Operation

1. **Production / Staging Mode**:
   - Triggered when a valid `BREVO_API_KEY` environment variable is defined.
   - Emails are transmitted via HTTP POST requests to `https://api.brevo.com/v3/smtp/email`.
   - Includes custom configuration parameters:
     - `BREVO_SENDER_EMAIL` (default: `support@nexcart.local`)
     - `BREVO_SENDER_NAME` (default: `NexCart Support`)

2. **Development / Mock Mode**:
   - Triggered automatically if `BREVO_API_KEY` is not present, set to `'your_brevo_api_key_here'`, empty, or if the system environment is set to testing (`process.env.NODE_ENV === 'test'`).
   - Emails are not sent over the wire. Instead, the service prints a formatted text preview of the message content and recipient directly to the server's standard console output.

### 1.2 Transient Failures & Exponential Backoff Retry

To ensure reliable delivery, the email dispatcher features a resilient retry loop for transient problems (like timeouts or `5xx` server responses):

- **Maximum attempts**: 3
- **Initial delay**: 1,000ms
- **Backoff multiplier**: Delays double on each consecutive failure (1s $\rightarrow$ 2s $\rightarrow$ 4s).
- **Permanent Failure Shield**: Client-side failures (status codes `400` to `499`, such as invalid recipient addresses or authorization issues) throw immediately and skip the retry loop to conserve server resources.

### 1.3 Asynchronous Non-blocking Dispatch

Sending emails synchronously can degrade API response times. NexCart handles this using a non-blocking queueing pattern:

- The controller calls `dispatchEmailAsync(sendFn)`.
- It executes the sending function inside Node.js's `setImmediate` macro-task queue.
- This immediately frees up the current request-response execution thread, letting Express reply to the user instantly while SMTP operations are processed in the background.
- Errors thrown during background dispatch are caught and printed to `console.error` to prevent Node process crashes.

---

## 2. Rate Limiting & Anti-Abuse (OTP)

To prevent mail fatigue, SMTP spamming, and credential abuse, NexCart enforces strict sliding-window rate limits for OTP (One-Time Password) generation:

| Constraint Type     | Limit Threshold                  | Action on Violation                                                           |
| :------------------ | :------------------------------- | :---------------------------------------------------------------------------- |
| **Cooldown Period** | Max 1 request per **60 seconds** | Throws: `"Please wait 60 seconds before requesting another OTP."`             |
| **Hourly Limit**    | Max 5 requests per **1 hour**    | Throws: `"Maximum OTP request limit reached. Please try again in X minutes."` |

### 2.1 Database Schema (Prisma)

Rate-limit state and OTP records are persisted across servers in the database:

```prisma
model EmailOTP {
  id          String          @id @default(uuid())
  email       String
  otpHash     String
  purpose     EmailOtpPurpose // 'VERIFICATION' or 'PASSWORD_RESET'
  attempts    Int             @default(0)       // Lockout after 5 failed verification attempts
  pendingData String?         // Serialized JSON of registration payloads (pre-verification)
  expiresAt   DateTime        // Codes expire after 5 minutes
  createdAt   DateTime        @default(now())

  @@unique([email, purpose])
}

model OtpRateLimit {
  id              String   @id @default(uuid())
  email           String   @unique
  requestCount    Int      // Incremented count of requests in current hourly window
  windowStartedAt DateTime // Timestamp marking start of current 1-hour window
  lastRequestedAt DateTime // Timestamp of the last OTP request
}
```

### 2.2 Background Database Cleanup Job

To prevent table bloat from unverified registrations and expired reset tokens, an hourly background job processes cleanups:

- File location: [otpCleanupJob.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/jobs/otpCleanupJob.js).
- Runs immediately on server startup, and then executes periodically every **1 hour**.
- Performs a batch delete: `DELETE FROM EmailOTP WHERE expiresAt < NOW()`.

---

## 3. Security Auditing Policy

All transaction email activity writes to the security audit logger (`logSecurityAudit`):

- Sanitizes details: Automatically redacts critical secrets (e.g., `otp`, `password`, `token`, `otpHash`, `newPassword`, `currentPassword`) before printing to standard log logs.
- Key Audited Events:
  - `OTP_GENERATED`
  - `OTP_SENT`
  - `OTP_VERIFICATION_FAILED`
  - `OTP_VERIFICATION_SUCCESS`
  - `OTP_LOCKOUT`
  - `EMAIL_SEND_SUCCESS`
  - `EMAIL_SEND_RETRY`
  - `EMAIL_SEND_PERMANENT_FAILURE`
  - `EMAIL_SEND_MAX_RETRIES_EXCEEDED`
  - `OTP_RATE_LIMIT_EXCEEDED_60S`
  - `OTP_RATE_LIMIT_EXCEEDED_HOURLY`

---

## 4. Comprehensive Notification Triggers

NexCart sends **16 different email notifications** mapped across various platform events and user roles:

### 4.1 Authentication & Onboarding

1. **Email Verification OTP** (`sendVerificationOtp`)
   - **Recipient**: Unverified registration applicant (Customer or Wholesaler).
   - **Payload**: Contains a 6-digit verification code.
   - **Expiration**: 5 minutes.
2. **Customer Welcome Email** (`sendWelcomeEmail`)
   - **Recipient**: Newly verified Customer.
   - **Trigger**: Successfully verifying the registration OTP.
   - **Action**: Provides links to browse the wholesale marketplace.

3. **Wholesaler Application Received** (`sendWholesalerApplicationEmail`)
   - **Recipient**: Wholesaler applicant.
   - **Trigger**: Submitting the wholesaler onboarding application.
   - **Content**: Summary card showing Business Name, Address, Phone, and Tax ID.

4. **Password Reset OTP** (`sendPasswordResetOtp`)
   - **Recipient**: User requesting a password reset.
   - **Trigger**: Clicking "Forgot password" and submitting a valid email.
   - **Expiration**: 5 minutes.

5. **Wholesaler Onboarding Approved** (`sendWholesalerApprovalEmail`)
   - **Recipient**: Approved Wholesaler.
   - **Trigger**: Platform Super Admin approving the wholesaler profile.
   - **Content**: Notification of active store catalog status and B2B feature enablement.

6. **Wholesaler Onboarding Rejected** (`sendWholesalerRejectionEmail`)
   - **Recipient**: Wholesaler applicant.
   - **Trigger**: Platform Super Admin rejecting the application.
   - **Content**: Contains the administrator's review feedback/rejection reason and a link to update details.

### 4.2 Account Administration

7. **Wholesaler Account Suspended** (`sendWholesalerSuspensionEmail`)
   - **Recipient**: Suspended Wholesaler.
   - **Trigger**: Administrative store suspension due to policy violations.
   - **Action**: Advises that items are hidden and prompts user to contact support.

8. **Wholesaler Account Reactivated** (`sendWholesalerReactivationEmail`)
   - **Recipient**: Reactivated Wholesaler.
   - **Trigger**: Administrative lifting of store suspension.
   - **Action**: Confirms visibility of items is restored and prompts log in.

### 4.3 E-Commerce & Transaction Actions

9. **Customer Order Confirmation** (`sendOrderConfirmation`)
   - **Recipient**: Purchasing Customer.
   - **Trigger**: Successful payment processing or COD checkout completion.
   - **Content**: Rich summary showing Order ID, Payment Method, Shipping Address, and a detailed HTML item table listing quantities, unit pricing, and the Grand Total.

10. **Order Status Update** (`sendOrderStatusUpdate`)
    - **Recipient**: Purchasing Customer.
    - **Trigger**: Order transitions into a new fulfillment state.
    - **Custom Banners**:
      - `SHIPPED` $\rightarrow$ Shows 🚚 "Your order has been shipped!"
      - `OUT_FOR_DELIVERY` $\rightarrow$ Shows 🛵 "Your order is out for delivery!"
      - `DELIVERED` $\rightarrow$ Shows ✅ "Delivered successfully!"
      - `CANCELLED` $\rightarrow$ Shows ❌ "Order cancelled."

11. **Refund Notification** (`sendRefundNotification`)
    - **Recipient**: Customer.
    - **Trigger**: Wholesaler or system initiating/completing a return/cancellation refund.
    - **Content**: Details the refund amount (in INR), product name, and payment settlement timelines (e.g. 5-7 business days).

12. **Return Request Decision** (`sendReturnNotification`)
    - **Recipient**: Customer.
    - **Trigger**: Wholesaler approving or rejecting a return request.
    - **Content**: Informs of decision (`APPROVED` or `REJECTED`). If rejected, includes the wholesaler's rejection comments.

### 4.4 Wholesaler Fulfillment Actions

13. **Wholesaler New Order Alert** (`sendSellerNewOrderNotification`)
    - **Recipient**: Wholesaler (Seller).
    - **Trigger**: Customer checkout containing items from this seller.
    - **Content**: Rich summary displaying Order ID, Total Value, and a table of products to fulfill.

14. **Wholesaler Cancellation Alert** (`sendSellerCancellationNotification`)
    - **Recipient**: Wholesaler (Seller).
    - **Trigger**: Customer cancelling an item from an active order.
    - **Content**: Details of the cancelled product, quantity, and cancellation reason.

15. **Wholesaler Return Request Alert** (`sendSellerReturnRequestNotification`)
    - **Recipient**: Wholesaler (Seller).
    - **Trigger**: Customer initiating a return request.
    - **Content**: Product details, return quantity, customer reason, and a button to view and approve/reject.

16. **Wholesaler B2B RFQ Alert** (`sendSellerRfqNotification`)
    - **Recipient**: Wholesaler (Seller).
    - **Trigger**: Customer requesting a custom wholesale quote.
    - **Content**: Details product, requested quantity, target price (in INR), and additional customer comments.
