import { NextRequest, NextResponse } from 'next/server';
import { AnthropicAnalysisProvider } from '@/lib/ai/providers/anthropic';
import { crawlResultSchema } from '@/lib/crawler/types';
import { z } from 'zod';

const streamSimpleSchema = z.object({
  crawlData: crawlResultSchema,
  analysisType: z.enum(['conversion_psychology', 'ux_analysis', 'technical_seo', 'comprehensive']),
  websiteId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting simple streaming AI analysis...');
    
    const body = await req.json();
    const { crawlData, analysisType, websiteId } = streamSimpleSchema.parse(body);
    
    console.log(`📊 Running ${analysisType} analysis for ${crawlData.url}`);

    const provider = new AnthropicAnalysisProvider();
    
    // Create a readable stream for server-sent events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // Send initial status
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: 'Starting analysis...',
            progress: 0
          })}\n\n`));

          let result;
          
          // Run the appropriate analysis
          switch (analysisType) {
            case 'conversion_psychology':
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'status',
                message: 'Analyzing conversion psychology...',
                progress: 25
              })}\n\n`));
              result = await provider.analyzeConversionPsychology(crawlData);
              break;
              
            case 'ux_analysis':
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'status',
                message: 'Analyzing UX design...',
                progress: 25
              })}\n\n`));
              result = await provider.analyzeUX(crawlData);
              break;
              
            case 'technical_seo':
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'status',
                message: 'Analyzing technical SEO...',
                progress: 25
              })}\n\n`));
              result = await provider.analyzeTechnicalSEO(crawlData);
              break;
              
            case 'comprehensive':
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'status',
                message: 'Running comprehensive analysis...',
                progress: 25
              })}\n\n`));
              result = await provider.generateComprehensiveAnalysis(crawlData);
              break;
              
            default:
              throw new Error(`Unsupported analysis type: ${analysisType}`);
          }

          // Send progress update
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: 'Analysis complete, formatting results...',
            progress: 90
          })}\n\n`));

          // Send final result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'result',
            data: result,
            progress: 100
          })}\n\n`));

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
        } catch (error) {
          console.error('❌ Streaming analysis error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
            progress: 0
          })}\n\n`));
          controller.close();
        }
      }
    });

    // Return Server-Sent Events response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Analysis-Type': analysisType,
        'X-Website-Id': websiteId,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('❌ Simple streaming analysis failed:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to start simple streaming analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';