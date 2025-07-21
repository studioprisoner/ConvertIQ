import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { subscriptions } from '@/db/schema/subscriptions';
import { polar } from '@/lib/polar';
import { eq } from 'drizzle-orm';

// POST /api/migrate-users-to-polar - Migrate existing users to Polar customers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { specificUserId } = body; // Optional: migrate specific user only

    // Get users to migrate
    let usersToMigrate;
    if (specificUserId) {
      usersToMigrate = await db
        .select()
        .from(user)
        .where(eq(user.id, specificUserId));
    } else {
      usersToMigrate = await db.select().from(user);
    }

    if (usersToMigrate.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No users found to migrate'
      });
    }

    const results = [];

    for (const userData of usersToMigrate) {
      if (!userData.email) {
        results.push({
          userId: userData.id,
          email: 'no-email',
          status: 'skipped',
          reason: 'No email address'
        });
        continue;
      }

      try {
        console.log(`🔄 Migrating user: ${userData.email}`);

        // Check if user already has subscriptions (which means they might already have Polar customer)
        const existingSubscription = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userData.id))
          .limit(1);

        if (existingSubscription.length > 0) {
          results.push({
            userId: userData.id,
            email: userData.email,
            status: 'skipped',
            reason: 'User already has subscription',
            subscriptionId: existingSubscription[0].id
          });
          continue;
        }

        // Try to create customer in Polar
        const polarCustomer = await polar.customers.create({
          email: userData.email,
          name: userData.name || undefined,
          metadata: {
            userId: userData.id,
            source: 'convertiq',
            migrated: true,
            migratedAt: new Date().toISOString()
          }
        });

        console.log(`✅ Created Polar customer: ${polarCustomer.id} for ${userData.email}`);

        results.push({
          userId: userData.id,
          email: userData.email,
          status: 'success',
          polarCustomerId: polarCustomer.id,
          polarCustomer: {
            id: polarCustomer.id,
            email: polarCustomer.email,
            name: polarCustomer.name
          }
        });

      } catch (error) {
        console.error(`❌ Failed to migrate user ${userData.email}:`, error);
        
        // Check if customer already exists
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`ℹ️ Customer already exists for ${userData.email}, attempting to find...`);
          
          try {
            // Try to find existing customer
            const existingCustomers = await polar.customers.list({
              email: userData.email,
              limit: 1
            });

            if (existingCustomers.items && existingCustomers.items.length > 0) {
              const existingCustomer = existingCustomers.items[0];
              results.push({
                userId: userData.id,
                email: userData.email,
                status: 'found_existing',
                polarCustomerId: existingCustomer.id,
                polarCustomer: {
                  id: existingCustomer.id,
                  email: existingCustomer.email,
                  name: existingCustomer.name
                }
              });
            } else {
              results.push({
                userId: userData.id,
                email: userData.email,
                status: 'error',
                error: 'Customer exists but could not be found via list API'
              });
            }
          } catch (listError) {
            results.push({
              userId: userData.id,
              email: userData.email,
              status: 'error',
              error: `Failed to find existing customer: ${listError instanceof Error ? listError.message : 'Unknown error'}`
            });
          }
        } else {
          results.push({
            userId: userData.id,
            email: userData.email,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed for ${usersToMigrate.length} users`,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        foundExisting: results.filter(r => r.status === 'found_existing').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        errors: results.filter(r => r.status === 'error').length
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}