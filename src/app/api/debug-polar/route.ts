import { NextRequest, NextResponse } from 'next/server';
import { 
  getAvailablePlans
} from '@/lib/subscription-service';
import { polar } from '@/lib/polar';

// GET /api/debug-polar - Debug Polar integration (no auth required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const test = searchParams.get('test') || 'plans';

    switch (test) {
      case 'plans':
        const plans = await getAvailablePlans();
        return NextResponse.json({
          success: true,
          message: 'Plans retrieved successfully',
          data: {
            environment: process.env.POLAR_ENVIRONMENT || 'sandbox',
            plansCount: plans.length,
            plans: plans.map(p => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              pricing: p.pricing
            }))
          }
        });

      case 'polar-org':
        try {
          // Test if we can access Polar API
          const orgs = await polar.organizations.list();
          return NextResponse.json({
            success: true,
            message: 'Polar API accessible',
            data: {
              environment: process.env.POLAR_ENVIRONMENT || 'sandbox',
              organizations: orgs.items.map(org => ({
                id: org.id,
                name: org.name
              }))
            }
          });
        } catch (polarError) {
          return NextResponse.json({
            success: false,
            error: 'Polar API Error',
            details: polarError instanceof Error ? polarError.message : 'Unknown Polar error'
          });
        }

      case 'price-ids':
        // Get plans and show their price IDs
        const allPlans = await getAvailablePlans();
        return NextResponse.json({
          success: true,
          message: 'Price IDs retrieved successfully',
          data: {
            environment: process.env.POLAR_ENVIRONMENT || 'sandbox',
            plans: allPlans.map(plan => ({
              name: plan.name,
              slug: plan.slug,
              pricing: plan.pricing
            }))
          }
        });

      case 'customer':
        // Test customer lookup for josh@studioprisoner.com
        try {
          // First, try to find specific customer
          const specificCustomers = await polar.customers.list({
            email: 'josh@studioprisoner.com',
            limit: 1
          });
          
          // Also get all customers to see what's available
          const allCustomers = await polar.customers.list({
            limit: 10
          });
          
          return NextResponse.json({
            success: true,
            message: 'Customer lookup completed',
            data: {
              environment: process.env.POLAR_ENVIRONMENT || 'sandbox',
              specificSearch: {
                email: 'josh@studioprisoner.com',
                found: specificCustomers.items?.length || 0,
                customer: specificCustomers.items?.[0] ? {
                  id: specificCustomers.items[0].id,
                  email: specificCustomers.items[0].email,
                  name: specificCustomers.items[0].name,
                  metadata: specificCustomers.items[0].metadata
                } : null
              },
              allCustomers: {
                total: allCustomers.items?.length || 0,
                customers: allCustomers.items?.map(c => ({
                  id: c.id,
                  email: c.email,
                  name: c.name,
                  metadata: c.metadata
                })) || []
              }
            }
          });
        } catch (customerError) {
          return NextResponse.json({
            success: false,
            error: 'Customer lookup failed',
            details: customerError instanceof Error ? customerError.message : 'Unknown customer error'
          });
        }

      case 'polar-products':
        // Get actual products and prices from Polar
        try {
          const products = await polar.products.list({
            organizationId: '7e745b0f-336e-4acb-b73e-e20c4b4f26d0'
          });
          
          return NextResponse.json({
            success: true,
            message: 'Polar products retrieved',
            data: {
              environment: process.env.POLAR_ENVIRONMENT || 'sandbox',
              productsFound: products.items?.length || 0,
              products: products.items?.map(p => ({
                id: p.id,
                name: p.name,
                prices: p.prices?.map(price => ({
                  id: price.id,
                  amount: price.amount,
                  currency: price.currency,
                  interval: price.recurringInterval,
                  intervalCount: price.recurringIntervalCount
                })) || []
              })) || []
            }
          });
        } catch (productError) {
          return NextResponse.json({
            success: false,
            error: 'Failed to get Polar products',
            details: productError instanceof Error ? productError.message : 'Unknown product error'
          });
        }

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown test type',
          availableTests: ['plans', 'polar-org', 'price-ids', 'customer', 'polar-products']
        });
    }
  } catch (error) {
    console.error('Debug Polar error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}