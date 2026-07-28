import Razorpay from 'razorpay';

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const toNumber = (value) => Number(Number(value || 0).toFixed(2));

export const toPaise = (value) => Math.round(toNumber(value) * 100);

export const getOrderPaymentMetadata = (order) => {
  const reference = String(order?.paymentReference || '').trim();
  const [refOrderId, refPaymentId] = reference.includes(':') ? reference.split(':') : [null, null];
  const fallbackPaymentId = reference && !refPaymentId ? reference : null;

  return {
    razorpayOrderId: order?.razorpayOrderId || refOrderId || null,
    razorpayPaymentId: order?.razorpayPaymentId || refPaymentId || fallbackPaymentId || null,
  };
};

export const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw buildError('Razorpay is not configured on the server', 500);
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

export const createRazorpayRefund = async ({ order, amount, notes = {} }) => {
  const { razorpayPaymentId } = getOrderPaymentMetadata(order);
  if (!razorpayPaymentId) {
    throw buildError('Missing Razorpay payment id for refund processing.', 409);
  }

  const razorpay = getRazorpayClient();
  return razorpay.payments.refund(razorpayPaymentId, {
    amount: toPaise(amount),
    speed: 'normal',
    notes,
  });
};
