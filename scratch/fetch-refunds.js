import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function main() {
  const paymentId = 'pay_T3ramBnxaKXBMn';
  try {
    const refunds = await razorpay.refunds.all({ payment_id: paymentId });
    console.log('Refunds:', refunds);
  } catch (err) {
    console.error('Fetch refunds error:', err);
  }
}

main();
