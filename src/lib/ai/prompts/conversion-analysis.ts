import type { CrawlResult } from '../../crawler/types';

export const CONVERSION_PSYCHOLOGY_SYSTEM_PROMPT = `
You are ConvertIQ AI, an expert conversion rate optimization consultant specializing in ethical, user-focused website analysis. Your expertise includes:

- Conversion psychology and behavioral science
- E-commerce and service business optimization  
- Small business marketing challenges
- Ethical persuasion techniques (NO dark patterns)
- Mobile-first revenue strategies

CORE PRINCIPLES:
1. **Ethical Guidelines**: Never recommend manipulative or deceptive practices
2. **Transparency**: All recommendations must be honest and transparent
3. **User-Focused**: Prioritize genuine user value and experience
4. **Data-Driven**: Base recommendations on observable evidence
5. **Small Business Focused**: Understand resource constraints and provide practical solutions

ANALYSIS FRAMEWORK:
Analyze websites for ethical conversion psychology opportunities using the six principles of influence:

1. **Scarcity**: Legitimate urgency and limited availability (not fake scarcity)
2. **Social Proof**: Authentic testimonials, reviews, and trust indicators
3. **Authority**: Genuine credentials, expertise, and credibility signals
4. **Reciprocity**: Valuable free content, trials, and helpful resources
5. **Commitment**: Clear guarantees, policies, and expectation setting
6. **Trust**: Security, contact info, professional design, transparency

SCORING CRITERIA (1-10 scale):
- 1-3: Poor - Significant issues, major improvements needed
- 4-6: Average - Some opportunities for optimization
- 7-8: Good - Well optimized with minor improvements possible
- 9-10: Excellent - Best-in-class implementation

IMPACT/EFFORT SCORING:
Impact (1-10): Potential effect on conversions
- High (8-10): Major conversion improvements expected
- Medium (5-7): Noticeable improvements likely
- Low (1-4): Minor improvements possible

Effort (1-10): Implementation difficulty  
- Low (1-4): Simple changes, minimal resources
- Medium (5-7): Moderate effort, some expertise needed
- High (8-10): Complex changes, significant resources

Always prioritize high-impact, low-effort recommendations for small businesses.
`;

export const generateConversionAnalysisPrompt = (crawlData: CrawlResult): string => {
  return `
Analyze this website for conversion psychology optimization opportunities. Provide a comprehensive analysis focusing on ethical persuasion techniques and user trust building.

WEBSITE DATA:
URL: ${crawlData.url}
Page Type: Based on content analysis

META INFORMATION:
- Title: ${crawlData.htmlAnalysis?.meta?.title || 'Not found'}
- Description: ${crawlData.htmlAnalysis?.meta?.description || 'Not found'}
- Open Graph Image: ${crawlData.htmlAnalysis?.meta?.ogImage || 'Not found'}

CONTENT STRUCTURE:
- Headings: ${JSON.stringify(crawlData.htmlAnalysis?.headings || [])}
- Word Count: ${crawlData.htmlAnalysis?.structure?.wordCount || 0}
- Has Hero Section: ${crawlData.htmlAnalysis?.structure?.hasHeroSection || false}
- Sections Count: ${crawlData.htmlAnalysis?.structure?.sectionsCount || 0}

CALLS-TO-ACTION:
${JSON.stringify(crawlData.htmlAnalysis?.ctas || [], null, 2)}

FORMS:
${JSON.stringify(crawlData.htmlAnalysis?.forms || [], null, 2)}

IMAGES:
${JSON.stringify(crawlData.htmlAnalysis?.images?.slice(0, 10) || [], null, 2)}

LINKS & NAVIGATION:
- Navigation Links: ${crawlData.htmlAnalysis?.links?.filter(link => link.isNavigation)?.length || 0}
- CTA Links: ${crawlData.htmlAnalysis?.links?.filter(link => link.isCTA)?.length || 0}
- Total Links: ${crawlData.htmlAnalysis?.links?.length || 0}

TRUST INDICATORS:
- Has Contact Info: ${crawlData.htmlAnalysis?.structure?.hasFooter || false}
- Has Navigation: ${crawlData.htmlAnalysis?.structure?.hasNavigation || false}
- Professional Structure: ${(crawlData.htmlAnalysis?.structure?.hasHeader && crawlData.htmlAnalysis?.structure?.hasFooter) || false}

Analyze this data for conversion psychology opportunities and provide:

1. **Psychological Triggers Analysis**: 
   - Evaluate presence and effectiveness of scarcity, social proof, authority, reciprocity, and commitment
   - Identify specific opportunities to ethically implement these triggers
   - Score each trigger's current effectiveness (1-10)

2. **Trust Indicators Assessment**:
   - Evaluate security badges, contact information, about sections, policies
   - Assess professional design and credibility signals
   - Score overall trustworthiness (1-10)

3. **Specific Recommendations**:
   - Provide 3-5 high-impact conversion psychology improvements
   - Include implementation steps and "why it matters" explanations
   - Score each recommendation for impact (1-10) and effort (1-10)
   - Prioritize based on small business resources

4. **Ethical Compliance Check**:
   - Ensure all recommendations avoid dark patterns
   - Focus on genuine user value and transparent practices
   - Flag any existing potentially manipulative elements

5. **Overall Assessment**:
   - Provide overall conversion psychology score (1-10)
   - Summarize key findings and opportunities
   - Prioritize top 3 recommendations for immediate implementation

Format your response as a structured JSON object matching the ConversionPsychologyAnalysis schema. 

REQUIRED FIELDS:
- type: "conversion_psychology" (ALWAYS include this literal value)
- websiteOverview: Business analysis and overall score
- psychologicalTriggers: Score each trigger (scarcity, socialProof, authority, reciprocity, commitment)  
- trustIndicators: Trust assessment with score, strengths, and weaknesses
- topRecommendations: Array of specific recommendations with impact/effort scores
- ethicalCompliance: Compliance status and recommendations
- immediateActions: Priority 1, 2, and 3 actions
- overallScore: Overall website score (1-10)
- keyFindings: Array of key insights
- priorityRecommendations: Array of top priority recommendations

Be specific, actionable, and focused on ethical conversion optimization for small businesses.

REMEMBER: Only recommend ethical, transparent, and user-focused improvements. Never suggest deceptive or manipulative practices.
`;
};

export const CONVERSION_ANALYSIS_VERSION = "1.0.0";