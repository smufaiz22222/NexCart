// processKhattaImage	Sends a photo of a handwritten ledger/khatta book to Gemini Vision and returns
// extracted customer credit/debit entries as structured JSON
// saveKhattaEntries	Persists AI-extracted entries as LedgerEntry records, matching customers by email
// processPurchaseInvoice	Extracts supplier, totals and line items from a photographed purchase invoice
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { prisma } from '../config/db.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const parseGeminiResponse = (text) => {
  const cleanText = text.trim();
  try {
    return JSON.parse(cleanText);
  } catch (directError) {
    try {
      const match = cleanText.match(/[{[][\s\S]*[}\]]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (regexError) {
      console.error('Failed to parse extracted JSON block:', regexError);
    }
    throw directError;
  }
};

export const processKhattaImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const base64Data = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          description: 'List of transaction entries extracted from the invoice',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              customerEmail: {
                type: SchemaType.STRING,
                description:
                  'Best guess email of the customer from their name, e.g., customer@example.com',
              },
              amount: {
                type: SchemaType.NUMBER,
                description: 'Numeric amount. Negative value for debt/invoice, positive for credit',
              },
              notes: {
                type: SchemaType.STRING,
                description: 'Item description or transaction notes',
              },
              isTotal: {
                type: SchemaType.BOOLEAN,
                description: 'True if this row is the Grand Total or Subtotal, false otherwise',
              },
            },
            required: ['customerEmail', 'amount', 'notes', 'isTotal'],
          },
        },
      },
    });

    const prompt = `
      Extract transaction lines from this invoice.
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

    const parsedData = parseGeminiResponse(result.response.text());
    res.status(200).json({ entries: parsedData });
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
      const emails = [...new Set(entries.map((e) => e.customerEmail).filter(Boolean))];

      const customers = await tx.user.findMany({
        where: {
          email: { in: emails },
          role: 'CUSTOMER',
        },
      });

      const customerMap = new Map(customers.map((c) => [c.email.toLowerCase(), c]));
      const ledgerEntries = entries
        .map((entry) => {
          const customer = entry.customerEmail
            ? customerMap.get(entry.customerEmail.toLowerCase())
            : null;
          const amount = Number.parseFloat(entry.amount);

          if (!customer || Number.isNaN(amount)) {
            return null;
          }

          return {
            wholesalerId,
            userId: customer.id,
            amount,
            description: `AI Scan: ${entry.notes}`,
            referenceId: 'AI_UPLOAD',
          };
        })
        .filter(Boolean);

      if (ledgerEntries.length === 0) {
        return [];
      }

      return tx.ledgerEntry.createManyAndReturn({
        data: ledgerEntries,
      });
    });

    res
      .status(201)
      .json({ message: `Successfully created ${savedEntries.length} entries`, data: savedEntries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save to database' });
  }
};

export const processPurchaseInvoice = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const base64Data = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          description: 'Details extracted from the purchase invoice',
          properties: {
            invoiceNumber: {
              type: SchemaType.STRING,
              description: 'Invoice number string, or null if not found',
              nullable: true,
            },
            supplierName: {
              type: SchemaType.STRING,
              description: 'Supplier or seller business name, or null if not found',
              nullable: true,
            },
            supplierEmail: {
              type: SchemaType.STRING,
              description: 'Supplier or seller email address, or null if not found',
              nullable: true,
            },
            totalAmount: {
              type: SchemaType.NUMBER,
              description: 'Grand total amount of the invoice',
            },
            items: {
              type: SchemaType.ARRAY,
              description: 'List of individual line items purchased',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: {
                    type: SchemaType.STRING,
                    description: 'Name of the product or item',
                  },
                  quantity: {
                    type: SchemaType.NUMBER,
                    description: 'Quantity purchased',
                  },
                  unitPrice: {
                    type: SchemaType.NUMBER,
                    description: 'Unit price of the item',
                  },
                },
                required: ['name', 'quantity', 'unitPrice'],
              },
            },
          },
          required: ['invoiceNumber', 'supplierName', 'supplierEmail', 'totalAmount', 'items'],
        },
      },
    });

    const prompt = `
      Analyze this purchase invoice and extract transaction details.
      The JSON object MUST have the following structure:
      {
        "invoiceNumber": "string representing invoice number (if found, otherwise null)",
        "supplierName": "string representing supplier/seller name (if found, otherwise null)",
        "supplierEmail": "string representing supplier/seller email (if found, otherwise null)",
        "totalAmount": number representing total amount of the invoice,
        "items": [
          {
            "name": "string representing name of product",
            "quantity": number representing quantity purchased,
            "unitPrice": number representing price per unit
          }
        ]
      }
    `;

    const result = await model.generateContent([
      { inlineData: { data: base64Data, mimeType } },
      prompt,
    ]);

    const parsedData = parseGeminiResponse(result.response.text());
    res.status(200).json(parsedData);
  } catch (error) {
    console.error('AI PURCHASE INVOICE SCAN ERROR:', error);
    res.status(500).json({ error: 'AI Error' });
  }
};
