import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    
    // Log all headers for debugging
    const allHeaders: Record<string, string> = {};
    headersList.forEach((value, key) => {
      allHeaders[key] = value;
    });
    
    console.log('🔍 Test webhook received:');
    console.log('Headers:', allHeaders);
    console.log('Body length:', body.length);
    console.log('POLAR_WEBHOOK_SECRET present:', !!process.env.POLAR_WEBHOOK_SECRET);
    console.log('POLAR_WEBHOOK_SECRET length:', process.env.POLAR_WEBHOOK_SECRET?.length);
    
    return NextResponse.json({ 
      success: true,
      headers: allHeaders,
      bodyLength: body.length,
      hasSecret: !!process.env.POLAR_WEBHOOK_SECRET,
      secretLength: process.env.POLAR_WEBHOOK_SECRET?.length
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}