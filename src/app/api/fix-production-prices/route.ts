import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/connection';
import { planPrices } from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';

// POST /api/fix-production-prices - Fix placeholder price IDs in production
export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in non-production or with specific header
    const authHeader = request.headers.get('x-fix-auth');
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && authHeader !== 'fix-production-prices-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔧 Fixing production price IDs via API...');
    
    // Get production price UUIDs (hardcoded as fallback)
    const productionPrices = {
      basic_monthly: 'df0d68e6-a0e8-4e00-b2a8-38889bbecda7',
      basic_annual: 'f3d52f4f-1b66-46cb-a6e2-5b13f67e7a4f',
      pro_monthly: '6c2e473b-ad5c-4374-a657-4ca6fe1df00a',
      pro_annual: '0b5d29ab-3e00-44e7-9260-0fd020b7590d'
    };

    // Get all current plan prices
    const currentPrices = await db.select().from(planPrices);
    console.log(`📊 Found ${currentPrices.length} existing price records`);
    
    // Update each placeholder with the correct production ID
    const updates = [
      {
        old: 'price_basic_monthly_placeholder',
        new: productionPrices.basic_monthly,
        description: 'Basic Monthly'
      },
      {
        old: 'price_basic_annual_placeholder', 
        new: productionPrices.basic_annual,
        description: 'Basic Annual'
      },
      {
        old: 'price_pro_monthly_placeholder',
        new: productionPrices.pro_monthly,
        description: 'Pro Monthly'
      },
      {
        old: 'price_pro_annual_placeholder',
        new: productionPrices.pro_annual,
        description: 'Pro Annual'
      }
    ];

    console.log('🔄 Applying updates...');
    const results = [];
    
    for (const update of updates) {
      const result = await db
        .update(planPrices)
        .set({ polarPriceId: update.new })
        .where(eq(planPrices.polarPriceId, update.old))
        .returning();

      if (result.length > 0) {
        console.log(`✅ Updated ${update.description}: ${update.old} → ${update.new}`);
        results.push(`Updated ${update.description}`);
      } else {
        console.log(`⚠️  No records found for ${update.description}: ${update.old}`);
        results.push(`No records for ${update.description}`);
      }
    }

    // Verify the updates
    const finalPrices = await db.select().from(planPrices);
    const verification = finalPrices.map(price => ({
      id: price.id,
      interval: price.billingInterval,
      polarPriceId: price.polarPriceId,
      isProduction: !price.polarPriceId.includes('placeholder') && !price.polarPriceId.includes('sandbox')
    }));

    return NextResponse.json({
      success: true,
      message: 'Production price IDs updated',
      results,
      verification,
      environment: process.env.NODE_ENV,
      polarEnvironment: process.env.POLAR_ENVIRONMENT
    });

  } catch (error) {
    console.error('❌ Error fixing production prices:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV,
      polarEnvironment: process.env.POLAR_ENVIRONMENT
    }, { status: 500 });
  }
}