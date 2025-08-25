// Extraction Schemas for Different Page Types
// Implementation ready for Phase 3

export const ecommerceProductSchema = {
  type: "object",
  properties: {
    product: {
      type: "object",
      properties: {
        name: { type: "string" },
        price: { 
          type: "object",
          properties: {
            current: { type: "string" },
            original: { type: "string" },
            currency: { type: "string" },
            discount: { type: "string" }
          }
        },
        description: { type: "string" },
        features: { type: "array", items: { type: "string" } },
        specifications: { type: "object" },
        images: { type: "array", items: { type: "string" } },
        availability: { type: "string" },
        sku: { type: "string" },
        category: { type: "string" },
        brand: { type: "string" },
        rating: {
          type: "object", 
          properties: {
            score: { type: "number" },
            count: { type: "number" },
            distribution: { type: "object" }
          }
        }
      }
    },
    callsToAction: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          type: { type: "string", enum: ["buy", "add-to-cart", "checkout", "contact", "learn-more"] },
          prominence: { type: "string", enum: ["primary", "secondary", "tertiary"] },
          position: { type: "string" },
          urgency: { type: "string" },
          offer: { type: "string" }
        }
      }
    },
    socialProof: {
      type: "object",
      properties: {
        reviews: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rating: { type: "number" },
              text: { type: "string" },
              author: { type: "string" },
              date: { type: "string" },
              verified: { type: "boolean" }
            }
          }
        },
        testimonials: { type: "array", items: { type: "string" } },
        trustBadges: { type: "array", items: { type: "string" } },
        securityFeatures: { type: "array", items: { type: "string" } },
        guarantees: { type: "array", items: { type: "string" } }
      }
    },
    conversionElements: {
      type: "object",
      properties: {
        scarcityIndicators: { type: "array", items: { type: "string" } },
        urgencyMessages: { type: "array", items: { type: "string" } },
        personalizedRecommendations: { type: "array", items: { type: "string" } },
        crossSells: { type: "array", items: { type: "string" } },
        upsells: { type: "array", items: { type: "string" } }
      }
    }
  }
};

export const servicePageSchema = {
  type: "object", 
  properties: {
    service: {
      type: "object",
      properties: {
        name: { type: "string" },
        tagline: { type: "string" },
        valueProposition: { type: "string" },
        benefits: { type: "array", items: { type: "string" } },
        features: { type: "array", items: { type: "string" } },
        process: { type: "array", items: { type: "string" } },
        pricing: {
          type: "object",
          properties: {
            packages: { type: "array", items: { type: "object" } },
            startingPrice: { type: "string" },
            pricingModel: { type: "string" }
          }
        }
      }
    },
    businessInfo: {
      type: "object",
      properties: {
        name: { type: "string" },
        location: { type: "string" },
        serviceArea: { type: "string" },
        yearsInBusiness: { type: "string" },
        teamSize: { type: "string" },
        specializations: { type: "array", items: { type: "string" } }
      }
    },
    contactInfo: {
      type: "object",
      properties: {
        phone: { type: "string" },
        email: { type: "string" },
        address: { type: "string" },
        hours: { type: "string" },
        contactMethods: { type: "array", items: { type: "string" } }
      }
    },
    credentialsAndProof: {
      type: "object", 
      properties: {
        certifications: { type: "array", items: { type: "string" } },
        awards: { type: "array", items: { type: "string" } },
        clientTestimonials: { type: "array", items: { type: "object" } },
        caseStudies: { type: "array", items: { type: "object" } },
        beforeAfterExamples: { type: "array", items: { type: "string" } }
      }
    },
    leadCapture: {
      type: "object",
      properties: {
        primaryOffer: { type: "string" },
        leadMagnets: { type: "array", items: { type: "string" } },
        formFields: { type: "array", items: { type: "string" } },
        guarantees: { type: "array", items: { type: "string" } }
      }
    }
  }
};

export const homepageSchema = {
  type: "object",
  properties: {
    company: {
      type: "object", 
      properties: {
        name: { type: "string" },
        mission: { type: "string" },
        vision: { type: "string" },
        values: { type: "array", items: { type: "string" } },
        foundedYear: { type: "string" },
        headquarters: { type: "string" },
        size: { type: "string" },
        industry: { type: "string" }
      }
    },
    navigation: {
      type: "object",
      properties: {
        primaryMenu: { type: "array", items: { type: "string" } },
        secondaryMenu: { type: "array", items: { type: "string" } },
        footerLinks: { type: "array", items: { type: "string" } },
        ctaButtons: { type: "array", items: { type: "object" } }
      }
    },
    heroSection: {
      type: "object",
      properties: {
        headline: { type: "string" },
        subheadline: { type: "string" },
        valueProposition: { type: "string" },
        primaryCTA: { type: "object" },
        secondaryCTA: { type: "object" },
        heroImage: { type: "string" }
      }
    },
    productsServices: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          benefits: { type: "array", items: { type: "string" } },
          link: { type: "string" }
        }
      }
    },
    socialProofElements: {
      type: "object",
      properties: {
        clientLogos: { type: "array", items: { type: "string" } },
        testimonials: { type: "array", items: { type: "object" } },
        statistics: { type: "array", items: { type: "object" } },
        awards: { type: "array", items: { type: "string" } },
        mediaMentions: { type: "array", items: { type: "string" } }
      }
    }
  }
};

export const contentPageSchema = {
  type: "object",
  properties: {
    content: {
      type: "object",
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        author: { type: "object" },
        publishDate: { type: "string" },
        lastUpdated: { type: "string" },
        category: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        readTime: { type: "string" },
        wordCount: { type: "number" },
        headingStructure: { type: "array", items: { type: "object" } }
      }
    },
    engagement: {
      type: "object",
      properties: {
        socialSharing: { type: "array", items: { type: "string" } },
        comments: { type: "object" },
        relatedPosts: { type: "array", items: { type: "object" } },
        callsToAction: { type: "array", items: { type: "object" } },
        emailSignup: { type: "object" },
        downloadOffers: { type: "array", items: { type: "object" } }
      }
    },
    seoElements: {
      type: "object",
      properties: {
        metaTitle: { type: "string" },
        metaDescription: { type: "string" },
        canonicalUrl: { type: "string" },
        breadcrumbs: { type: "array", items: { type: "string" } },
        internalLinks: { type: "array", items: { type: "object" } },
        externalLinks: { type: "array", items: { type: "object" } }
      }
    }
  }
};

// Schema mapping for page types
export const schemaMapping = {
  'ecommerce-product': ecommerceProductSchema,
  'ecommerce-category': ecommerceProductSchema, // Use same schema for category pages
  'service-landing': servicePageSchema,
  'corporate-homepage': homepageSchema,
  'about-us': homepageSchema, // Use homepage schema as fallback
  'contact': servicePageSchema, // Use service schema for contact pages
  'blog-post': contentPageSchema,
  'landing-page': servicePageSchema,
  'pricing': servicePageSchema,
  'case-study': contentPageSchema,
  'product-comparison': ecommerceProductSchema,
} as const;