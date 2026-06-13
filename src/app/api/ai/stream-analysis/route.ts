import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import {
  CONVERSION_PSYCHOLOGY_SYSTEM_PROMPT,
  generateConversionAnalysisPrompt,
} from '@/lib/ai/prompts/conversion-analysis';
import {
  UX_ANALYSIS_SYSTEM_PROMPT,
  generateUxAnalysisPrompt,
} from '@/lib/ai/prompts/ux-analysis';
import {
  TECHNICAL_SEO_SYSTEM_PROMPT,
  generateSeoAnalysisPrompt,
} from '@/lib/ai/prompts/seo-analysis';
import {
  conversionPsychologyAnalysisSchema,
  uxAnalysisSchema,
  technicalSeoAnalysisSchema,
} from '@/lib/ai/types';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const model = anthropic('claude-3-5-sonnet-20241022');

// Request schema for streaming analysis
const streamAnalysisSchema = z.object({
  crawlData: z.object({
    url: z.string().url(),
    htmlAnalysis: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      content: z.string().optional(),
      headings: z.array(z.string()).optional(),
      images: z.array(z.string()).optional(),
      links: z.array(z.string()).optional(),
    }),
    statusCode: z.number(),
  }),
  analysisType: z.enum(['conversion_psychology', 'ux_analysis', 'technical_seo']),
  websiteId: z.string().min(1), // Allow demo IDs or UUIDs
});

export async function POST(req: NextRequest) {
  try {
    // Require an authenticated session — this endpoint streams paid Anthropic
    // analysis, so anonymous access is direct cost abuse.
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🚀 Starting streaming AI analysis...');

    const body = await req.json();
    const { crawlData, analysisType, websiteId } = streamAnalysisSchema.parse(body);
    
    console.log(`📊 Streaming ${analysisType} analysis for ${crawlData.url}`);

    // Configure streaming based on analysis type
    let systemPrompt: string;
    let userPrompt: string;
    let jsonStructure: string;

    switch (analysisType) {
      case 'conversion_psychology':
        systemPrompt = CONVERSION_PSYCHOLOGY_SYSTEM_PROMPT;
        userPrompt = generateConversionAnalysisPrompt(crawlData);
        jsonStructure = `{
  "overallScore": number (1-10),
  "keyFindings": ["finding1", "finding2", "finding3"],
  "priorityRecommendations": ["rec1", "rec2", "rec3"],
  "categories": {
    "trustSignals": {"score": number, "recommendations": ["rec1", "rec2"]},
    "callsToAction": {"score": number, "recommendations": ["rec1", "rec2"]},
    "valueProposition": {"score": number, "recommendations": ["rec1", "rec2"]}
  }
}`;
        break;
      
      case 'ux_analysis':
        systemPrompt = UX_ANALYSIS_SYSTEM_PROMPT;
        userPrompt = generateUxAnalysisPrompt(crawlData);
        jsonStructure = `{
  "overallScore": number (1-10),
  "keyFindings": ["finding1", "finding2", "finding3"],
  "priorityRecommendations": ["rec1", "rec2", "rec3"],
  "categories": {
    "mobileOptimization": {"score": number, "recommendations": ["rec1", "rec2"]},
    "navigation": {"score": number, "recommendations": ["rec1", "rec2"]},
    "pageSpeed": {"score": number, "recommendations": ["rec1", "rec2"]}
  }
}`;
        break;
      
      case 'technical_seo':
        systemPrompt = TECHNICAL_SEO_SYSTEM_PROMPT;
        userPrompt = generateSeoAnalysisPrompt(crawlData);
        jsonStructure = `{
  "overallScore": number (1-10),
  "keyFindings": ["finding1", "finding2", "finding3"],
  "priorityRecommendations": ["rec1", "rec2", "rec3"],
  "categories": {
    "metaTags": {"score": number, "recommendations": ["rec1", "rec2"]},
    "contentStructure": {"score": number, "recommendations": ["rec1", "rec2"]},
    "technicalSEO": {"score": number, "recommendations": ["rec1", "rec2"]}
  }
}`;
        break;
      
      default:
        throw new Error(`Unsupported streaming analysis type: ${analysisType}`);
    }

    // Create structured prompt for JSON output
    const structuredPrompt = `${userPrompt}

CRITICAL: Return ONLY valid JSON matching this exact structure:
${jsonStructure}

Return ONLY the JSON, no other text.`;

    // Stream the AI analysis with progressive updates
    const result = streamText({
      model,
      system: systemPrompt,
      prompt: structuredPrompt,
      temperature: 0.3,
      maxOutputTokens: 2000,
      onFinish: ({ text, finishReason, usage }) => {
        console.log(`✅ Streaming ${analysisType} completed:`, {
          finishReason,
          tokensUsed: usage?.totalTokens,
          url: crawlData.url,
          textLength: text.length,
        });
      },
    });

    // Add metadata headers
    const headers = new Headers();
    headers.set('X-Analysis-Type', analysisType);
    headers.set('X-Website-Id', websiteId);
    headers.set('X-Stream-Start', new Date().toISOString());

    console.log(`🔄 Streaming ${analysisType} analysis started for ${crawlData.url}`);

    return result.toUIMessageStreamResponse({
      headers,
    });

  } catch (error) {
    console.error('❌ Streaming analysis failed:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to start streaming analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Node runtime (not edge): the session check imports the BetterAuth stack,
// which uses Node crypto/pg and cannot run on the edge runtime (CON-112).
export const runtime = 'nodejs';