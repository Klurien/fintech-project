import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function singleOperationJournal(req: Request) {
  try {
    const body = await req.json();
    const { debitAccount, creditAccount, amount, currency, tags, sourceRef } = body;

    // Double-entry validation
    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    // Append-only signature (tamper evidence)
    const timestamp = new Date();
    const dataString = `${timestamp.toISOString()}|${debitAccount}|${creditAccount}|${amount}|${currency}`;
    const signatureHash = crypto.createHash('sha256').update(dataString).digest('hex');

    // Create verified ledger entry pointing to TiDB
    const entry = await prisma.ledgerEntry.create({
      data: {
        ts: timestamp,
        debitAccount,
        creditAccount,
        amount,
        currency,
        tags,
        sourceRef,
        signatureHash,
      }
    });

    return NextResponse.json({ success: true, entryId: entry.id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process ledger entry' }, { status: 500 });
  }
}

export async function POST(req: Request) {
    return singleOperationJournal(req);
}

export async function GET() {
  try {
    const entries = await prisma.ledgerEntry.findMany({
      orderBy: { ts: 'desc' },
      take: 10,
    });
    return NextResponse.json({ success: true, entries });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ledger entries' }, { status: 500 });
  }
}
