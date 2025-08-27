/**
 * Enhanced Schema Generator - Phase 3 Implementation
 * 
 * Provides dynamic schema generation for structured data extraction:
 * - Custom schema creation based on business type
 * - Industry-specific extraction patterns
 * - Dynamic prompt generation
 * - Schema validation and optimization
 */

import { z } from 'zod';

export type BusinessType = 
  | 'ecommerce'
  | 'saas'
  | 'service-local'
  | 'service-professional'
  | 'content-media'
  | 'nonprofit'
  | 'restaurant-hospitality'
  | 'real-estate'
  | 'healthcare'
  | 'education'
  | 'finance'
  | 'generic';

export type AnalysisDepth = 'basic' | 'standard' | 'comprehensive' | 'competitive';

export type ExtractionFocus = 
  | 'conversion-optimization'
  | 'seo-analysis'
  | 'competitor-analysis'
  | 'content-audit'
  | 'technical-analysis'
  | 'user-experience'
  | 'performance-analysis';

export interface CustomExtractionSchema {
  schema: Record<string, any>;
  prompt: string;
  validation: z.ZodSchema;
  metadata: {
    businessType: BusinessType;
    analysisDepth: AnalysisDepth;
    focus: ExtractionFocus[];
    estimatedComplexity: 1 | 2 | 3 | 4 | 5;
    requiredFields: string[];
    optionalFields: string[];
  };
}

export interface SchemaGenerationOptions {
  businessType: BusinessType;
  analysisDepth: AnalysisDepth;
  focusAreas: ExtractionFocus[];
  customFields?: Record<string, any>;
  industryContext?: string;
  competitorUrls?: string[];
  prioritizeFields?: string[];
}

/**
 * Enhanced Schema Generator for dynamic extraction patterns
 */
export class EnhancedSchemaGenerator {
  private baseSchemas: Map<BusinessType, any> = new Map();
  private focusModules: Map<ExtractionFocus, any> = new Map();
  private industryTemplates: Map<string, any> = new Map();

  constructor() {
    this.initializeBaseSchemas();
    this.initializeFocusModules();
    this.initializeIndustryTemplates();
  }

  /**
   * Generate a custom extraction schema based on requirements
   */
  generateCustomSchema(options: SchemaGenerationOptions): CustomExtractionSchema {
    const baseSchema = this.getBaseSchema(options.businessType);
    const focusModules = this.getFocusModules(options.focusAreas);
    const industryEnhancements = this.getIndustryEnhancements(options.industryContext);

    // Merge all schema components
    const mergedSchema = this.mergeSchemas(baseSchema, focusModules, industryEnhancements);

    // Apply custom fields if provided
    if (options.customFields) {
      Object.assign(mergedSchema.properties, options.customFields);
    }

    // Generate dynamic prompt
    const prompt = this.generateDynamicPrompt(options, mergedSchema);

    // Create validation schema
    const validation = this.createValidationSchema(mergedSchema);

    // Calculate complexity and metadata
    const metadata = this.generateMetadata(options, mergedSchema);

    return {
      schema: mergedSchema,
      prompt,
      validation,
      metadata
    };
  }

  /**
   * Generate schema specifically for competitive analysis
   */
  generateCompetitiveSchema(
    primaryBusinessType: BusinessType,
    competitorUrls: string[],
    focusAreas: ExtractionFocus[] = ['conversion-optimization', 'seo-analysis']
  ): CustomExtractionSchema {
    const baseSchema = this.getCompetitiveBaseSchema(primaryBusinessType);
    
    // Add competitor-specific fields
    const competitiveFields = {
      competitiveAnalysis: {
        type: "object",
        description: "Competitive analysis data",
        properties: {
          uniqueValueProposition: {
            type: "string",
            description: "How this website differentiates from competitors"
          },
          pricingStrategy: {
            type: "object",
            description: "Pricing approach and transparency",
            properties: {
              transparent: { type: "boolean" },
              competitive: { type: "boolean" },
              strategy: { type: "string" }
            }
          },
          competitiveAdvantages: {
            type: "array",
            description: "Identified competitive advantages",
            items: { type: "string" }
          },
          competitiveWeaknesses: {
            type: "array",
            description: "Areas where competitors may be stronger",
            items: { type: "string" }
          },
          marketPositioning: {
            type: "string",
            description: "How the brand positions itself in the market"
          }
        }
      }
    };

    const schema = {
      ...baseSchema,
      properties: {
        ...baseSchema.properties,
        ...competitiveFields
      }
    };

    const prompt = this.generateCompetitivePrompt(primaryBusinessType, competitorUrls, focusAreas);
    const validation = this.createValidationSchema(schema);

    return {
      schema,
      prompt,
      validation,
      metadata: {
        businessType: primaryBusinessType,
        analysisDepth: 'comprehensive',
        focus: [...focusAreas, 'competitor-analysis'],
        estimatedComplexity: 5,
        requiredFields: ['competitiveAnalysis', 'businessInfo'],
        optionalFields: ['products', 'services']
      }
    };
  }

  /**
   * Generate industry-specific schema
   */
  generateIndustrySchema(
    industry: string,
    businessType: BusinessType,
    analysisDepth: AnalysisDepth = 'standard'
  ): CustomExtractionSchema {
    const baseSchema = this.getBaseSchema(businessType);
    const industryTemplate = this.industryTemplates.get(industry.toLowerCase());
    
    let enhancedSchema = baseSchema;
    
    if (industryTemplate) {
      enhancedSchema = this.mergeSchemas(baseSchema, industryTemplate);
    }

    // Add industry-specific prompt context
    const prompt = this.generateIndustryPrompt(industry, businessType, analysisDepth);
    const validation = this.createValidationSchema(enhancedSchema);

    return {
      schema: enhancedSchema,
      prompt,
      validation,
      metadata: {
        businessType,
        analysisDepth,
        focus: ['conversion-optimization', 'seo-analysis'],
        estimatedComplexity: 3,
        requiredFields: ['businessInfo'],
        optionalFields: Object.keys(enhancedSchema.properties || {})
      }
    };
  }

  /**
   * Optimize schema based on previous extraction results
   */
  optimizeSchema(
    baseSchema: CustomExtractionSchema,
    previousResults: any[],
    successMetrics: { completeness: number; accuracy: number; relevance: number }
  ): CustomExtractionSchema {
    // Analyze field success rates
    const fieldAnalysis = this.analyzeFieldPerformance(previousResults);
    
    // Remove low-performing fields
    const optimizedSchema = this.removeUnderperformingFields(baseSchema.schema, fieldAnalysis);
    
    // Add high-value fields that were missing
    const enhancedSchema = this.addHighValueFields(optimizedSchema, fieldAnalysis);
    
    // Refine prompt based on success patterns
    const optimizedPrompt = this.refinePrompt(baseSchema.prompt, fieldAnalysis, successMetrics);

    return {
      ...baseSchema,
      schema: enhancedSchema,
      prompt: optimizedPrompt,
      validation: this.createValidationSchema(enhancedSchema),
      metadata: {
        ...baseSchema.metadata,
        estimatedComplexity: Math.max(1, baseSchema.metadata.estimatedComplexity - 1) as 1 | 2 | 3 | 4 | 5
      }
    };
  }

  /**
   * Initialize base schemas for different business types
   */
  private initializeBaseSchemas(): void {
    // E-commerce base schema
    this.baseSchemas.set('ecommerce', {
      type: "object",
      properties: {
        businessInfo: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            industry: { type: "string" },
            targetMarket: { type: "string" }
          }
        },
        products: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              price: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
              availability: { type: "boolean" }
            }
          }
        },
        ecommerce: {
          type: "object",
          properties: {
            shoppingCart: { type: "boolean" },
            checkoutProcess: { type: "string" },
            paymentMethods: { type: "array", items: { type: "string" } },
            shippingInfo: { type: "string" },
            returnPolicy: { type: "string" }
          }
        }
      }
    });

    // SaaS base schema
    this.baseSchemas.set('saas', {
      type: "object",
      properties: {
        businessInfo: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            targetUsers: { type: "string" },
            industry: { type: "string" }
          }
        },
        saasFeatures: {
          type: "object",
          properties: {
            keyFeatures: { type: "array", items: { type: "string" } },
            integrations: { type: "array", items: { type: "string" } },
            apiAvailability: { type: "boolean" },
            scalability: { type: "string" },
            security: { type: "array", items: { type: "string" } }
          }
        },
        pricing: {
          type: "object",
          properties: {
            model: { type: "string" },
            plans: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  price: { type: "string" },
                  features: { type: "array", items: { type: "string" } }
                }
              }
            },
            freeTrial: { type: "boolean" },
            freemium: { type: "boolean" }
          }
        }
      }
    });

    // Local service base schema
    this.baseSchemas.set('service-local', {
      type: "object",
      properties: {
        businessInfo: {
          type: "object",
          properties: {
            name: { type: "string" },
            serviceType: { type: "string" },
            location: { type: "string" },
            serviceArea: { type: "string" },
            contactInfo: {
              type: "object",
              properties: {
                phone: { type: "string" },
                email: { type: "string" },
                address: { type: "string" }
              }
            }
          }
        },
        services: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              pricing: { type: "string" },
              duration: { type: "string" }
            }
          }
        },
        localSeo: {
          type: "object",
          properties: {
            googleMyBusiness: { type: "boolean" },
            localKeywords: { type: "array", items: { type: "string" } },
            serviceAreaMentions: { type: "boolean" },
            hoursOfOperation: { type: "string" }
          }
        }
      }
    });

    // Add more base schemas for other business types...
  }

  /**
   * Initialize focus modules for different analysis types
   */
  private initializeFocusModules(): void {
    this.focusModules.set('conversion-optimization', {
      conversionElements: {
        type: "object",
        properties: {
          callsToAction: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                position: { type: "string" },
                prominence: { type: "string" },
                action: { type: "string" }
              }
            }
          },
          forms: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                fields: { type: "number" },
                placement: { type: "string" },
                incentive: { type: "string" }
              }
            }
          },
          trustSignals: {
            type: "object",
            properties: {
              testimonials: { type: "number" },
              reviews: { type: "number" },
              certifications: { type: "array", items: { type: "string" } },
              guarantees: { type: "array", items: { type: "string" } }
            }
          },
          psychologyTriggers: {
            type: "object",
            properties: {
              scarcity: { type: "boolean" },
              urgency: { type: "boolean" },
              authority: { type: "boolean" },
              socialProof: { type: "boolean" }
            }
          }
        }
      }
    });

    this.focusModules.set('seo-analysis', {
      seoElements: {
        type: "object",
        properties: {
          titleTags: { type: "string" },
          metaDescriptions: { type: "string" },
          headings: {
            type: "object",
            properties: {
              h1: { type: "array", items: { type: "string" } },
              h2: { type: "array", items: { type: "string" } },
              h3: { type: "array", items: { type: "string" } }
            }
          },
          keywords: { type: "array", items: { type: "string" } },
          internalLinks: { type: "number" },
          externalLinks: { type: "number" },
          imageAltTags: { type: "boolean" },
          schemaMarkup: { type: "boolean" }
        }
      }
    });

    this.focusModules.set('user-experience', {
      uxElements: {
        type: "object",
        properties: {
          navigation: {
            type: "object",
            properties: {
              menuStructure: { type: "string" },
              breadcrumbs: { type: "boolean" },
              searchFunction: { type: "boolean" },
              mobileMenu: { type: "boolean" }
            }
          },
          contentLayout: {
            type: "object",
            properties: {
              readability: { type: "string" },
              visualHierarchy: { type: "string" },
              whitespace: { type: "string" },
              typography: { type: "string" }
            }
          },
          interactiveElements: {
            type: "object",
            properties: {
              buttons: { type: "string" },
              forms: { type: "string" },
              animations: { type: "boolean" },
              feedback: { type: "string" }
            }
          },
          accessibility: {
            type: "object",
            properties: {
              altTags: { type: "boolean" },
              colorContrast: { type: "string" },
              keyboardNavigation: { type: "boolean" },
              screenReaderFriendly: { type: "boolean" }
            }
          }
        }
      }
    });
  }

  /**
   * Initialize industry-specific templates
   */
  private initializeIndustryTemplates(): void {
    this.industryTemplates.set('healthcare', {
      healthcareSpecific: {
        type: "object",
        properties: {
          services: { type: "array", items: { type: "string" } },
          credentials: { type: "array", items: { type: "string" } },
          insuranceAccepted: { type: "array", items: { type: "string" } },
          appointmentBooking: { type: "boolean" },
          patientPortal: { type: "boolean" },
          telemedicine: { type: "boolean" },
          hipaaCompliance: { type: "boolean" }
        }
      }
    });

    this.industryTemplates.set('real estate', {
      realEstateSpecific: {
        type: "object",
        properties: {
          propertyTypes: { type: "array", items: { type: "string" } },
          serviceAreas: { type: "array", items: { type: "string" } },
          mlsIntegration: { type: "boolean" },
          propertySearch: { type: "boolean" },
          virtualTours: { type: "boolean" },
          mortgageCalculator: { type: "boolean" },
          agentProfiles: { type: "boolean" }
        }
      }
    });

    this.industryTemplates.set('restaurant', {
      restaurantSpecific: {
        type: "object",
        properties: {
          cuisineType: { type: "string" },
          menuAvailable: { type: "boolean" },
          onlineOrdering: { type: "boolean" },
          reservations: { type: "boolean" },
          delivery: { type: "boolean" },
          hoursOfOperation: { type: "string" },
          specialDiets: { type: "array", items: { type: "string" } }
        }
      }
    });
  }

  /**
   * Get base schema for business type
   */
  private getBaseSchema(businessType: BusinessType): any {
    return this.baseSchemas.get(businessType) || this.baseSchemas.get('generic') || {
      type: "object",
      properties: {
        businessInfo: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            industry: { type: "string" }
          }
        }
      }
    };
  }

  /**
   * Get focus modules for specified focus areas
   */
  private getFocusModules(focusAreas: ExtractionFocus[]): any[] {
    return focusAreas.map(focus => this.focusModules.get(focus)).filter(Boolean);
  }

  /**
   * Get industry enhancements
   */
  private getIndustryEnhancements(industry?: string): any {
    if (!industry) return {};
    return this.industryTemplates.get(industry.toLowerCase()) || {};
  }

  /**
   * Merge multiple schemas together
   */
  private mergeSchemas(...schemas: any[]): any {
    const merged = { type: "object", properties: {} };
    
    schemas.forEach(schema => {
      if (schema && schema.properties) {
        Object.assign(merged.properties, schema.properties);
      }
    });

    return merged;
  }

  /**
   * Generate dynamic prompt based on schema and options
   */
  private generateDynamicPrompt(options: SchemaGenerationOptions, schema: any): string {
    const { businessType, analysisDepth, focusAreas } = options;
    
    let prompt = `You are analyzing a ${businessType} website. `;
    
    // Add analysis depth context
    switch (analysisDepth) {
      case 'basic':
        prompt += "Provide a basic analysis focusing on the most essential elements. ";
        break;
      case 'comprehensive':
        prompt += "Provide a detailed, comprehensive analysis covering all aspects thoroughly. ";
        break;
      case 'competitive':
        prompt += "Analyze this website with a competitive lens, identifying strengths and weaknesses relative to competitors. ";
        break;
      default:
        prompt += "Provide a standard analysis covering key elements. ";
    }

    // Add focus area guidance
    if (focusAreas.length > 0) {
      prompt += `Pay special attention to: ${focusAreas.join(', ')}. `;
    }

    // Add business-specific guidance
    switch (businessType) {
      case 'ecommerce':
        prompt += "Focus on product presentation, shopping experience, trust signals, and conversion optimization. ";
        break;
      case 'saas':
        prompt += "Focus on feature presentation, pricing transparency, trial/demo options, and user onboarding. ";
        break;
      case 'service-local':
        prompt += "Focus on local SEO elements, service descriptions, contact information, and trust building. ";
        break;
    }

    prompt += "Extract structured data according to the provided schema, ensuring accuracy and completeness. If information is not available, indicate this clearly rather than making assumptions.";

    return prompt;
  }

  /**
   * Create Zod validation schema from JSON schema
   */
  private createValidationSchema(schema: any): z.ZodSchema {
    // This is a simplified conversion - in a real implementation,
    // you'd have a more comprehensive JSON Schema to Zod converter
    return z.object({
      businessInfo: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        industry: z.string().optional()
      }).optional(),
      // Add other validations based on schema structure
    }).passthrough(); // Allow additional properties
  }

  /**
   * Generate metadata for the schema
   */
  private generateMetadata(options: SchemaGenerationOptions, schema: any): CustomExtractionSchema['metadata'] {
    const fieldCount = this.countFields(schema);
    const complexity = this.calculateComplexity(fieldCount, options.analysisDepth, options.focusAreas.length);
    
    return {
      businessType: options.businessType,
      analysisDepth: options.analysisDepth,
      focus: options.focusAreas,
      estimatedComplexity: complexity,
      requiredFields: this.extractRequiredFields(schema),
      optionalFields: this.extractOptionalFields(schema)
    };
  }

  private countFields(schema: any): number {
    if (!schema.properties) return 0;
    
    let count = 0;
    for (const [_, value] of Object.entries(schema.properties)) {
      if ((value as any).type === 'object' && (value as any).properties) {
        count += this.countFields(value);
      } else if ((value as any).type === 'array' && (value as any).items?.properties) {
        count += this.countFields((value as any).items);
      } else {
        count += 1;
      }
    }
    return count;
  }

  private calculateComplexity(fieldCount: number, depth: AnalysisDepth, focusCount: number): 1 | 2 | 3 | 4 | 5 {
    let complexity = 1;
    
    if (fieldCount > 20) complexity += 1;
    if (fieldCount > 40) complexity += 1;
    if (depth === 'comprehensive') complexity += 1;
    if (focusCount > 3) complexity += 1;
    
    return Math.min(5, complexity) as 1 | 2 | 3 | 4 | 5;
  }

  private extractRequiredFields(schema: any): string[] {
    // Extract required fields from schema structure
    return ['businessInfo']; // Simplified implementation
  }

  private extractOptionalFields(schema: any): string[] {
    // Extract optional fields from schema structure
    return Object.keys(schema.properties || {});
  }

  // Additional helper methods for optimization...
  private getCompetitiveBaseSchema(businessType: BusinessType): any {
    const base = this.getBaseSchema(businessType);
    // Add competitive analysis fields
    return base;
  }

  private generateCompetitivePrompt(businessType: BusinessType, competitorUrls: string[], focusAreas: ExtractionFocus[]): string {
    return `Analyze this ${businessType} website with a competitive perspective. Compare against industry standards and identify unique positioning elements.`;
  }

  private generateIndustryPrompt(industry: string, businessType: BusinessType, depth: AnalysisDepth): string {
    return `Analyze this ${businessType} website in the ${industry} industry. Focus on industry-specific elements and best practices.`;
  }

  private analyzeFieldPerformance(results: any[]): any {
    // Analyze which fields were successfully extracted
    return {};
  }

  private removeUnderperformingFields(schema: any, analysis: any): any {
    // Remove fields that consistently fail to extract
    return schema;
  }

  private addHighValueFields(schema: any, analysis: any): any {
    // Add fields that would provide high value
    return schema;
  }

  private refinePrompt(basePrompt: string, analysis: any, metrics: any): string {
    // Refine prompt based on success patterns
    return basePrompt;
  }
}

// Export singleton instance
export const schemaGenerator = new EnhancedSchemaGenerator();