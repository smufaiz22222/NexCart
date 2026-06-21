import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function main() {
  const paymentId = 'pay_T3ramBnxaKXBMn';

  console.log('--- Attempt 1: only 89000 paise with speed normal ---');
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: 89000,
      speed: 'normal',
    });
    console.log('Attempt 1 Success:', refund);
    return;
  } catch (err) {
    console.error('Attempt 1 error description:', err.error?.description || err.message || err);
  }

  console.log('--- Attempt 2: amount and speed ---');
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: 99900,
      speed: 'normal',
    });
    console.log('Attempt 2 Success:', refund);
    return;
  } catch (err) {
    console.error('Attempt 2 error description:', err.error?.description || err.message || err);
  }

  console.log('--- Attempt 3: only notes ---');
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      notes: {
        orderId: '7355f559-3e38-4ead-8ddb-10a0e34cdfc1',
      },
    });
    console.log('Attempt 3 Success:', refund);
    return;
  } catch (err) {
    console.error('Attempt 3 error description:', err.error?.description || err.message || err);
  }

  console.log('--- Attempt 4: no options ---');
  try {
    const refund = await razorpay.payments.refund(paymentId);
    console.log('Attempt 4 Success:', refund);
    return;
  } catch (err) {
    console.error('Attempt 4 error description:', err.error?.description || err.message || err);
  }
}

main();
