import { parseVoiceCommand } from './nlpParser';
import { parseReceiptText } from './ocrParser';

declare const process: any;

function assertEqual(actual: any, expected: any, message: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`FAIL: ${message}\nExpected: ${expectedStr}\nActual:   ${actualStr}`);
  }
  console.log(`PASS: ${message}`);
}

function runVoiceTests() {
  console.log('\n--- Running Voice NLP Parser Tests ---');
  
  assertEqual(
    parseVoiceCommand("Sold 2kg tomatoes for 300 shillings"),
    {
      type: 'income',
      amount: 300,
      description: 'Tomatoes',
      quantity: '2kg',
      category: 'inventory'
    },
    'Simple income with quantity and shillings currency'
  );

  assertEqual(
    parseVoiceCommand("Bought stock transport for 500 shillings"),
    {
      type: 'expense',
      amount: 500,
      description: 'Stock transport',
      quantity: '',
      category: 'transport'
    },
    'Simple expense with category mapping'
  );

  assertEqual(
    parseVoiceCommand("Paid shop rent 2500 shillings"),
    {
      type: 'expense',
      amount: 2500,
      description: 'Shop rent',
      quantity: '',
      category: 'rent'
    },
    'Expense without "for" keyword'
  );

  assertEqual(
    parseVoiceCommand("Sold sugar for 150 kes"),
    {
      type: 'income',
      amount: 150,
      description: 'Sugar',
      quantity: '',
      category: 'inventory'
    },
    'Income with KES currency tag'
  );

  assertEqual(
    parseVoiceCommand("Spent 1200 on fuel"),
    {
      type: 'expense',
      amount: 1200,
      description: 'Fuel',
      quantity: '',
      category: 'transport'
    },
    'Expense with prepaid amount location'
  );
}

function runOcrTests() {
  console.log('\n--- Running Receipt OCR Parser Tests ---');

  const mockReceipt1 = `
    KIKUYU SUPERMARKET
    P.O. BOX 104 - KIKUYU
    TEL: 0722000000
    DATE: 06/06/2026

    CABBAGE       40.00
    MILK          70.00
    ONIONS        90.00
    -------------------
    TOTAL        200.00
    CASH PAID    200.00
  `;

  const parsed1 = parseReceiptText(mockReceipt1);
  assertEqual(
    { merchant: parsed1.merchant, amount: parsed1.amount, date: parsed1.date },
    { merchant: 'KIKUYU SUPERMARKET', amount: 200, date: '2026-06-06' },
    'Standard receipt parsing with TOTAL keyword'
  );

  const mockReceiptNoKeyword = `
    MAMA MBOGA STALL
    06-06-2026
    POTATOES   150
    TOMATOES   120
    -------------------
    270.00
  `;

  const parsed2 = parseReceiptText(mockReceiptNoKeyword);
  assertEqual(
    { merchant: parsed2.merchant, amount: parsed2.amount, date: parsed2.date },
    { merchant: 'MAMA MBOGA STALL', amount: 270, date: '2026-06-06' },
    'Fallback receipt parsing finding maximum price (no TOTAL keyword)'
  );
}

try {
  runVoiceTests();
  runOcrTests();
  console.log('\nALL PARSER TESTS PASSED SUCCESSFULLY! ✅\n');
} catch (error: any) {
  console.error('\nTEST RUN FAILED! ❌\n', error.message);
  process.exit(1);
}
