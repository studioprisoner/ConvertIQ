import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { crawlResultSchema } from '@/lib/crawler/types';
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

// Comprehensive streaming schema
const comprehensiveStreamSchema = z.object({
  conversionPsychology: conversionPsychologyAnalysisSchema.optional(),
  uxAnalysis: uxAnalysisSchema.optional(),
  technicalSeo: technicalSeoAnalysisSchema.optional(),
  overallInsights: z.object({
    summary: z.string(),
    overallScore: z.number().min(1).max(10),
    priorityAreas: z.array(z.string()),
    isPartial: z.boolean().default(false),
    failedSections: z.number().default(0),
  }).optional(),
  metadata: z.object({
    processingTime: z.number(),
    modelUsed: z.string(),
    promptVersion: z.string(),
    confidence: z.number(),
    isPartial: z.boolean().default(false),
    completedSections: z.array(z.string()),
    currentSection: z.string().optional(),
  }),
});

const streamComprehensiveSchema = z.object({
  crawlData: crawlResultSchema,
  websiteId: z.string().min(1), // Allow demo IDs or UUIDs
});

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting comprehensive streaming AI analysis...');
    
    const body = await req.json();
    const { crawlData, websiteId } = streamComprehensiveSchema.parse(body);
    
    console.log(`📊 Streaming comprehensive analysis for ${crawlData.url}`);

    // Create a comprehensive prompt that analyzes all sections progressively
    const comprehensivePrompt = `
Perform a comprehensive analysis of this website: ${crawlData.url}

Website Data:
- Title: ${crawlData.htmlAnalysis.title || 'N/A'}
- Description: ${crawlData.htmlAnalysis.description || 'N/A'}
- Content: ${crawlData.htmlAnalysis.content?.slice(0, 2000) || 'N/A'}...
- Headings: ${crawlData.htmlAnalysis.headings?.join(', ') || 'N/A'}

Analyze in this progressive order:
1. Conversion Psychology Analysis
2. UX/UI Analysis  
3. Technical SEO Analysis
4. Overall Insights & Summary

Provide real-time updates as each section completes. Start with metadata indicating current section, then provide the analysis results as they become available.

Format the response to show progressive completion with metadata updates throughout the process.
`;

    const comprehensiveSystemPrompt = `
You are ConvertIQ AI performing a comprehensive website analysis. 

Analyze the website progressively in sections:
1. Conversion Psychology (trust signals, CTAs, value props)
2. UX Analysis (navigation, mobile, performance) 
3. Technical SEO (meta tags, structure, optimization)
4. Overall Insights (summary, scores, priorities)

Provide updates as each section completes. Include metadata about current progress.

IMPORTANT: Structure your response to match the comprehensive schema exactly, providing partial results as sections complete.
`;

    // Create a structured prompt that will return JSON-like text
    const structuredPrompt = `
${comprehensivePrompt}

CRITICAL: Return ONLY valid JSON matching this exact structure:
{
  "conversionPsychology": {
    "overallScore": number (1-10),
    "keyFindings": ["finding1", "finding2", "finding3"],
    "priorityRecommendations": ["rec1", "rec2", "rec3"],
    "categories": {
      "trustSignals": {"score": number, "recommendations": ["rec1", "rec2"]},
      "callsToAction": {"score": number, "recommendations": ["rec1", "rec2"]},
      "valueProposition": {"score": number, "recommendations": ["rec1", "rec2"]}
    }
  },
  "uxAnalysis": {
    "overallScore": number (1-10),
    "keyFindings": ["finding1", "finding2", "finding3"],
    "priorityRecommendations": ["rec1", "rec2", "rec3"],
    "categories": {
      "mobileOptimization": {"score": number, "recommendations": ["rec1", "rec2"]},
      "navigation": {"score": number, "recommendations": ["rec1", "rec2"]},
      "pageSpeed": {"score": number, "recommendations": ["rec1", "rec2"]}
    }
  },
  "technicalSeo": {
    "overallScore": number (1-10),
    "keyFindings": ["finding1", "finding2", "finding3"],
    "priorityRecommendations": ["rec1", "rec2", "rec3"],
    "categories": {
      "metaTags": {"score": number, "recommendations": ["rec1", "rec2"]},
      "contentStructure": {"score": number, "recommendations": ["rec1", "rec2"]},
      "technicalSEO": {"score": number, "recommendations": ["rec1", "rec2"]}
    }
  },
  "overallInsights": {
    "summary": "Executive summary text",
    "overallScore": number (1-10),
    "priorityAreas": ["area1", "area2", "area3"],
    "isPartial": false,
    "failedSections": 0
  },
  "metadata": {
    "processingTime": number,
    "modelUsed": "claude-3-5-sonnet-20241022",
    "promptVersion": "comprehensive-streaming-1.0.0",
    "confidence": number (0-1),
    "isPartial": false,
    "completedSections": ["conversionPsychology", "uxAnalysis", "technicalSeo", "overallInsights"],
    "currentSection": "completed"
  }
}

Return ONLY the JSON, no other text.
`;

    // Stream the comprehensive analysis using streamText with structured output
    const result = streamText({
      model,
      system: comprehensiveSystemPrompt,
      prompt: structuredPrompt,
      temperature: 0.3,
      maxTokens: 3000,
      onFinish: ({ text, finishReason, usage }) => {
        console.log('✅ Comprehensive streaming analysis completed:', {
          finishReason,
          tokensUsed: usage?.totalTokens,
          url: crawlData.url,
          textLength: text.length,
        });
      },
    });

    // Add comprehensive analysis headers
    const headers = new Headers();
    headers.set('X-Analysis-Type', 'comprehensive');
    headers.set('X-Website-Id', websiteId);
    headers.set('X-Stream-Start', new Date().toISOString());
    headers.set('X-Expected-Sections', '4'); // conversion, ux, seo, overall

    console.log(`🔄 Comprehensive streaming analysis started for ${crawlData.url}`);

    return result.toUIMessageStreamResponse({
      headers,
    });

  } catch (error) {
    console.error('❌ Comprehensive streaming analysis failed:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to start comprehensive streaming analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';