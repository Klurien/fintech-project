export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  quantity: string;
  category: string;
}

const CATEGORY_MAP: Record<string, string[]> = {
  inventory: ['tomato', 'tomatoes', 'onion', 'onions', 'sugar', 'maize', 'beans', 'rice', 'oil', 'milk', 'egg', 'eggs', 'bread', 'flour', 'vegetable', 'vegetables', 'fruit', 'fruits', 'cabbage', 'potato', 'potatoes', 'meat', 'fish', 'chicken', 'soda', 'water', 'salt', 'tea', 'coffee'],
  rent: ['rent', 'shop rent', 'stall'],
  transport: ['transport', 'fare', 'fuel', 'petrol', 'diesel', 'boda', 'matatu', 'taxi', 'delivery', 'shipping'],
  utilities: ['electricity', 'water bill', 'power', 'tokens', 'internet', 'wifi', 'airtime', 'credit', 'phone'],
  wages: ['wage', 'wages', 'salary', 'helper', 'payment to', 'paid helper'],
  packaging: ['bag', 'bags', 'plastic', 'boxes', 'packaging', 'wrappings'],
  other: []
};

function getCategory(description: string): string {
  const descLower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(keyword => descLower.includes(keyword))) {
      return category;
    }
  }
  return 'other';
}

export function parseVoiceCommand(text: string): ParsedTransaction {
  const cleanText = text.toLowerCase().trim();
  let type: 'income' | 'expense' = 'income'; // default
  let amount = 0;
  let description = '';
  let quantity = '';

  // 1. Determine transaction type
  const expenseKeywords = ['bought', 'buy', 'spent', 'paid', 'expense', 'cost', 'purchased', 'paid for', 'loss'];
  const incomeKeywords = ['sold', 'sell', 'received', 'earned', 'got', 'income', 'sale', 'profit'];

  // Check which keyword appears first or is more prevalent
  let isExpense = expenseKeywords.some(keyword => cleanText.includes(keyword));
  let isIncome = incomeKeywords.some(keyword => cleanText.includes(keyword));

  if (isExpense && !isIncome) {
    type = 'expense';
  } else if (isIncome && !isExpense) {
    type = 'income';
  } else if (isExpense && isIncome) {
    // Both found, check order
    const firstExpenseIndex = Math.min(...expenseKeywords.map(k => {
      const idx = cleanText.indexOf(k);
      return idx === -1 ? Infinity : idx;
    }));
    const firstIncomeIndex = Math.min(...incomeKeywords.map(k => {
      const idx = cleanText.indexOf(k);
      return idx === -1 ? Infinity : idx;
    }));
    type = firstExpenseIndex < firstIncomeIndex ? 'expense' : 'income';
  }

  // 2. Extract amount
  // We look for patterns like:
  // "for 500 shillings", "for 500 kes", "500 ksh", "shillings 500", "for 500"
  // Let's search for numbers matching currency tags or trailing "for/cost/spent"
  const shillingsMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*(?:shillings|shilling|kes|ksh|shs|usd|dollars|sh)/i);
  const forAmountMatch = cleanText.match(/(?:for|cost|spent|paid|amount of|price of)\s*(?:ksh|kes|sh|usd)?\s*(\d+(?:\.\d+)?)/i);
  
  if (shillingsMatch) {
    amount = parseFloat(shillingsMatch[1]);
  } else if (forAmountMatch) {
    amount = parseFloat(forAmountMatch[1]);
  } else {
    // Fallback: look for the last number in the sentence, which is often the amount in "Sold tomatoes 200"
    const numbers = cleanText.match(/\b\d+(?:\.\d+)?\b/g);
    if (numbers && numbers.length > 0) {
      // If there are multiple numbers, the last one is usually the amount (e.g. "Sold 2 bags of beans for 3000")
      // unless there's only one number.
      amount = parseFloat(numbers[numbers.length - 1]);
    }
  }

  // 3. Extract quantity
  // Patterns: "2kg", "2 kg", "5 bags", "3 pieces", "10 litres", "1 crate"
  const qtyRegex = /(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilo|kilos|gram|grams|g|piece|pieces|pcs|bag|bags|packet|packets|litre|litres|l|box|boxes|crate|crates|bottle|bottles|sack|sacks)\b/i;
  const qtyMatch = cleanText.match(qtyRegex);
  if (qtyMatch) {
    quantity = qtyMatch[0];
  }

  // 4. Extract Description
  // We will strip out the quantity, the amount phrase, verbs, and common filler words.
  let parsedDesc = cleanText;

  // Remove the amount text
  if (shillingsMatch) {
    parsedDesc = parsedDesc.replace(shillingsMatch[0], '');
  } else if (forAmountMatch) {
    parsedDesc = parsedDesc.replace(forAmountMatch[0], '');
  } else {
    // If we fell back to the last number, remove that number
    const numbers = cleanText.match(/\b\d+(?:\.\d+)?\b/g);
    if (numbers && numbers.length > 0) {
      const lastNum = numbers[numbers.length - 1];
      // Only remove if it represents the amount
      if (parseFloat(lastNum) === amount) {
        // Find last occurrence of this number and remove it
        const idx = parsedDesc.lastIndexOf(lastNum);
        if (idx !== -1) {
          parsedDesc = parsedDesc.substring(0, idx) + parsedDesc.substring(idx + lastNum.length);
        }
      }
    }
  }

  // Remove quantity phrase
  if (qtyMatch) {
    parsedDesc = parsedDesc.replace(qtyMatch[0], '');
  }

  // Remove verbs and fill words
  const wordsToRemove = [
    'sold', 'sell', 'bought', 'buy', 'spent', 'paid', 'received', 'earned', 'got', 'purchased', 
    'cost', 'for', 'of', 'on', 'from', 'a', 'an', 'the', 'shillings', 'shilling', 'kes', 'ksh', 
    'shs', 'usd', 'dollars', 'sh', 'to', 'at', 'with', 'my', 'some'
  ];

  // Tokenize and filter
  let tokens = parsedDesc.split(/\s+/);
  tokens = tokens.filter(token => !wordsToRemove.includes(token));

  // Join back and sanitize
  description = tokens.join(' ').replace(/\s+/g, ' ').trim();

  // Capitalize first letter of description
  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  } else {
    description = type === 'income' ? 'Cash Sale' : 'General Expense';
  }

  const category = getCategory(description);

  return {
    type,
    amount,
    description,
    quantity,
    category
  };
}
