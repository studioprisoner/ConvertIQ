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

// Enhanced conversion-focused extraction schema (CovertIQ expert level)
export const conversionOptimizationSchema = {
  ...baseConvertiqSchema,
  properties: {
    ...baseConvertiqSchema.properties,
    callsToAction: {
      type: "array" as const,
      description: "All call-to-action elements with conversion psychology analysis",
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
          },
          conversionStrength: {
            type: "string" as const,
            enum: ["weak", "moderate", "strong", "compelling"],
            description: "Assessment of CTA persuasiveness and action-orientation"
          },
          psychologyTrigger: {
            type: "string" as const,
            description: "Psychological trigger used (urgency, scarcity, benefit-focused, etc.)"
          }
        }
      }
    },
    revenueElements: {
      type: "object" as const,
      description: "Revenue-focused elements that drive purchasing decisions",
      properties: {
        pricingStrategy: {
          type: "object" as const,
          properties: {
            priceAnchoring: { 
              type: "array" as const,
              items: { type: "string" as const },
              description: "High-value pricing anchors (original prices, premium options)"
            },
            discountMessaging: { 
              type: "array" as const,
              items: { type: "string" as const },
              description: "Discount percentages, savings amounts, promotional messaging"
            },
            valuePropositions: { 
              type: "array" as const,
              items: { type: "string" as const },
              description: "Value statements that justify pricing"
            },
            paymentFlexibility: { 
              type: "array" as const,
              items: { type: "string" as const },
              description: "Payment plans, financing options, installments"
            }
          }
        },
        conversionBarriers: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Identified friction points that may prevent conversions"
        },
        riskReversals: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Guarantees, warranties, return policies that reduce purchase risk"
        },
        urgencyElements: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Time-sensitive offers, limited availability, countdown timers"
        }
      }
    },
    socialProof: {
      type: "object" as const,
      description: "Social proof elements analyzed for conversion impact",
      properties: {
        testimonials: { 
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              text: { type: "string" as const, description: "Testimonial content" },
              author: { type: "string" as const, description: "Customer name/title" },
              credibilityLevel: { 
                type: "string" as const,
                enum: ["low", "medium", "high"],
                description: "Credibility assessment based on specificity and details"
              },
              conversionImpact: {
                type: "string" as const,
                enum: ["weak", "moderate", "strong"],
                description: "Potential impact on visitor purchase decisions"
              }
            }
          },
          description: "Customer testimonials with conversion analysis"
        },
        reviews: { 
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              rating: { type: "string" as const, description: "Star rating or score" },
              text: { type: "string" as const, description: "Review content" },
              volume: { type: "string" as const, description: "Number of reviews if displayed" },
              platform: { type: "string" as const, description: "Review platform (Google, Yelp, etc.)" }
            }
          },
          description: "Customer reviews with detailed analysis"
        },
        trustSignals: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Security badges, certifications, awards, media mentions"
        },
        quantifiedProof: { 
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              statistic: { type: "string" as const, description: "The quantified claim" },
              credibility: { 
                type: "string" as const,
                enum: ["specific", "vague", "questionable"],
                description: "Assessment of statistic believability"
              },
              impact: { type: "string" as const, description: "Business impact area (customers, revenue, satisfaction, etc.)" }
            }
          },
          description: "Quantified achievements with credibility analysis"
        },
        authorityIndicators: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Expert credentials, media appearances, industry recognition"
        }
      }
    },
    psychologyTriggers: {
      type: "object" as const,
      description: "Advanced psychological persuasion analysis per CovertIQ methodology",
      properties: {
        scarcity: { 
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              text: { type: "string" as const, description: "Scarcity message" },
              type: { 
                type: "string" as const, 
                enum: ["time-limited", "quantity-limited", "exclusive-access", "seasonal"],
                description: "Type of scarcity used" 
              },
              authenticity: { 
                type: "string" as const,
                enum: ["authentic", "questionable", "fake"],
                description: "Assessment of scarcity legitimacy"
              },
              effectiveness: {
                type: "string" as const,
                enum: ["low", "medium", "high"],
                description: "Predicted conversion impact"
              }
            }
          },
          description: "Scarcity elements with authenticity assessment"
        },
        urgency: { 
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              text: { type: "string" as const, description: "Urgency message" },
              trigger: { 
                type: "string" as const,
                enum: ["deadline", "countdown", "immediate-action", "consequence-based"],
                description: "Type of urgency trigger"
              },
              ethical: { 
                type: "boolean" as const,
                description: "Whether urgency is ethical and transparent"
              }
            }
          },
          description: "Urgency elements with ethical evaluation"
        },
        authority: { 
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              text: { type: "string" as const, description: "Authority claim" },
              type: { 
                type: "string" as const,
                enum: ["expert-credentials", "media-mention", "certification", "testimonial-authority"],
                description: "Type of authority signal"
              },
              verifiable: { 
                type: "boolean" as const,
                description: "Whether the authority claim is verifiable"
              }
            }
          },
          description: "Authority indicators with credibility assessment"
        },
        reciprocity: { 
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              offer: { type: "string" as const, description: "Free offer or value provided" },
              value: { 
                type: "string" as const,
                enum: ["low", "moderate", "high", "exceptional"],
                description: "Perceived value of the free offer"
              },
              expectation: { type: "string" as const, description: "What's expected in return" }
            }
          },
          description: "Reciprocity elements with value assessment"
        },
        commitment: { 
          type: "array" as const,
          items: { type: "string" as const },
          description: "Commitment and consistency triggers (guarantees, policies, expectations)"
        }
      }
    },
    mobileFirstAnalysis: {
      type: "object" as const,
      description: "Mobile-first revenue analysis per CovertIQ 'Mobile-First Revenue' principle",
      properties: {
        mobileOptimization: {
          type: "object" as const,
          properties: {
            ctaVisibility: { 
              type: "string" as const,
              enum: ["poor", "fair", "good", "excellent"],
              description: "How well CTAs work on mobile devices"
            },
            touchTargets: { 
              type: "string" as const,
              enum: ["too-small", "adequate", "optimal"],
              description: "Assessment of touch target sizes"
            },
            mobileNavigation: { 
              type: "string" as const,
              enum: ["confusing", "basic", "intuitive"],
              description: "Mobile navigation effectiveness"
            },
            loadingExperience: { 
              type: "string" as const,
              enum: ["slow", "moderate", "fast"],
              description: "Perceived mobile loading performance"
            }
          }
        },
        mobileConversionBarriers: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Specific mobile experience issues that could hurt conversions"
        },
        mobileRevenuePotential: {
          type: "string" as const,
          enum: ["limited", "moderate", "high", "excellent"],
          description: "Overall mobile revenue generation potential"
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

// Type definition for extraction configurations
export interface ExtractConfig {
  schema: any;
  prompt: string;
}

// Individual schemas are already exported above as const exports