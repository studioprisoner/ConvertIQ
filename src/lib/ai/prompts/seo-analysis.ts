import type { CrawlResult } from '../../crawler/types';

export const TECHNICAL_SEO_SYSTEM_PROMPT = `
You are ConvertIQ AI, a technical SEO expert focused on revenue-driving optimization for small businesses. Your expertise includes:

- Technical SEO fundamentals that impact sales
- Local SEO for service businesses
- E-commerce SEO optimization
- Schema markup for rich snippets
- Small business SEO constraints and opportunities

CORE PRINCIPLES:
1. **Revenue-Focused SEO**: Optimize for conversions, not just rankings
2. **Local Business Priority**: Focus on local search visibility for service businesses
3. **E-commerce Excellence**: Product schema, reviews, and transactional intent
4. **Technical Foundation**: Core elements that search engines and users need
5. **Practical Implementation**: Actionable advice for non-technical business owners

ANALYSIS FRAMEWORK:
Evaluate technical SEO across key areas:

1. **Meta Tags**: Title tags, meta descriptions, proper optimization
2. **Heading Structure**: H1-H6 hierarchy, keyword optimization
3. **Schema Markup**: Structured data for rich snippets
4. **Image SEO**: Alt text, file names, optimization
5. **Technical Foundation**: Core technical elements

SCORING CRITERIA (1-10 scale):
- 1-3: Poor - Major SEO issues limiting visibility
- 4-6: Average - Basic optimization with improvement opportunities
- 7-8: Good - Well-optimized with advanced opportunities
- 9-10: Excellent - SEO best practices fully implemented

IMPACT/EFFORT SCORING:
Impact (1-10): Effect on search visibility and organic traffic
- High (8-10): Significant improvements in search rankings/traffic
- Medium (5-7): Noticeable SEO improvements
- Low (1-4): Minor optimization gains

Effort (1-10): Implementation difficulty
- Low (1-4): Simple HTML changes, quick implementations
- Medium (5-7): Some technical work, moderate expertise needed
- High (8-10): Complex implementations, developer required

Prioritize optimizations that directly impact local search and product/service visibility.
`;

export const generateSeoAnalysisPrompt = (crawlData: CrawlResult): string => {
  return `
Analyze this website for technical SEO optimization opportunities, focusing on elements that drive local visibility, product discovery, and organic traffic conversions.

WEBSITE DATA:
URL: ${crawlData.url}
Content Type: ${crawlData.contentType}

META TAGS ANALYSIS:
- Title Tag: ${crawlData.htmlAnalysis.meta.title || 'MISSING'}
- Title Length: ${crawlData.htmlAnalysis.meta.title?.length || 0} characters
- Meta Description: ${crawlData.htmlAnalysis.meta.description || 'MISSING'}
- Description Length: ${crawlData.htmlAnalysis.meta.description?.length || 0} characters
- Meta Keywords: ${crawlData.htmlAnalysis.meta.keywords || 'Not present'}
- Viewport: ${crawlData.htmlAnalysis.meta.viewport || 'MISSING'}
- Charset: ${crawlData.htmlAnalysis.meta.charset || 'Not specified'}
- Robots: ${crawlData.htmlAnalysis.meta.robots || 'Not specified'}

OPEN GRAPH & SOCIAL:
- OG Title: ${crawlData.htmlAnalysis.meta.ogTitle || 'Not present'}
- OG Description: ${crawlData.htmlAnalysis.meta.ogDescription || 'Not present'}  
- OG Image: ${crawlData.htmlAnalysis.meta.ogImage || 'Not present'}
- Twitter Card: ${crawlData.htmlAnalysis.meta.twitterCard || 'Not present'}

HEADING STRUCTURE:
${JSON.stringify(crawlData.htmlAnalysis.headings.map(h => ({ 
  level: h.level, 
  text: h.text.substring(0, 100) + (h.text.length > 100 ? '...' : '') 
})), null, 2)}

IMAGE SEO ANALYSIS:
- Total Images: ${crawlData.htmlAnalysis.images.length}
- Images with Alt Text: ${crawlData.htmlAnalysis.images.filter(img => img.alt).length}
- Images without Alt Text: ${crawlData.performance.imagesWithoutAlt}
- Images with Size Attributes: ${crawlData.htmlAnalysis.images.filter(img => img.width && img.height).length}
- Logo Images: ${crawlData.htmlAnalysis.images.filter(img => img.isLogo).length}

SAMPLE IMAGES (First 5):
${JSON.stringify(crawlData.htmlAnalysis.images.slice(0, 5).map(img => ({
  src: img.src,
  alt: img.alt || 'NO ALT TEXT',
  isLogo: img.isLogo,
  isHero: img.isHero
})), null, 2)}

CONTENT STRUCTURE:
- Word Count: ${crawlData.htmlAnalysis.structure.wordCount}
- Sections: ${crawlData.htmlAnalysis.structure.sectionsCount}
- Has Header: ${crawlData.htmlAnalysis.structure.hasHeader}
- Has Footer: ${crawlData.htmlAnalysis.structure.hasFooter}

LINKS ANALYSIS:
- Total Links: ${crawlData.htmlAnalysis.links.length}
- Internal Links: ${crawlData.htmlAnalysis.links.filter(link => link.isInternal).length}
- External Links: ${crawlData.htmlAnalysis.links.filter(link => !link.isInternal).length}
- Navigation Links: ${crawlData.htmlAnalysis.links.filter(link => link.isNavigation).length}

PERFORMANCE FACTORS:
- Load Time: ${crawlData.performance.loadTime}ms
- HTML Size: ${(crawlData.performance.htmlSize / 1024).toFixed(1)}KB
- External Resources: ${crawlData.performance.externalResourcesCount}

Analyze this data for technical SEO optimization opportunities and provide:

1. **Meta Tags Optimization**:
   - Evaluate title tag length, keyword placement, and clarity
   - Assess meta description effectiveness for click-through rates
   - Check heading structure (H1 presence, proper hierarchy)
   - Score meta optimization (1-10)

2. **Schema Markup Assessment**:
   - Identify opportunities for structured data implementation
   - Recommend specific schema types (LocalBusiness, Product, Review, etc.)
   - Prioritize schema that creates rich snippets
   - Assess current structured data presence

3. **Image SEO Evaluation**:
   - Calculate percentage of images with alt text
   - Evaluate image file names and optimization
   - Assess image sizing and loading optimization
   - Score image SEO (1-10)

4. **Content & Structure Analysis**:
   - Evaluate content depth and keyword optimization potential
   - Assess internal linking structure
   - Check for SEO-friendly URL structure indicators
   - Analyze content organization for search engines

5. **Technical SEO Recommendations**:
   - Provide 4-6 high-impact technical SEO improvements
   - Focus on elements that drive organic traffic and conversions
   - Include specific implementation steps
   - Score each recommendation for impact (1-10) and effort (1-10)

6. **Priority Action Items**:
   - Identify top 3 technical SEO fixes for immediate implementation
   - Focus on quick wins that improve search visibility
   - Explain how each optimization impacts business goals

7. **Schema Markup Opportunities**:
   - Recommend specific schema markup implementations
   - Prioritize based on business type and content
   - Provide examples of structured data to implement

Format your response as a structured JSON object matching the TechnicalSeoAnalysis schema. Focus on optimizations that improve local search visibility, product/service discovery, and organic conversion rates.

REMEMBER: Small businesses need SEO that drives phone calls, visits, and sales - not just rankings. Prioritize technical elements that impact business-critical search visibility.
`;
};

export const SEO_ANALYSIS_VERSION = "1.0.0";