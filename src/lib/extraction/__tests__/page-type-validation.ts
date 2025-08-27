// Page Type Detection Validation Script
// Test with real URLs to validate detection accuracy

import { Firecrawl } from '@mendable/firecrawl-js';
import { IntelligentPageTypeDetector } from '../detectors/page-type-detector';
import type { PageType } from '../types';

// Test URLs with expected page types
const validationUrls = [
  // E-commerce product pages
  {
    url: 'https://www.apple.com/iphone-15/',
    expected: 'ecommerce-product',
    description: 'Apple iPhone product page'
  },
  {
    url: 'https://www.amazon.com/dp/B08N5WRWNW',
    expected: 'ecommerce-product', 
    description: 'Amazon product page'
  },
  
  // E-commerce category pages
  {
    url: 'https://www.bestbuy.com/site/electronics',
    expected: 'ecommerce-category',
    description: 'Best Buy electronics category'
  },
  
  // Service landing pages
  {
    url: 'https://www.hubspot.com/marketing',
    expected: 'service-landing',
    description: 'HubSpot marketing services'
  },
  {
    url: 'https://www.freshbooks.com/accounting-software',
    expected: 'service-landing',
    description: 'FreshBooks accounting service'
  },
  
  // Corporate homepages
  {
    url: 'https://www.microsoft.com/',
    expected: 'corporate-homepage',
    description: 'Microsoft homepage'
  },
  {
    url: 'https://www.google.com/',
    expected: 'corporate-homepage',
    description: 'Google homepage'
  },
  
  // About pages
  {
    url: 'https://www.airbnb.com/about',
    expected: 'about-us',
    description: 'Airbnb about page'
  },
  
  // Contact pages
  {
    url: 'https://www.salesforce.com/contact/',
    expected: 'contact',
    description: 'Salesforce contact page'
  },
  
  // Blog posts
  {
    url: 'https://blog.hubspot.com/marketing/what-is-inbound-marketing',
    expected: 'blog-post',
    description: 'HubSpot blog article'
  },
  
  // Pricing pages
  {
    url: 'https://www.notion.so/pricing',
    expected: 'pricing',
    description: 'Notion pricing page'
  },
  {
    url: 'https://www.slack.com/pricing',
    expected: 'pricing',
    description: 'Slack pricing page'
  },
  
  // Case studies
  {
    url: 'https://www.salesforce.com/customer-success-stories/',
    expected: 'case-study',
    description: 'Salesforce success stories'
  },
];

export async function validatePageTypeDetection() {
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
  
  if (!firecrawlApiKey) {
    console.error('FIRECRAWL_API_KEY not found in environment variables');
    return;
  }

  const firecrawl = new Firecrawl({ apiKey: firecrawlApiKey });
  const detector = new IntelligentPageTypeDetector(firecrawl);
  
  console.log('🔍 Starting Page Type Detection Validation...\n');
  
  const results = [];
  let correct = 0;
  let total = 0;

  for (const testCase of validationUrls) {
    total++;
    console.log(`Testing: ${testCase.description}`);
    console.log(`URL: ${testCase.url}`);
    console.log(`Expected: ${testCase.expected}`);
    
    try {
      const result = await detector.detectPageType(testCase.url);
      
      console.log(`Detected: ${result.pageType}`);
      console.log(`Confidence: ${result.confidence.toFixed(2)}`);
      console.log(`Reasoning: ${result.reasoning}`);
      
      if (result.keyIndicators?.length) {
        console.log(`Key Indicators: ${result.keyIndicators.join(', ')}`);
      }
      
      const isCorrect = result.pageType === testCase.expected;
      if (isCorrect) {
        correct++;
        console.log('✅ CORRECT');
      } else {
        console.log('❌ INCORRECT');
      }
      
      results.push({
        ...testCase,
        actual: result.pageType,
        confidence: result.confidence,
        reasoning: result.reasoning,
        correct: isCorrect,
        keyIndicators: result.keyIndicators
      });
      
    } catch (error) {
      console.log(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({
        ...testCase,
        actual: 'error',
        confidence: 0,
        reasoning: error instanceof Error ? error.message : 'Unknown error',
        correct: false
      });
    }
    
    console.log('─'.repeat(50));
    
    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log(`Total URLs tested: ${total}`);
  console.log(`Correct detections: ${correct}`);
  console.log(`Accuracy: ${((correct / total) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.description}`);
    console.log(`   Expected: ${result.expected} | Actual: ${result.actual} | ${result.correct ? '✅' : '❌'}`);
    console.log(`   Confidence: ${result.confidence.toFixed(2)} | ${result.reasoning}`);
  });
  
  // Confidence analysis
  const confidenceScores = results
    .filter(r => r.actual !== 'error')
    .map(r => r.confidence);
    
  if (confidenceScores.length > 0) {
    const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
    const minConfidence = Math.min(...confidenceScores);
    const maxConfidence = Math.max(...confidenceScores);
    
    console.log('\n📈 CONFIDENCE ANALYSIS:');
    console.log(`Average Confidence: ${avgConfidence.toFixed(3)}`);
    console.log(`Min Confidence: ${minConfidence.toFixed(3)}`);
    console.log(`Max Confidence: ${maxConfidence.toFixed(3)}`);
  }
  
  return {
    accuracy: correct / total,
    totalTested: total,
    correctDetections: correct,
    results
  };
}

// Export for testing
export { validationUrls };