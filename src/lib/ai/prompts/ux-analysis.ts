import type { CrawlResult } from '../../crawler/types';

export const UX_ANALYSIS_SYSTEM_PROMPT = `
You are ConvertIQ AI, a UX/UI expert specializing in mobile-first revenue optimization for small businesses. Your expertise includes:

- Mobile-first design principles
- User experience optimization for conversions
- Accessibility and usability best practices
- Performance optimization for sales
- Small business design constraints

CORE PRINCIPLES:
1. **Mobile-First Revenue**: Optimize for mobile users first (60%+ of traffic)
2. **Speed Equals Sales**: Fast loading directly impacts conversions
3. **Accessibility is Profitable**: Inclusive design reaches more customers
4. **Simplicity Sells**: Clear, uncluttered designs convert better
5. **Data-Driven Design**: Base recommendations on usability principles

ANALYSIS FRAMEWORK:
Evaluate websites across key UX dimensions:

1. **Mobile Optimization**: Responsive design, touch-friendly, readable
2. **Navigation**: Clear, consistent, intuitive wayfinding
3. **Performance**: Loading speed, image optimization, resource efficiency
4. **Layout & Design**: Visual hierarchy, whitespace, color contrast
5. **Usability**: Task completion ease, error prevention, accessibility

SCORING CRITERIA (1-10 scale):
- 1-3: Poor - Major usability issues, likely losing customers
- 4-6: Average - Some friction points, room for improvement
- 7-8: Good - Well-designed with minor optimization opportunities
- 9-10: Excellent - Best-in-class user experience

IMPACT/EFFORT SCORING:
Impact (1-10): Effect on user experience and conversions
- High (8-10): Significantly improves usability and sales
- Medium (5-7): Noticeable UX improvements
- Low (1-4): Minor enhancements

Effort (1-10): Implementation complexity for small businesses
- Low (1-4): Simple CSS/HTML changes, quick fixes
- Medium (5-7): Some development work, moderate resources
- High (8-10): Major redesign, significant development

Focus on quick wins that dramatically improve mobile user experience.
`;

export const generateUxAnalysisPrompt = (crawlData: CrawlResult): string => {
  return `
Analyze this website for UX/UI optimization opportunities, focusing on mobile-first revenue optimization and user experience improvements.

WEBSITE DATA:
URL: ${crawlData.url}
Load Time: ${crawlData.performance.loadTime}ms
HTML Size: ${(crawlData.performance.htmlSize / 1024).toFixed(1)}KB

MOBILE RESPONSIVENESS:
- Viewport Meta: ${crawlData.cssAnalysis.responsive.hasViewportMeta}
- Media Queries: ${crawlData.cssAnalysis.responsive.hasMediaQueries}
- Mobile-First Design: ${crawlData.cssAnalysis.responsive.hasMobileFirst || 'Unknown'}

NAVIGATION STRUCTURE:
- Has Navigation: ${crawlData.htmlAnalysis.structure.hasNavigation}
- Navigation Links: ${crawlData.htmlAnalysis.links.filter(link => link.isNavigation)}

PERFORMANCE INDICATORS:
- Total Resources: ${crawlData.performance.totalResourcesCount}
- External Resources: ${crawlData.performance.externalResourcesCount}
- Images Without Alt: ${crawlData.performance.imagesWithoutAlt}
- Images Without Size: ${crawlData.performance.imagesWithoutSize}

LAYOUT STRUCTURE:
- Has Header: ${crawlData.htmlAnalysis.structure.hasHeader}
- Has Footer: ${crawlData.htmlAnalysis.structure.hasFooter}
- Has Hero Section: ${crawlData.htmlAnalysis.structure.hasHeroSection}
- Has Sidebar: ${crawlData.htmlAnalysis.structure.hasSidebar}
- Sections Count: ${crawlData.htmlAnalysis.structure.sectionsCount}

CSS ANALYSIS:
- Frameworks: ${crawlData.cssAnalysis.frameworks.join(', ') || 'None detected'}
- Has Inline Styles: ${crawlData.cssAnalysis.hasInlineStyles}
- External Stylesheets: ${crawlData.cssAnalysis.externalStylesheets.length}

IMAGES ANALYSIS:
Total Images: ${crawlData.htmlAnalysis.images.length}
Images with Alt Text: ${crawlData.htmlAnalysis.images.filter(img => img.alt).length}
Hero Images: ${crawlData.htmlAnalysis.images.filter(img => img.isHero).length}
Logo Images: ${crawlData.htmlAnalysis.images.filter(img => img.isLogo).length}

CALLS-TO-ACTION:
${JSON.stringify(crawlData.htmlAnalysis.ctas.map(cta => ({
  text: cta.text,
  type: cta.type,
  position: cta.position,
  prominence: cta.prominence
})), null, 2)}

FORMS USABILITY:
${JSON.stringify(crawlData.htmlAnalysis.forms.map(form => ({
  fieldCount: form.fields.length,
  hasRequiredFields: form.fields.some(field => field.required),
  hasLabels: form.fields.some(field => field.label),
  submitButtonText: form.submitButton?.text
})), null, 2)}

Analyze this data for UX/UI optimization opportunities and provide:

1. **Mobile Optimization Assessment**:
   - Evaluate viewport configuration, responsive design, touch-friendliness
   - Assess text readability and image sizing for mobile
   - Score mobile optimization (1-10)
   - Provide specific mobile improvements

2. **Navigation Analysis**:
   - Evaluate navigation clarity, consistency, and mobile menu
   - Assess wayfinding and user journey flow
   - Check for breadcrumbs and search functionality
   - Score navigation effectiveness (1-10)

3. **Performance Evaluation**:
   - Analyze loading speed indicators and optimization opportunities
   - Evaluate image optimization and resource efficiency
   - Identify performance bottlenecks affecting user experience
   - Score performance (1-10)

4. **Layout & Design Assessment**:
   - Evaluate visual hierarchy and information architecture
   - Assess whitespace usage and design consistency
   - Check color contrast and accessibility considerations
   - Score overall design quality (1-10)

5. **Specific UX Recommendations**:
   - Provide 4-6 high-impact UX improvements
   - Focus on mobile-first optimizations
   - Include implementation steps and business impact
   - Score each recommendation for impact (1-10) and effort (1-10)

6. **Priority Action Items**:
   - Identify top 3 UX changes for immediate implementation
   - Focus on quick wins that improve mobile user experience
   - Explain how each change impacts revenue potential

Format your response as a structured JSON object matching the UxAnalysis schema. Prioritize improvements that directly impact mobile conversions and user task completion.

REMEMBER: Mobile users account for 60%+ of traffic. Optimize for touch interactions, fast loading, and simplified navigation first.
`;
};

export const UX_ANALYSIS_VERSION = "1.0.0";