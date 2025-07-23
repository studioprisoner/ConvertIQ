import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    console.log('🧪 Testing email send to:', email);
    console.log('🔑 Resend API key available:', !!process.env.RESEND_API_KEY);
    console.log('🔑 Resend API key starts with:', process.env.RESEND_API_KEY?.substring(0, 10));
    
    const result = await resend.emails.send({
      from: "ConvertIQ <noreply@convertiq.cloud>",
      to: email,
      subject: "Test Email from ConvertIQ",
      html: "<h1>Test Email</h1><p>This is a test email to verify Resend is working.</p>",
    });
    
    console.log('✅ Test email result:', result);
    
    return NextResponse.json({ 
      success: true, 
      result,
      message: 'Test email sent successfully' 
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}