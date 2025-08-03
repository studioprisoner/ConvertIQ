import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const streamDemoSchema = z.object({
  crawlData: z.object({
    url: z.string().url(),
  }),
  analysisType: z.enum(['conversion_psychology', 'ux_analysis', 'technical_seo', 'comprehensive']),
  websiteId: z.string().min(1),
});

// Mock analysis data for demo purposes
const generateMockAnalysis = (analysisType: string, url: string) => {
  const baseAnalysis = {
    type: analysisType,
    url,
    overallScore: Math.floor(Math.random() * 3) + 7, // Score between 7-9
    processingTime: Math.floor(Math.random() * 2000) + 1000, // 1-3 seconds
    timestamp: new Date().toISOString(),
  };

  switch (analysisType) {
    case 'conversion_psychology':
      return {
        ...baseAnalysis,
        keyFindings: [
          'Strong trust indicators present with contact information and testimonials',
          'Clear value proposition in hero section increases conversion potential',
          'Social proof elements could be more prominent above the fold',
        ],
        priorityRecommendations: [
          'Add urgency indicators to primary call-to-action buttons',
          'Include customer count or success metrics for social validation',
          'Implement exit-intent popup with special offer',
        ],
        categories: {
          trustSignals: {
            score: 8,
            recommendations: ['Add security badges', 'Display customer testimonials']
          },
          socialProof: {
            score: 6,
            recommendations: ['Show customer count', 'Add review ratings']
          },
          authority: {
            score: 7,
            recommendations: ['Display certifications', 'Add expert endorsements']
          }
        }
      };

    case 'ux_analysis':
      return {
        ...baseAnalysis,
        keyFindings: [
          'Mobile-responsive design performs well across devices',
          'Navigation structure is intuitive and user-friendly',
          'Page load times could be optimized for better user experience',
        ],
        priorityRecommendations: [
          'Optimize images for faster loading on mobile devices',
          'Improve contrast ratios for better accessibility',
          'Simplify form fields to reduce user friction',
        ],
        categories: {
          mobileOptimization: {
            score: 8,
            recommendations: ['Optimize touch targets', 'Improve mobile menu']
          },
          navigation: {
            score: 9,
            recommendations: ['Add breadcrumbs', 'Improve search functionality']
          },
          accessibility: {
            score: 6,
            recommendations: ['Add alt text to images', 'Improve color contrast']
          }
        }
      };

    case 'technical_seo':
      return {
        ...baseAnalysis,
        keyFindings: [
          'Meta tags are properly configured with relevant keywords',
          'Page structure uses semantic HTML elements effectively',
          'Schema markup implementation would improve search visibility',
        ],
        priorityRecommendations: [
          'Add structured data markup for better rich snippets',
          'Optimize page loading speed for improved search rankings',
          'Include meta descriptions for all important pages',
        ],
        categories: {
          metaTags: {
            score: 8,
            recommendations: ['Optimize title length', 'Add missing meta descriptions']
          },
          structuredData: {
            score: 4,
            recommendations: ['Add JSON-LD schema', 'Implement breadcrumb markup']
          },
          performance: {
            score: 7,
            recommendations: ['Compress images', 'Minify CSS/JS files']
          }
        }
      };

    default:
      return {
        ...baseAnalysis,
        keyFindings: ['Comprehensive analysis completed successfully'],
        priorityRecommendations: ['Review detailed findings for specific improvements'],
        categories: {}
      };
  }
};

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting demo streaming AI analysis...');
    
    const body = await req.json();
    const { crawlData, analysisType, websiteId } = streamDemoSchema.parse(body);
    
    console.log(`📊 Running demo ${analysisType} analysis for ${crawlData.url}`);

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

          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 500));

          // Send progress update
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: `Analyzing ${analysisType.replace('_', ' ')}...`,
            progress: 25
          })}\n\n`));

          // Simulate more processing
          await new Promise(resolve => setTimeout(resolve, 800));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: 'Processing findings...',
            progress: 50
          })}\n\n`));

          await new Promise(resolve => setTimeout(resolve, 600));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: 'Generating recommendations...',
            progress: 75
          })}\n\n`));

          await new Promise(resolve => setTimeout(resolve, 400));

          // Generate mock analysis
          const result = generateMockAnalysis(analysisType, crawlData.url);

          // Send progress update
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: 'Analysis complete, formatting results...',
            progress: 90
          })}\n\n`));

          await new Promise(resolve => setTimeout(resolve, 200));

          // Send final result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'result',
            data: { analysis: result },
            progress: 100
          })}\n\n`));

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
        } catch (error) {
          console.error('❌ Demo streaming analysis error:', error);
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
    console.error('❌ Demo streaming analysis failed:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to start demo streaming analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';