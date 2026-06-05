export interface ParsedReceipt {
  merchant: string;
  amount: number;
  date: string; // YYYY-MM-DD format
  rawText: string;
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let merchant = 'Unknown Merchant';
  let amount = 0;
  let date = new Date().toISOString().split('T')[0]; // Default to today

  if (lines.length > 0) {
    // 1. Identify Merchant Name
    // Usually the first 1-3 lines contain the merchant. We skip lines that are only numbers, symbols, dates, or very short.
    const merchantCandidates = lines.slice(0, 4);
    const dateRegex = /\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/;
    const phoneRegex = /\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/;
    const emailRegex = /\S+@\S+\.\S+/;
    const urlRegex = /www\.|http:|https:/;

    for (const candidate of merchantCandidates) {
      if (
        candidate.length > 2 &&
        !dateRegex.test(candidate) &&
        !phoneRegex.test(candidate) &&
        !emailRegex.test(candidate) &&
        !urlRegex.test(candidate) &&
        !/^[0-9\s#\-+().]+$/.test(candidate) // Not just numbers/symbols
      ) {
        merchant = candidate.replace(/[^\w\s&'-]/g, '').trim(); // Clean symbols
        break;
      }
    }
  }

  // 2. Identify Date
  // Search for DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, or DD-MM-YYYY
  const dateRegex = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/;
  const isoDateRegex = /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/;

  for (const line of lines) {
    const isoMatch = line.match(isoDateRegex);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      date = `${year}-${month}-${day}`;
      break;
    }
    
    const standardMatch = line.match(dateRegex);
    if (standardMatch) {
      let first = standardMatch[1];
      let second = standardMatch[2];
      let year = standardMatch[3];

      if (year.length === 2) {
        year = '20' + year; // assume 20xx
      }

      // We have standard DD/MM/YYYY or MM/DD/YYYY
      // In many informal markets, DD/MM/YYYY is standard. Let's assume DD/MM/YYYY unless month > 12.
      let day = first;
      let month = second;
      if (parseInt(first) > 12 && parseInt(second) <= 12) {
        day = first;
        month = second;
      } else if (parseInt(second) > 12 && parseInt(first) <= 12) {
        day = second;
        month = first;
      }
      
      date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      break;
    }
  }

  // 3. Identify Total Amount
  // We search for keywords like "total", "amount", "net", "cash due", "due", "paid"
  // and match numbers on the same line or the next line.
  const totalKeywords = [
    'total', 'net', 'amount due', 'due', 'grand total', 'gtotal', 'ttl', 
    'cash', 'paid', 'total amount', 'balance due', 'sum', 'kushukuru'
  ];

  let amountCandidates: { val: number; lineIndex: number; priority: number }[] = [];

  lines.forEach((line, index) => {
    const lineLower = line.toLowerCase();
    const isKeyword = totalKeywords.some(keyword => lineLower.includes(keyword));

    if (isKeyword) {
      // Find all decimal or integer numbers in this line
      // E.g. "TOTAL: 250.00" or "NET AMOUNT   1,200.50"
      const cleanedLine = line.replace(/,/g, ''); // Remove commas
      const numbers = cleanedLine.match(/\b\d+(?:\.\d{2})?\b/g);

      if (numbers) {
        numbers.forEach(numStr => {
          const val = parseFloat(numStr);
          if (!isNaN(val) && val > 0) {
            // Determine priority
            let priority = 1;
            if (lineLower.includes('grand total') || lineLower.includes('total:')) {
              priority = 5;
            } else if (lineLower.includes('total')) {
              priority = 4;
            } else if (lineLower.includes('due') || lineLower.includes('amount')) {
              priority = 3;
            } else if (lineLower.includes('cash') || lineLower.includes('paid')) {
              priority = 2;
            }
            amountCandidates.push({ val, lineIndex: index, priority });
          }
        });
      }

      // If no number on this line, check the next line
      if ((!numbers || numbers.length === 0) && index + 1 < lines.length) {
        const nextLine = lines[index + 1].replace(/,/g, '');
        const nextNumbers = nextLine.match(/^\s*(\d+(?:\.\d{2})?)\s*$/); // strict number line
        if (nextNumbers) {
          const val = parseFloat(nextNumbers[1]);
          if (!isNaN(val) && val > 0) {
            amountCandidates.push({ val, lineIndex: index + 1, priority: 3 });
          }
        }
      }
    }
  });

  if (amountCandidates.length > 0) {
    // Sort by priority (descending) and value (descending)
    amountCandidates.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.val - a.val;
    });
    amount = amountCandidates[0].val;
  } else {
    // Fallback: search the entire text for numbers, and find the largest number
    // that doesn't look like a date, phone number, or card number.
    const allNumbers: number[] = [];
    lines.forEach(line => {
      const lineClean = line.replace(/,/g, '');
      const numbers = lineClean.match(/\b\d+(?:\.\d{2})?\b/g);
      if (numbers) {
        numbers.forEach(numStr => {
          const val = parseFloat(numStr);
          // Ignore items that look like dates (e.g. 2026, 6) or phone numbers or single digits
          if (!isNaN(val) && val > 0 && val < 1000000) {
            // Check if it's likely a year or date component
            const isYear = val >= 1990 && val <= 2040;
            if (!isYear) {
              allNumbers.push(val);
            }
          }
        });
      }
    });

    if (allNumbers.length > 0) {
      // Find the maximum number on the receipt, which is typically the total if keywords weren't matched
      allNumbers.sort((a, b) => b - a);
      amount = allNumbers[0];
    }
  }

  return {
    merchant,
    amount,
    date,
    rawText: text
  };
}
