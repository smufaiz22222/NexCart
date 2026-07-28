import dotenv from 'dotenv';
import path from 'path';
import { sendVerificationOtp } from '../src/services/emailService.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('BREVO_API_KEY from process.env:', process.env.BREVO_API_KEY);
console.log('BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL);

try {
  const result = await sendVerificationOtp('smufaiz2222@gmail.com', '123456');
  console.log('Result:', result);
} catch (error) {
  console.error('Error occurred:', error);
}
