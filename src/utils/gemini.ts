import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(API_KEY);

// ─── Shared Types ─────────────────────────────────────
export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  quantity: string;
  category: string;
}

// ─── Voice NLP: parse spoken transaction text ─────────
export async function parseVoiceWithGemini(transcript: string): Promise<ParsedTransaction> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a financial transaction parser for a small merchant in Kenya.
Parse the following spoken transaction and return ONLY a valid JSON object, no markdown, no explanation.

Spoken text: "${transcript}"

Return exactly this JSON structure:
{
  "type": "income" or "expense",
  "amount": <number in KES>,
  "description": "<short clear description>",
  "quantity": "<quantity if mentioned, e.g. '2kg', '5 units', or empty string>",
  "category": "<one of: sales, stock, transport, rent, utilities, food, salary, other>"
}

Rules:
- "sold", "received", "earned", "customer paid" → income
- "bought", "paid", "spent", "expense", "cost" → expense
- Extract numeric amount; if currency mentioned (shillings, ksh, bob) treat as KES
- Keep description concise (max 5 words)
- category must be exactly one of the listed options
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code fences if present
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as ParsedTransaction;
}

// ─── Receipt Vision: analyse receipt image ────────────
export async function parseReceiptWithGemini(imageBase64: string, mimeType: string): Promise<ParsedTransaction> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a receipt analyser for a small merchant in Kenya.
Look at this receipt image and extract the transaction details.
Return ONLY a valid JSON object, no markdown, no explanation.

Return exactly this JSON structure:
{
  "type": "income" or "expense",
  "amount": <total amount as number, in KES>,
  "description": "<merchant name or item purchased, max 5 words>",
  "quantity": "<quantity or number of items if visible, else empty string>",
  "category": "<one of: sales, stock, transport, rent, utilities, food, salary, other>"
}

Rules:
- Most receipts represent a purchase (expense)
- Extract the TOTAL amount — look for "Total", "Grand Total", "Amount Due", "KSh", "KES"
- If currency not clear, assume KES
- category must be exactly one of the listed options
`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  const text = result.response.text().trim();
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as ParsedTransaction;
}

// ─── Business Insights: AI analysis of transactions ───
export interface BusinessInsight {
  summary: string;
  topExpenseCategory: string;
  suggestion: string;
  warning: string | null;
  trend: 'positive' | 'negative' | 'neutral';
}

export async function getBusinessInsights(
  transactions: Array<{ type: string; amount: number; description: string; category: string; date: string }>
): Promise<BusinessInsight> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const txSummary = transactions
    .slice(0, 50) // limit to last 50 for token efficiency
    .map(t => `${t.date} | ${t.type} | KES ${t.amount} | ${t.category} | ${t.description}`)
    .join('\n');

  const prompt = `
You are a business financial advisor for a small informal merchant in Kenya.
Analyse these recent transactions and return ONLY a valid JSON object, no markdown, no explanation.

Transactions:
${txSummary}

Return exactly this JSON structure:
{
  "summary": "<2-sentence plain-English summary of their financial health>",
  "topExpenseCategory": "<the category they spend most on>",
  "suggestion": "<one specific, practical suggestion to improve profitability>",
  "warning": "<a financial risk or warning if any, or null if none>",
  "trend": "positive" or "negative" or "neutral"
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as BusinessInsight;
}
