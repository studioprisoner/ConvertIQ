// Extraction Prompts for Different Page Types
// Implementation ready for Phase 3

export const ecommercePrompt = `
Extract detailed e-commerce product information from this page. Focus on:

PRODUCT DETAILS:
- Product name, pricing (including discounts), description, and key features
- Technical specifications and product variants
- Availability status and inventory indicators

CONVERSION ELEMENTS:
- All call-to-action buttons (buy now, add to cart, etc.)
- Urgency and scarcity messages ("Only 2 left!", "Sale ends soon!")
- Trust signals and security badges

SOCIAL PROOF:
- Customer reviews and ratings with specific details
- Testimonials and customer feedback
- Trust badges, certifications, and guarantees

PSYCHOLOGY TRIGGERS:
- Scarcity indicators and limited-time offers  
- Social proof elements and popularity indicators
- Risk-reduction elements (money-back guarantee, free shipping, etc.)

Be thorough and extract all relevant conversion-focused elements.
`;

export const servicePrompt = `
Extract comprehensive service business information from this page. Focus on:

SERVICE DETAILS:
- Service name, tagline, and core value proposition
- Key benefits and features offered
- Service process or methodology
- Pricing packages and models

BUSINESS INFORMATION:
- Company name, location, and service area
- Years in business, team size, and specializations
- Contact information and business hours
- Preferred contact methods

CREDIBILITY & PROOF:
- Professional certifications and awards
- Client testimonials and case studies
- Before/after examples and success stories
- Industry recognition and media mentions

LEAD CAPTURE ELEMENTS:
- Primary offers and lead magnets
- Contact forms and required fields
- Guarantees and risk-reduction offers
- Call-to-action buttons and messaging

Extract all elements that establish trust and encourage contact or conversion.
`;

export const homepagePrompt = `
Extract comprehensive corporate homepage information. Focus on:

COMPANY INFORMATION:
- Company name, mission, vision, and core values
- Founded year, headquarters, company size, and industry
- Leadership team and organizational structure

NAVIGATION & STRUCTURE:
- Primary and secondary navigation menus
- Footer links and important pages
- Call-to-action buttons throughout the page

HERO SECTION:
- Main headline and subheadline
- Primary value proposition
- Hero image and primary/secondary CTAs

PRODUCTS & SERVICES:
- Overview of main products or services
- Key benefits and differentiators
- Links to detailed product/service pages

SOCIAL PROOF & CREDIBILITY:
- Client logos and partnerships
- Customer testimonials and success stories
- Company statistics and achievements
- Awards, certifications, and media mentions

Extract all elements that establish company credibility and guide user journey.
`;

export const contentPrompt = `
Extract detailed content page information. Focus on:

CONTENT STRUCTURE:
- Article title, subtitle, and main headings
- Author information and publication details
- Category, tags, and content classification
- Estimated read time and word count

ENGAGEMENT ELEMENTS:
- Social sharing options and mechanisms
- Comment sections and user interaction
- Related posts and content recommendations
- Newsletter signup and email capture

SEO & NAVIGATION:
- Meta title and description
- Canonical URL and breadcrumb navigation
- Internal and external link structure
- Content optimization indicators

CONVERSION OPPORTUNITIES:
- Call-to-action buttons within content
- Download offers and lead magnets
- Product/service mentions and recommendations
- Contact or consultation opportunities

Extract all elements that support content engagement and conversion.
`;

// Prompt mapping for page types
export const promptMapping = {
  'ecommerce-product': ecommercePrompt,
  'ecommerce-category': ecommercePrompt,
  'service-landing': servicePrompt,
  'corporate-homepage': homepagePrompt,
  'about-us': homepagePrompt,
  'contact': servicePrompt,
  'blog-post': contentPrompt,
  'landing-page': servicePrompt,
  'pricing': servicePrompt,
  'case-study': contentPrompt,
  'product-comparison': ecommercePrompt,
} as const;