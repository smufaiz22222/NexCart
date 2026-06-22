import { prisma } from '../config/db.js';

// Base API configuration
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Security Audit Logger. Logs events securely without exposing sensitive secrets.
 */
export const logSecurityAudit = (event, details = {}) => {
  const sanitizedDetails = { ...details };
  // Redact secrets
  const sensitiveKeys = ['otp', 'password', 'token', 'otpHash', 'newPassword', 'currentPassword'];
  for (const key of sensitiveKeys) {
    if (sanitizedDetails[key] !== undefined) {
      sanitizedDetails[key] = '[REDACTED]';
    }
  }
  console.log(
    `[SECURITY AUDIT] Event: ${event} | Timestamp: ${new Date().toISOString()} | Details: ${JSON.stringify(sanitizedDetails)}`
  );
};

/**
 * Asynchronous background email dispatcher (non-blocking).
 * Allows controllers to return success immediately while sending happens in the background.
 */
export const dispatchEmailAsync = (sendFn) => {
  setImmediate(() => {
    sendFn().catch((err) => {
      console.error('[Background Email Dispatch Error]', err);
    });
  });
};

/**
 * sliding-window rate limiter for OTP requests.
 * Constraints: Max 1 request per 60s, Max 5 requests per hour.
 */
export const checkOtpRateLimit = async (email) => {
  const now = new Date();
  const rateLimit = await prisma.otpRateLimit.findUnique({
    where: { email },
  });

  if (!rateLimit) {
    // First time requesting OTP
    await prisma.otpRateLimit.create({
      data: {
        email,
        requestCount: 1,
        windowStartedAt: now,
        lastRequestedAt: now,
      },
    });
    return true;
  }

  // Check 60-second limit
  const secondsSinceLast = (now.getTime() - new Date(rateLimit.lastRequestedAt).getTime()) / 1000;
  if (secondsSinceLast < 60) {
    logSecurityAudit('OTP_RATE_LIMIT_EXCEEDED_60S', { email, secondsSinceLast });
    throw new Error('Please wait 60 seconds before requesting another OTP.');
  }

  // Check hourly window limit
  const hoursSinceWindowStart =
    (now.getTime() - new Date(rateLimit.windowStartedAt).getTime()) / (1000 * 60 * 60);
  if (hoursSinceWindowStart >= 1) {
    // Window expired, reset it
    await prisma.otpRateLimit.update({
      where: { email },
      data: {
        requestCount: 1,
        windowStartedAt: now,
        lastRequestedAt: now,
      },
    });
    return true;
  }

  // Inside current hourly window
  if (rateLimit.requestCount >= 5) {
    const minutesRemaining = Math.ceil(60 - hoursSinceWindowStart * 60);
    logSecurityAudit('OTP_RATE_LIMIT_EXCEEDED_HOURLY', {
      email,
      requestCount: rateLimit.requestCount,
    });
    throw new Error(
      `Maximum OTP request limit reached. Please try again in ${minutesRemaining} minutes.`
    );
  }

  // Increment request count
  await prisma.otpRateLimit.update({
    where: { email },
    data: {
      requestCount: rateLimit.requestCount + 1,
      lastRequestedAt: now,
    },
  });
  return true;
};

/**
 * Returns a premium, responsive HTML wrapper for emails.
 */
const getEmailTemplateFrame = (title, contentHtml) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f3f4f6;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1f2937;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .wrapper {
          width: 100%;
          background-color: #f3f4f6;
          padding: 40px 20px;
          box-sizing: border-box;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          border: 1px solid #e5e7eb;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%);
          padding: 32px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.025em;
        }
        .content {
          padding: 40px 32px;
        }
        .content p {
          font-size: 16px;
          line-height: 1.625;
          margin-top: 0;
          margin-bottom: 20px;
          color: #374151;
        }
        .card {
          background-color: #f9fafb;
          border: 1px solid #f3f4f6;
          border-radius: 12px;
          padding: 24px;
          margin: 24px 0;
        }
        .card h2 {
          margin-top: 0;
          margin-bottom: 16px;
          font-size: 18px;
          font-weight: 700;
          color: #111827;
        }
        .btn-container {
          text-align: center;
          margin: 32px 0 16px;
        }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 30px;
          font-weight: 600;
          font-size: 15px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1);
        }
        .footer {
          background-color: #f9fafb;
          padding: 24px 32px;
          text-align: center;
          border-top: 1px solid #f3f4f6;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
        }
        .footer a {
          color: #4f46e5;
          text-decoration: none;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        th {
          text-align: left;
          font-size: 13px;
          color: #6b7280;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        td {
          padding: 12px 0;
          font-size: 14px;
          color: #374151;
          border-bottom: 1px dashed #f3f4f6;
        }
        .total-row td {
          font-weight: 700;
          color: #111827;
          border-bottom: none;
          padding-top: 16px;
          font-size: 16px;
        }
        .otp-display {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-align: center;
          padding: 16px;
          background-color: #f3f4f6;
          border-radius: 8px;
          color: #4f46e5;
          margin: 24px 0;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>NexCart</h1>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            This is an automated notification from NexCart.<br>
            If you have any questions, please reply to this email or visit our <a href="http://localhost:5173/support">Support Center</a>.<br>
            &copy; ${new Date().getFullYear()} NexCart. All rights reserved.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generic function to send an email via Brevo SMTP API, with exponential backoff retries.
 */
export const sendEmail = async ({ to, subject, htmlContent, textContent }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'support@nexcart.local';
  const senderName = process.env.BREVO_SENDER_NAME || 'NexCart Support';

  const isMockMode =
    !apiKey ||
    apiKey === 'your_brevo_api_key_here' ||
    apiKey.trim() === '' ||
    process.env.NODE_ENV === 'test';

  if (isMockMode) {
    if (process.env.NODE_ENV !== 'test') {
      console.log('========================================================================');
      console.log(`[BREVO EMAIL SERVICE - MOCK MODE]`);
      console.log(`To:      ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Sender:  "${senderName}" <${senderEmail}>`);
      console.log(`Text:    ${textContent || '(HTML-only content)'}`);
      console.log('------------------------------------------------------------------------');
      console.log(`HTML Preview:\n${htmlContent.replace(/<[^>]*>/g, ' ').substring(0, 300)}...`);
      console.log('========================================================================');
    }
    return {
      success: true,
      message: 'Email logged in development mock mode',
      messageId: 'mock-id',
    };
  }

  const maxAttempts = 3;
  let attempt = 0;
  let delay = 1000;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
          subject: subject,
          htmlContent: htmlContent,
          ...(textContent ? { textContent } : {}),
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const errBody = await response.json().catch(() => ({}));

        // Permanent failure (4xx client/validation errors) - do not retry
        if (status >= 400 && status < 500) {
          logSecurityAudit('EMAIL_SEND_PERMANENT_FAILURE', { to, status, error: errBody });
          throw new Error(`Permanent email sending failure: ${JSON.stringify(errBody)}`);
        }

        // Transient failure (5xx server errors, rate limits) - retry
        throw new Error(
          `Transient email sending failure status ${status}: ${JSON.stringify(errBody)}`
        );
      }

      const result = await response.json();
      logSecurityAudit('EMAIL_SEND_SUCCESS', { to, subject });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      if (error.message.startsWith('Permanent')) {
        throw error;
      }
      if (attempt >= maxAttempts) {
        logSecurityAudit('EMAIL_SEND_MAX_RETRIES_EXCEEDED', {
          to,
          subject,
          attempts: attempt,
          error: error.message,
        });
        return { success: false, error: error.message };
      }
      logSecurityAudit('EMAIL_SEND_RETRY', {
        to,
        subject,
        attempt,
        error: error.message,
        nextDelayMs: delay,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }
};

/**
 * 1. Sends an OTP code for user email verification.
 */
export const sendVerificationOtp = async (email, otp) => {
  const subject = 'Verify your NexCart Email Address';
  const htmlContent = getEmailTemplateFrame(
    subject,
    `
    <p>Thank you for signing up for NexCart! Please use the following 6-digit verification code to complete your registration:</p>
    <div class="otp-display">${otp}</div>
    <p>This code will expire in <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
    `
  );

  logSecurityAudit('OTP_SENT', { email, purpose: 'VERIFICATION' });

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    textContent: `Your NexCart verification code is: ${otp}. This code expires in 5 minutes.`,
  });
};

/**
 * 2. Sends welcome email to customer.
 */
export const sendWelcomeEmail = async (user) => {
  const subject = `Welcome to NexCart, ${user.name}!`;
  const htmlContent = getEmailTemplateFrame(
    subject,
    `
    <p>Hi ${user.name},</p>
    <p>Welcome to <strong>NexCart</strong>! We're excited to have you join our B2B e-commerce platform.</p>
    <p>Start exploring our wholesale marketplace to discover top-quality items, establish RFQs with top vendors, and source efficiently for your business.</p>
    <div class="btn-container">
      <a href="http://localhost:5173/marketplace" class="btn">Browse Marketplace</a>
    </div>
    `
  );

  return sendEmail({
    to: user.email,
    subject,
    htmlContent,
    textContent: `Hi ${user.name}, welcome to NexCart! Visit http://localhost:5173/marketplace to start browsing.`,
  });
};

/**
 * 3. Sends welcome email/application receipt to wholesaler.
 */
export const sendWholesalerApplicationEmail = async (user, profile) => {
  const subject = 'Your Wholesaler Application has been Received';
  const htmlContent = getEmailTemplateFrame(
    subject,
    `
    <p>Hi ${user.name},</p>
    <p>Thank you for submitting your application to become a verified Wholesaler on NexCart!</p>
    <p>Our administrators are currently reviewing your profile details:</p>
    <div class="card">
      <h2>Application Summary</h2>
      <p style="margin-bottom: 8px;"><strong>Business Name:</strong> ${profile.businessName || 'N/A'}</p>
      <p style="margin-bottom: 8px;"><strong>Business Phone:</strong> ${profile.businessPhone || 'N/A'}</p>
      <p style="margin-bottom: 8px;"><strong>Business Address:</strong> ${profile.businessAddress || 'N/A'}</p>
      <p style="margin-bottom: 0;"><strong>Tax ID:</strong> ${profile.taxId || 'N/A'}</p>
    </div>
    <p>We will notify you immediately once your onboarding application has been processed by our review board.</p>
    `
  );

  return sendEmail({
    to: user.email,
    subject,
    htmlContent,
    textContent: `Hi ${user.name}, thank you for your application to become a wholesaler on NexCart for ${profile.businessName}. We are reviewing your details.`,
  });
};

/**
 * 4. Sends password reset OTP.
 */
export const sendPasswordResetOtp = async (email, otp) => {
  const subject = 'Reset your NexCart Password';
  const htmlContent = getEmailTemplateFrame(
    subject,
    `
    <p>You requested to reset your password. Please use the following 6-digit OTP code to complete the process:</p>
    <div class="otp-display">${otp}</div>
    <p>This code will expire in <strong>5 minutes</strong>. If you did not request a password reset, please secure your account immediately.</p>
    `
  );

  logSecurityAudit('OTP_SENT', { email, purpose: 'PASSWORD_RESET' });

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    textContent: `Your NexCart password reset code is: ${otp}. This code expires in 5 minutes.`,
  });
};

/**
 * 5. Sends order confirmation details to customer.
 */
export const sendOrderConfirmation = async (orderId) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { name: true, email: true } },
        items: { include: { product: true } },
      },
    });

    if (!order || !order.buyer) return;

    const {
      buyer,
      items,
      totalAmount,
      paymentMethod,
      shippingStreet,
      shippingCity,
      shippingState,
      shippingPostalCode,
    } = order;
    const subject = `Order Confirmed: #${orderId.substring(0, 8).toUpperCase()}`;

    let itemsTableRows = '';
    for (const item of items) {
      const productName = item.product?.name || 'Product';
      const quantity = item.quantity;
      const price = Number(item.price);
      const subtotal = quantity * price;
      itemsTableRows += `
        <tr>
          <td>${productName} ${item.selectedSize ? `(Size: ${item.selectedSize})` : ''}</td>
          <td>${quantity}</td>
          <td>${price.toFixed(2)} INR</td>
          <td style="text-align: right;">${subtotal.toFixed(2)} INR</td>
        </tr>
      `;
    }

    const htmlContent = getEmailTemplateFrame(
      subject,
      `
      <p>Hi ${buyer.name},</p>
      <p>Thank you for shopping with us! We have received your order and are currently processing it.</p>
      
      <div class="card">
        <h2>Order Summary</h2>
        <p style="margin-bottom: 8px;"><strong>Order ID:</strong> ${orderId.toUpperCase()}</p>
        <p style="margin-bottom: 8px;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p style="margin-bottom: 8px;"><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p style="margin-bottom: 0;"><strong>Shipping To:</strong> ${shippingStreet}, ${shippingCity}, ${shippingState} - ${shippingPostalCode}</p>
      </div>

      <div class="card">
        <h2>Items Ordered</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 50%;">Item</th>
              <th style="width: 10%;">Qty</th>
              <th style="width: 20%;">Price</th>
              <th style="width: 20%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTableRows}
            <tr class="total-row">
              <td colspan="3">Grand Total</td>
              <td style="text-align: right;">${Number(totalAmount).toFixed(2)} INR</td>
            </tr>
          </tbody>
        </table>
      </div>
      `
    );

    return sendEmail({
      to: buyer.email,
      subject,
      htmlContent,
      textContent: `Hi ${buyer.name}, your order #${orderId.substring(0, 8).toUpperCase()} has been confirmed. Total amount is ${Number(totalAmount).toFixed(2)} INR.`,
    });
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
  }
};

// Map older name to new name for safety/compatibility
export const sendOrderConfirmationEmail = sendOrderConfirmation;

/**
 * 6. Sends order status updates (Shipped, Out for Delivery, Delivered, Cancelled) to buyer.
 */
export const sendOrderStatusUpdate = async (orderId, status) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { name: true, email: true } },
      },
    });

    if (!order || !order.buyer) return;

    let statusText = '';
    let statusIcon = '📦';
    let subject = `Order Status Update: #${orderId.substring(0, 8).toUpperCase()}`;

    if (status === 'SHIPPED') {
      statusText = 'has been shipped and is on its way!';
      statusIcon = '🚚';
      subject = `Your order #${orderId.substring(0, 8).toUpperCase()} has been shipped!`;
    } else if (status === 'OUT_FOR_DELIVERY') {
      statusText = 'is out for delivery today!';
      statusIcon = '🛵';
      subject = `Your order #${orderId.substring(0, 8).toUpperCase()} is out for delivery!`;
    } else if (status === 'DELIVERED') {
      statusText = 'has been successfully delivered!';
      statusIcon = '✅';
      subject = `Delivered: Order #${orderId.substring(0, 8).toUpperCase()}`;
    } else if (status === 'CANCELLED') {
      statusText = 'has been cancelled.';
      statusIcon = '❌';
      subject = `Cancelled: Order #${orderId.substring(0, 8).toUpperCase()}`;
    } else {
      statusText = `status is now "${status}".`;
    }

    const htmlContent = getEmailTemplateFrame(
      subject,
      `
      <p>Hi ${order.buyer.name},</p>
      <div class="card" style="text-align: center; padding: 32px 16px;">
        <div style="font-size: 48px; margin-bottom: 16px;">${statusIcon}</div>
        <h2 style="margin: 0; font-size: 20px;">Order #${orderId.substring(0, 8).toUpperCase()} ${statusText}</h2>
      </div>
      <p>Click below to view order details and track your delivery status.</p>
      <div class="btn-container">
        <a href="http://localhost:5173/orders" class="btn">Track Order Details</a>
      </div>
      `
    );

    return sendEmail({
      to: order.buyer.email,
      subject,
      htmlContent,
      textContent: `Hi ${order.buyer.name}, your order #${orderId.substring(0, 8).toUpperCase()} status is now ${status}.`,
    });
  } catch (error) {
    console.error('Failed to send order status update email:', error);
  }
};

/**
 * 7. Sends refund notification (initiated/completed) to buyer.
 */
export const sendRefundNotification = async (orderId, itemId, type) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { name: true, email: true } },
        items: {
          where: { id: itemId },
          include: { product: true },
        },
      },
    });

    if (!order || !order.buyer || !order.items?.length) return;

    const item = order.items[0];
    const productName = item.product?.name || 'Product';
    const amount = Number(item.subtotalAtPurchase || item.price * item.quantity);
    const subject = `Refund Notification: Order #${orderId.substring(0, 8).toUpperCase()}`;
    const actionText = type === 'INITIATED' ? 'initiated' : 'completed successfully';

    const htmlContent = getEmailTemplateFrame(
      subject,
      `
      <p>Hi ${order.buyer.name},</p>
      <p>This is to inform you that a refund of <strong>${amount.toFixed(2)} INR</strong> for the item <strong>"${productName}"</strong> (Order #${orderId.substring(0, 8).toUpperCase()}) has been <strong>${actionText}</strong>.</p>
      <p>${type === 'INITIATED' ? 'It usually takes 5-7 business days for the funds to reflect in your source account.' : 'The refund amount has been credited back to your account.'}</p>
      `
    );

    return sendEmail({
      to: order.buyer.email,
      subject,
      htmlContent,
      textContent: `Hi ${order.buyer.name}, a refund of ${amount.toFixed(2)} INR for "${productName}" has been ${actionText}.`,
    });
  } catch (error) {
    console.error('Failed to send refund notification email:', error);
  }
};

/**
 * 8. Sends return notification (approved/rejected) to buyer.
 */
export const sendReturnNotification = async (orderId, itemId, type) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { name: true, email: true } },
        items: {
          where: { id: itemId },
          include: { product: true },
        },
      },
    });

    if (!order || !order.buyer || !order.items?.length) return;

    const item = order.items[0];
    const productName = item.product?.name || 'Product';
    const subject = `Return Request Update: Order #${orderId.substring(0, 8).toUpperCase()}`;
    const decisionText = type === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    const htmlContent = getEmailTemplateFrame(
      subject,
      `
      <p>Hi ${order.buyer.name},</p>
      <p>Your return request for item <strong>"${productName}"</strong> under Order #${orderId.substring(0, 8).toUpperCase()} has been <strong>${decisionText}</strong> by the wholesaler.</p>
      ${
        type === 'APPROVED'
          ? '<p>Please prepare the package for return collection. A refund will be processed once we receive the item.</p>'
          : `<p><strong>Reason for rejection:</strong> ${item.rejectionReason || 'Details do not match return criteria.'}</p>`
      }
      `
    );

    return sendEmail({
      to: order.buyer.email,
      subject,
      htmlContent,
      textContent: `Hi ${order.buyer.name}, your return request for "${productName}" has been ${decisionText}.`,
    });
  } catch (error) {
    console.error('Failed to send return notification email:', error);
  }
};

/**
 * 9. Sends a notification to the Wholesaler when a new order is received.
 */
export const sendSellerNewOrderNotification = async (orderId) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        seller: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
        buyer: { select: { name: true } },
        items: { include: { product: true } },
      },
    });

    if (!order || !order.seller?.user) return;

    const subject = `New Order Received: #${orderId.substring(0, 8).toUpperCase()}`;

    let itemsTableRows = '';
    for (const item of order.items) {
      const productName = item.product?.name || 'Product';
      const quantity = item.quantity;
      const price = Number(item.price);
      itemsTableRows += `
        <tr>
          <td>${productName} ${item.selectedSize ? `(Size: ${item.selectedSize})` : ''}</td>
          <td>${quantity}</td>
          <td style="text-align: right;">${(price * quantity).toFixed(2)} INR</td>
        </tr>
      `;
    }

    const htmlContent = getEmailTemplateFrame(
      subject,
      `
      <p>Hi ${order.seller.user.name},</p>
      <p>Congratulations! You have received a new order from <strong>${order.buyer.name}</strong>.</p>
      
      <div class="card">
        <h2>Order Details</h2>
        <p style="margin-bottom: 8px;"><strong>Order ID:</strong> ${orderId.toUpperCase()}</p>
        <p style="margin-bottom: 8px;"><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        <p style="margin-bottom: 0;"><strong>Total Value:</strong> ${Number(order.totalAmount).toFixed(2)} INR</p>
      </div>

      <div class="card">
        <h2>Items Summary</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 60%;">Item</th>
              <th style="width: 15%;">Qty</th>
              <th style="width: 25%; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTableRows}
          </tbody>
        </table>
      </div>
      
      <div class="btn-container">
        <a href="http://localhost:5173/wholesaler/orders" class="btn">Manage Order in Dashboard</a>
      </div>
      `
    );

    return sendEmail({
      to: order.seller.user.email,
      subject,
      htmlContent,
      textContent: `Hi ${order.seller.user.name}, you have received a new order #${orderId.substring(0, 8).toUpperCase()} of total amount ${Number(order.totalAmount).toFixed(2)} INR.`,
    });
  } catch (error) {
    console.error('Failed to send wholesaler new order alert email:', error);
  }
};

/**
 * 10. Sends cancellation alert email to Wholesaler.
 */
export const sendSellerCancellationNotification = async (orderId, itemId, reason) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        seller: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
        buyer: { select: { name: true } },
        items: {
          where: { id: itemId },
          include: { product: true },
        },
      },
    });

    if (!order || !order.seller?.user || !order.items?.length) return;

    const item = order.items[0];
    const productName = item.product?.name || 'Product';
    const subject = `Order Cancellation Alert: #${orderId.substring(0, 8).toUpperCase()}`;

    const htmlContent = getEmailTemplateFrame(
      subject,
      `
      <p>Hi ${order.seller.user.name},</p>
      <p>This is to notify you that the buyer <strong>${order.buyer.name}</strong> has cancelled the following item from order #${orderId.substring(0, 8).toUpperCase()}:</p>
      <div class="card">
        <p style="margin-bottom: 8px;"><strong>Item:</strong> ${productName}</p>
        <p style="margin-bottom: 8px;"><strong>Quantity:</strong> ${item.quantity}</p>
        <p style="margin-bottom: 0;"><strong>Reason:</strong> ${reason || 'N/A'}</p>
      </div>
      <p>The inventory stock for this item has been automatically restored.</p>
      `
    );

    return sendEmail({
      to: order.seller.user.email,
      subject,
      htmlContent,
      textContent: `Hi ${order.seller.user.name}, buyer ${order.buyer.name} cancelled item "${productName}" from order #${orderId.substring(0, 8).toUpperCase()}.`,
    });
  } catch (error) {
    console.error('Failed to send wholesaler cancellation alert email:', error);
  }
};

/**
 * 11. Sends return request alert email to Wholesaler.
 */
export const sendSellerReturnRequestNotification = async (orderId, itemId, reason) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        seller: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
        buyer: { select: { name: true } },
        items: {
          where: { id: itemId },
          include: { product: true },
        },
      },
    });

    if (!order || !order.seller?.user || !order.items?.length) return;

    const item = order.items[0];
    const productName = item.product?.name || 'Product';
    const subject = `New Return Request: Order #${orderId.substring(0, 8).toUpperCase()}`;

    const htmlContent = getEmailTemplateFrame(
      subject,
      `
      <p>Hi ${order.seller.user.name},</p>
      <p>You have received a new return request from <strong>${order.buyer.name}</strong> for order #${orderId.substring(0, 8).toUpperCase()}:</p>
      <div class="card">
        <p style="margin-bottom: 8px;"><strong>Item:</strong> ${productName}</p>
        <p style="margin-bottom: 8px;"><strong>Quantity:</strong> ${item.returnedQuantity || item.quantity}</p>
        <p style="margin-bottom: 0;"><strong>Reason:</strong> ${reason || 'N/A'}</p>
      </div>
      <div class="btn-container">
        <a href="http://localhost:5173/wholesaler/orders" class="btn">Review Return Request</a>
      </div>
      `
    );

    return sendEmail({
      to: order.seller.user.email,
      subject,
      htmlContent,
      textContent: `Hi ${order.seller.user.name}, buyer ${order.buyer.name} requested return for "${productName}" under order #${orderId.substring(0, 8).toUpperCase()}.`,
    });
  } catch (error) {
    console.error('Failed to send wholesaler return request alert email:', error);
  }
};

/**
 * 12. Sends B2B RFQ alert email to Wholesaler.
 */
export const sendSellerRfqNotification = async (rfqId) => {
  try {
    const rfq = await prisma.rfq.findUnique({
      where: { id: rfqId },
      include: {
        seller: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
        buyer: { select: { name: true } },
        product: { select: { name: true } },
        BusinessProfile: { select: { companyName: true } },
      },
    });

    if (!rfq || !rfq.seller?.user) return;

    const companyName = rfq.BusinessProfile?.companyName || rfq.buyer.name;
    const subject = `New B2B RFQ Received: RFQ #${rfqId.substring(0, 8).toUpperCase()}`;

    const htmlContent = getEmailTemplateFrame(
      subject,
      `
      <p>Hi ${rfq.seller.user.name},</p>
      <p>You have received a new B2B Request for Quote (RFQ) from <strong>${companyName}</strong>:</p>
      <div class="card">
        <p style="margin-bottom: 8px;"><strong>Product:</strong> ${rfq.product.name}</p>
        <p style="margin-bottom: 8px;"><strong>Quantity Requested:</strong> ${rfq.quantity} units</p>
        <p style="margin-bottom: 8px;"><strong>Target Price:</strong> ${rfq.targetPrice} INR / unit</p>
        <p style="margin-bottom: 0;"><strong>Notes:</strong> ${rfq.notes || 'None'}</p>
      </div>
      <div class="btn-container">
        <a href="http://localhost:5173/wholesaler/rfqs" class="btn">Respond to RFQ</a>
      </div>
      `
    );

    return sendEmail({
      to: rfq.seller.user.email,
      subject,
      htmlContent,
      textContent: `Hi ${rfq.seller.user.name}, you received a B2B RFQ from ${companyName} for product "${rfq.product.name}" (Qty: ${rfq.quantity}, Target: ${rfq.targetPrice} INR).`,
    });
  } catch (error) {
    console.error('Failed to send wholesaler RFQ alert email:', error);
  }
};

/**
 * 13. Wholesaler application approved.
 */
export const sendWholesalerApprovalEmail = async (user, profile) => {
  const subject = 'Congratulations! Your Wholesaler Application is Approved';
  const htmlContent = getEmailTemplateFrame(
    subject,
    `
    <p>Hi ${user.name},</p>
    <p>Excellent news! Your application to register <strong>${profile.businessName}</strong> as a verified wholesaler on NexCart has been approved by our administrators.</p>
    <p>Your shop is now active. You have full access to:
      <ul>
        <li>List and manage your B2B/marketplace catalog</li>
        <li>View orders and manage customer invoices</li>
        <li>Utilize the AI Khatta Vision Parser to digitize manual ledger logs</li>
        <li>Access advanced recommendations & sales analytics</li>
      </ul>
    </p>
    <div class="btn-container">
      <a href="http://localhost:5173/wholesaler/dashboard" class="btn">Launch Wholesaler Dashboard</a>
    </div>
    `
  );

  return sendEmail({
    to: user.email,
    subject,
    htmlContent,
    textContent: `Hi ${user.name}, congratulations! Your wholesaler profile for ${profile.businessName} is approved. Log in at http://localhost:5173/wholesaler/dashboard to get started.`,
  });
};

/**
 * 14. Wholesaler application rejected.
 */
export const sendWholesalerRejectionEmail = async (user, profile, reason) => {
  const subject = 'Update regarding your Wholesaler Application';
  const htmlContent = getEmailTemplateFrame(
    subject,
    `
    <p>Hi ${user.name},</p>
    <p>Thank you for your interest in registering <strong>${profile.businessName}</strong> as a wholesaler on NexCart.</p>
    <p>After a careful review of your application, our team found that your details could not be verified at this time.</p>
    <div class="card" style="border-left: 4px solid #ef4444;">
      <h2>Review Notes</h2>
      <p style="margin: 0; color: #b91c1c;">${reason || 'Application details require revision.'}</p>
    </div>
    <p>You can review and update your profile details in your account settings and submit it again for verification.</p>
    <div class="btn-container">
      <a href="http://localhost:5173/wholesaler/profile" class="btn">Update Profile & Resubmit</a>
    </div>
    `
  );

  return sendEmail({
    to: user.email,
    subject,
    htmlContent,
    textContent: `Hi ${user.name}, your wholesaler application for ${profile.businessName} needs revision: ${reason || 'Details require revision.'}. Update profile at http://localhost:5173/wholesaler/profile.`,
  });
};

/**
 * 15. Wholesaler account suspended.
 */
export const sendWholesalerSuspensionEmail = async (user, profile) => {
  const subject = 'Important: Wholesaler Account Suspended';
  const htmlContent = getEmailTemplateFrame(
    subject,
    `
    <p>Hi ${user.name},</p>
    <p>This is to notify you that your Wholesaler store <strong>${profile.businessName}</strong> has been suspended by NexCart administration.</p>
    <p>During a suspension, your listed products are hidden from the marketplace, and you cannot process new RFQs or invoices.</p>
    <p>If you believe this suspension is in error or would like to appeal, please contact support immediately.</p>
    `
  );

  return sendEmail({
    to: user.email,
    subject,
    htmlContent,
    textContent: `Hi ${user.name}, your wholesaler account for ${profile.businessName} has been suspended. Please contact support for assistance.`,
  });
};

/**
 * 16. Wholesaler account reactivated.
 */
export const sendWholesalerReactivationEmail = async (user, profile) => {
  const subject = 'Good news: Your Wholesaler Account is Reactivated';
  const htmlContent = getEmailTemplateFrame(
    subject,
    `
    <p>Hi ${user.name},</p>
    <p>We are pleased to inform you that your Wholesaler account for <strong>${profile.businessName}</strong> has been reactivated.</p>
    <p>Your items are again visible on the marketplace, and you can resume business operations as usual.</p>
    <div class="btn-container">
      <a href="http://localhost:5173/login" class="btn">Log In to Account</a>
    </div>
    `
  );

  return sendEmail({
    to: user.email,
    subject,
    htmlContent,
    textContent: `Hi ${user.name}, your wholesaler account for ${profile.businessName} has been reactivated. Log in at http://localhost:5173/login.`,
  });
};
