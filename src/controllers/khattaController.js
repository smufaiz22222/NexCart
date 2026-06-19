import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../config/db.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const processKhattaImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const base64Data = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      Extract transaction lines from this invoice. 
      Return ONLY a raw JSON array.
      Fields: 
      "customerEmail": (Best guess email from name), 
      "amount": (Number, negative for debt/invoice), 
      "notes": (Item description),
      "isTotal": (Boolean: true if this row is the Grand Total/Subtotal)
    `;

    const result = await model.generateContent([
      { inlineData: { data: base64Data, mimeType } },
      prompt,
    ]);
    const cleanJsonString = result.response
      .text()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    res.status(200).json({ entries: JSON.parse(cleanJsonString) });
  } catch (error) {
    console.error('AI SCAN ERROR:', error);
    res.status(500).json({ error: 'AI Error' });
  }
};
export const saveKhattaEntries = async (req, res) => {
  try {
    const { entries } = req.body;
    const wholesalerId = req.user.wholesalerId;

    const savedEntries = await prisma.$transaction(async (tx) => {
      const emails = [...new Set(entries.map(e => e.customerEmail).filter(Boolean))];

      const customers = await tx.user.findMany({
        where: {
          email: { in: emails },
          role: 'CUSTOMER',
        },
      });

      const customerMap = new Map(customers.map(c => [c.email.toLowerCase(), c]));
      const results = [];

      for (const entry of entries) {
        const customer = entry.customerEmail ? customerMap.get(entry.customerEmail.toLowerCase()) : null;

        if (customer) {
          const newEntry = await tx.ledgerEntry.create({
            data: {
              wholesalerId,
              userId: customer.id,
              amount: parseFloat(entry.amount),
              description: `AI Scan: ${entry.notes}`,
              referenceId: 'AI_UPLOAD',
            },
          });
          results.push(newEntry);
        }
      }
      return results;
    });

    res
      .status(201)
      .json({ message: `Successfully created ${savedEntries.length} entries`, data: savedEntries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save to database' });
  }
};
