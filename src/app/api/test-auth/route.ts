import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    console.log("Testing auth configuration...");
    
    // Test if auth object exists
    console.log("Auth object exists:", !!auth);
    console.log("Auth handler exists:", !!auth.handler);
    
    // Try to get some basic info from auth
    const info = {
      hasHandler: !!auth.handler,
      hasGoogle: true, // We know we added Google provider
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      googleClientId: process.env.GOOGLE_CLIENT_ID ? "present" : "missing",
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? "present" : "missing",
    };
    
    return NextResponse.json({
      success: true,
      message: "Auth test endpoint working",
      info
    });
  } catch (error) {
    console.error("Auth test error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}