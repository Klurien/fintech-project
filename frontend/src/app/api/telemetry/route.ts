import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const trackPoints = Array.isArray(body) ? body : [body];

    if (trackPoints.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Process all points
    // To properly insert into TiDB, we must ensure Asset exists.
    let successCount = 0;

    for (const tp of trackPoints) {
      if (!tp.assetId || !tp.lat || !tp.lon) continue;

      try {
        await prisma.asset.upsert({
          where: { id: tp.assetId },
          update: {},
          create: {
            id: tp.assetId,
            type: tp.source === 'ais' ? 'ship' : 'unknown',
            registration: tp.name || tp.assetId,
            ownerId: 'system',
          }
        });

        await prisma.trackPoint.create({
          data: {
            ts: new Date(tp.ts || Date.now()),
            lat: tp.lat,
            lon: tp.lon,
            speed: tp.speed || 0,
            heading: tp.heading || 0,
            source: tp.source || 'client',
            rawPayload: tp.rawPayload || {},
            assetId: tp.assetId
          }
        });
        successCount++;
      } catch (e) {
        console.error("Failed to insert TrackPoint:", e);
      }
    }

    return NextResponse.json({ success: true, inserted: successCount });
  } catch (error) {
    console.error("Telemetry Endpoint Error:", error);
    return NextResponse.json({ error: 'Failed to process telemetry' }, { status: 500 });
  }
}
