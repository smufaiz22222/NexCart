import 'dotenv/config';
import { sendEmail } from '../src/services/emailService.js';

console.log('Sending test email to smufaiz1234@gmail.com...');

sendEmail({
  to: 'smufaiz1234@gmail.com',
  subject: 'NexCart Direct Test Email',
  htmlContent:
    '<p>Testing direct delivery to smufaiz1234@gmail.com from NexCart Brevo integration.</p>',
})
  .then((res) => {
    console.log('Result:', res);
  })
  .catch((err) => {
    console.error('Error:', err);
  });
