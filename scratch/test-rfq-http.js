import jwt from 'jsonwebtoken';
import axios from 'axios';

const JWT_SECRET = 'LCEkHjLXUOUE6xfYFRZ+xoUZyW1B9OA88DcUnWgnrlk=';

async function main() {
  const payload = {
    userId: '1a4d85d6-0c94-416f-9b38-c7abd6a073c1',
    role: 'WHOLESALER',
    wholesalerId: 'c7a0fdea-0639-475b-bd82-4b8ab90427c0',
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  console.log('Signed Token:', token);

  try {
    const res = await axios.get('http://localhost:5000/api/b2b/rfq', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('HTTP Response status:', res.status);
    console.log('HTTP RFQs returned count:', res.data.rfqs?.length);
    console.log('HTTP RFQs details:', JSON.stringify(res.data.rfqs, null, 2));
  } catch (error) {
    console.error('HTTP request failed:', error.message);
    if (error.response) {
      console.error('HTTP Response details:', error.response.status, error.response.data);
    }
  }
}

main();
