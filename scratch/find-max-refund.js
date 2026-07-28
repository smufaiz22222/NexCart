import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function tryRefund(amount) {
  try {
    const refund = await razorpay.payments.refund('pay_T3ramBnxaKXBMn', {
      amount,
      speed: 'normal',
    });
    console.log(`Refund of ${amount} paise succeeded:`, refund.id);
    return true;
  } catch (err) {
    console.log(`Refund of ${amount} paise failed:`, err.error?.description || err.message || err);
    return false;
  }
}

async function main() {
  // Let's try some values
  await tryRefund(50000); // ₹500
  await tryRefund(20000); // ₹200
  await tryRefund(10000); // ₹100
  await tryRefund(5000); // ₹50
}

main();
