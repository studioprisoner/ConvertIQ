/**
 * Firecrawl v2 Extraction Schemas for ConvertIQ
 * 
 * These schemas define structured data extraction patterns optimized
 * for conversion rate optimization and marketing analysis.
 */

// Base schema for all ConvertIQ extractions
export const baseConvertiqSchema = {
  type: "object" as const,
  properties: {
    businessInfo: {
      type: "object" as const,
      description: "Core business information",
      properties: {
        name: { 
          type: "string" as const,
          description: "Business or brand name as displayed on the page"
        },
        description: { 
          type: "string" as const,
          description: "Brief description of what the business does"
        },
        industry: { 
          type: "string" as const,
          description: "Industry or business category"
        },
        contactEmail: { 
          type: "string" as const,
          description: "Primary contact email if visible on page"
        },
        phone: { 
          type: "string" as const,
          description: "Phone number if displayed"
        },
        address: { 
          type: "string" as const,
          description: "Physical address if shown"
        },
        website: { 
          type: "string" as const,
          description: "Website URL mentioned on the page"
        }
      }
    }
  }
};

// Conversion-focused extraction schema
export const conversionOptimizationSchema = {
  ...baseConvertiqSchema,
  properties: {
    ...baseConvertiqSchema.properties,
    callsToAction: {
      type: "array" as const,
      description: "All call-to-action elements found on the page",
      items: {
        type: "object" as const,
        properties: {
          text: { 
            type: "string" as const,
            description: "Exact text of the CTA"
          },
          url: { 
            type: "string" as const,
            description: "URL the CTA links to (if applicable)"
          },
          prominence: { 
            type: "string" as const,
            enum: ["primary", "secondary", "tertiary"],
            description: "Visual prominence level of the CTA"
          },
          position: { 
            type: "string" as const,
            description: "Location on page (header, hero, sidebar, footer, etc.)"
          },
          type: { 
            type: "string" as const,
            description: "Type of CTA (button, link, form, etc.)"
          }
        }
      }
    },
    socialProof: {
      type: "object" as const,
      description: "Social proof elements that build trust and credibility",
      properties: {
        testimonials: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Customer testimonials or quotes"
        },
        reviews: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Customer reviews or ratings"
        },
        clientLogos: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Client or partner logo mentions/descriptions"
        },
        certifications: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Certifications, awards, or credentials displayed"
        },
        statistics: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Quantified achievements (e.g., '1000+ customers', '99% uptime')"
        }
      }
    },
    psychologyTriggers: {
      type: "object" as const,
      description: "Psychological persuasion elements",
      properties: {
        scarcity: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Scarcity indicators (limited time, stock, availability)"
        },
        urgency: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Urgency elements (deadlines, countdowns, immediate action)"
        },
        authority: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Authority indicators (expert credentials, media mentions)"
        },
        reciprocity: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Free offers, valuable content, or gifts"
        }
      }
    }
  }
};

// E-commerce focused extraction schema
export const ecommerceSchema = {
  ...baseConvertiqSchema,
  properties: {
    ...baseConvertiqSchema.properties,
    products: {
      type: "array" as const,
      description: "Products or services offered",
      items: {
        type: "object" as const,
        properties: {
          name: { 
            type: "string" as const,
            description: "Product or service name"
          },
          price: { 
            type: "string" as const,
            description: "Price or pricing information"
          },
          description: { 
            type: "string" as const,
            description: "Product description or key features"
          },
          features: { 
            type: "array" as const,
            items: { type: "string" as const },
            description: "Key features or benefits listed"
          },
          images: { 
            type: "array" as const,
            items: { type: "string" as const },
            description: "Product images or visual elements described"
          }
        }
      }
    },
    pricing: {
      type: "object" as const,
      description: "Pricing structure and options",
      properties: {
        plans: { 
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              name: { type: "string" as const },
              price: { type: "string" as const },
              features: { type: "array" as const, items: { type: "string" as const } }
            }
          },
          description: "Pricing plans or tiers"
        },
        guarantees: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Money-back guarantees or warranties"
        },
        paymentOptions: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Accepted payment methods"
        }
      }
    },
    shoppingExperience: {
      type: "object" as const,
      description: "E-commerce user experience elements",
      properties: {
        shippingInfo: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Shipping options and information"
        },
        returnPolicy: { 
          type: "string" as const,
          description: "Return or refund policy details"
        },
        securityIndicators: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Security badges, SSL indicators, trust seals"
        }
      }
    }
  }
};

// SEO and technical extraction schema
export const technicalSeoSchema = {
  ...baseConvertiqSchema,
  properties: {
    ...baseConvertiqSchema.properties,
    seoElements: {
      type: "object" as const,
      description: "Technical SEO elements",
      properties: {
        pageTitle: { 
          type: "string" as const,
          description: "HTML title tag content"
        },
        metaDescription: { 
          type: "string" as const,
          description: "Meta description content"
        },
        headings: { 
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              level: { type: "string" as const, description: "H1, H2, H3, etc." },
              text: { type: "string" as const, description: "Heading text content" }
            }
          },
          description: "Heading structure (H1-H6)"
        },
        keywords: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Apparent target keywords or key phrases"
        }
      }
    },
    contentStructure: {
      type: "object" as const,
      description: "Content organization and structure",
      properties: {
        wordCount: { 
          type: "number" as const,
          description: "Approximate word count of main content"
        },
        readabilityLevel: { 
          type: "string" as const,
          description: "Apparent reading difficulty level"
        },
        contentTypes: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Types of content present (text, images, videos, etc.)"
        }
      }
    }
  }
};

// Lead generation focused schema
export const leadGenerationSchema = {
  ...baseConvertiqSchema,
  properties: {
    ...baseConvertiqSchema.properties,
    leadCapture: {
      type: "object" as const,
      description: "Lead generation and capture elements",
      properties: {
        forms: { 
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              type: { type: "string" as const, description: "Contact, newsletter, quote, etc." },
              fields: { type: "array" as const, items: { type: "string" as const } },
              incentive: { type: "string" as const, description: "What's offered for form completion" }
            }
          },
          description: "Lead capture forms found on page"
        },
        leadMagnets: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Free resources, downloads, or incentives offered"
        },
        contactMethods: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Ways visitors can get in touch (phone, email, chat, etc.)"
        }
      }
    },
    trustBuilders: {
      type: "object" as const,
      description: "Elements that build trust for lead generation",
      properties: {
        aboutInfo: { 
          type: "string" as const,
          description: "Information about the company or person"
        },
        teamInfo: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Team member information or photos"
        },
        locationInfo: { 
          type: "string" as const,
          description: "Physical location or service area information"
        }
      }
    }
  }
};

// Pre-defined extraction configurations for common use cases
export const extractionConfigurations = {
  conversionAudit: {
    schema: conversionOptimizationSchema,
    prompt: `Analyze this page for conversion optimization opportunities. Extract all business information, calls-to-action, social proof elements, and psychological triggers. Focus on elements that influence visitor behavior and conversion rates.`
  },
  
  ecommerceAnalysis: {
    schema: ecommerceSchema,
    prompt: `Extract comprehensive e-commerce information from this page including products, pricing, shopping experience elements, and trust indicators. Focus on elements that affect purchase decisions.`
  },
  
  technicalSeoAudit: {
    schema: technicalSeoSchema,
    prompt: `Extract technical SEO and content structure information. Focus on page titles, meta descriptions, heading structure, content organization, and apparent keyword targeting.`
  },
  
  leadGenAudit: {
    schema: leadGenerationSchema,
    prompt: `Analyze this page for lead generation effectiveness. Extract information about lead capture forms, contact methods, trust-building elements, and incentives offered to visitors.`
  },
  
  comprehensive: {
    schema: {
      type: "object" as const,
      properties: {
        ...conversionOptimizationSchema.properties,
        ...ecommerceSchema.properties.products && { products: ecommerceSchema.properties.products },
        ...ecommerceSchema.properties.pricing && { pricing: ecommerceSchema.properties.pricing },
        ...technicalSeoSchema.properties.seoElements && { seoElements: technicalSeoSchema.properties.seoElements },
        ...leadGenerationSchema.properties.leadCapture && { leadCapture: leadGenerationSchema.properties.leadCapture }
      }
    },
    prompt: `Perform a comprehensive analysis of this webpage extracting all relevant business information, conversion elements, products/services, SEO elements, and lead generation components. This is for a complete marketing and conversion audit.`
  }
};

// Individual schemas are already exported above as const exports