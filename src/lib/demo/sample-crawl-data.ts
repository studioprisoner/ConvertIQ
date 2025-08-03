import type { CrawlResult } from '../crawler/types';

/**
 * Generate comprehensive sample crawl data for demo purposes
 * This matches the expected structure from the AI prompts
 */
export function generateSampleCrawlData(url: string = 'https://example.com'): CrawlResult {
  return {
    url,
    statusCode: 200,
    timestamp: new Date().toISOString(),
    
    htmlAnalysis: {
      title: 'Demo Website - Convert More Customers',
      description: 'A sample website for demonstrating streaming AI analysis capabilities',
      content: 'Welcome to our demo website. We help businesses convert more customers through better design and psychology. Our services include conversion optimization, UX analysis, and technical SEO improvements. We offer professional consulting services to help small businesses improve their conversion rates. Our team has over 10 years of experience helping companies increase their online sales.',
      // Structured headings as expected by schema
      headings: [
        { level: 1, text: 'Welcome to Demo Site', id: 'hero-heading' },
        { level: 2, text: 'Our Services', id: 'services-heading' },
        { level: 2, text: 'How We Help', id: 'benefits-heading' },
        { level: 3, text: 'Conversion Optimization', class: 'service-item' },
        { level: 3, text: 'UX Analysis', class: 'service-item' },
        { level: 3, text: 'Technical SEO', class: 'service-item' },
        { level: 2, text: 'Client Testimonials', id: 'testimonials-heading' },
        { level: 2, text: 'Get Started Today', id: 'cta-heading' },
      ],
      
      // Structured images as expected by schema
      images: [
        { src: 'hero-image.jpg', alt: 'Conversion optimization services', width: 1200, height: 600, isHero: true },
        { src: 'service-1.png', alt: 'UX analysis dashboard', width: 400, height: 300 },
        { src: 'testimonial-photo.jpg', alt: 'Happy client testimonial', width: 100, height: 100 },
        { src: 'team-photo.jpg', alt: 'Our expert team', width: 800, height: 400 },
        { src: 'logo.png', alt: 'Demo Company Logo', width: 200, height: 60, isLogo: true },
      ],
      
      // Structured links as expected by schema
      links: [
        { href: '/', text: 'Home', isInternal: true, isNavigation: true },
        { href: '/services', text: 'Our Services', isInternal: true, isNavigation: true },
        { href: '/about', text: 'About Us', isInternal: true, isNavigation: true },
        { href: '/contact', text: 'Contact', isInternal: true, isNavigation: true },
        { href: '/blog', text: 'Blog', isInternal: true, isNavigation: true },
        { href: '/pricing', text: 'Pricing', isInternal: true, isNavigation: true },
        { href: '/case-studies', text: 'Case Studies', isInternal: true, isNavigation: true },
        { href: '/signup', text: 'Get Started Today', isInternal: true, isCTA: true },
        { href: 'https://facebook.com/example', text: 'Facebook', isInternal: false, target: '_blank' },
        { href: 'https://twitter.com/example', text: 'Twitter', isInternal: false, target: '_blank' },
      ],
      
      // Meta data structure expected by prompts
      meta: {
        title: 'Demo Website - Convert More Customers',
        description: 'A sample website for demonstrating streaming AI analysis capabilities',
        ogImage: 'https://example.com/og-image.jpg',
        keywords: 'conversion optimization, UX analysis, SEO, web design, digital marketing',
        viewport: 'width=device-width, initial-scale=1',
        charset: 'UTF-8',
      },
      
      // Structure data expected by conversion analysis
      structure: {
        wordCount: 450,
        hasHeroSection: true,
        sectionsCount: 6,
        hasTestimonials: true,
        hasContactForm: true,
        hasPricing: true,
      },
      
      // CTAs expected by conversion analysis
      ctas: [
        {
          text: 'Get Started Today',
          href: '/signup',
          type: 'button',
          position: 'hero',
          prominence: 'primary',
        },
        {
          text: 'Learn More About Our Services',
          href: '/services',
          type: 'link',
          position: 'services',
          prominence: 'secondary',
        },
        {
          text: 'Schedule Free Consultation',
          href: '/contact',
          type: 'button',
          position: 'footer',
          prominence: 'primary',
        }
      ],
      
      // Schema markup data
      schema: {
        hasStructuredData: true,
        types: ['Organization', 'WebSite', 'Service'],
        organization: {
          name: 'Demo Conversion Company',
          url: 'https://example.com',
          logo: 'https://example.com/logo.png',
        },
      },
      
      // Forms data
      forms: [
        {
          action: '/contact',
          method: 'POST',
          id: 'contact-form',
          class: 'contact-form',
          fields: [
            { type: 'text', name: 'name', placeholder: 'Your Name', required: true, label: 'Name' },
            { type: 'email', name: 'email', placeholder: 'Your Email', required: true, label: 'Email' },
            { type: 'tel', name: 'phone', placeholder: 'Phone Number', required: false, label: 'Phone' },
            { type: 'textarea', name: 'message', placeholder: 'Your Message', required: true, label: 'Message' }
          ],
          submitButton: {
            text: 'Send Message',
            type: 'submit',
          },
        },
        {
          action: '/newsletter',
          method: 'POST',
          id: 'newsletter-form',
          class: 'newsletter-signup',
          fields: [
            { type: 'email', name: 'email', placeholder: 'Enter your email', required: true, label: 'Email Address' }
          ],
          submitButton: {
            text: 'Subscribe',
            type: 'submit',
          },
        }
      ],
      
      // Trust signals
      trustSignals: {
        testimonials: [
          {
            text: 'This company helped us increase our conversion rate by 45% in just 3 months!',
            author: 'Sarah Johnson',
            company: 'Tech Startup Inc.',
            rating: 5,
          },
          {
            text: 'Professional service and excellent results. Highly recommend!',
            author: 'Mike Chen',
            company: 'E-commerce Store',
            rating: 5,
          }
        ],
        certifications: ['Google Partner', 'HubSpot Certified'],
        socialProof: {
          clientCount: '500+',
          yearsExperience: '10+',
          projectsCompleted: '1000+',
        },
      },
    },
    
    // CSS analysis data
    cssAnalysis: {
      externalStylesheets: [
        'https://example.com/css/main.css',
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
      ],
      hasInlineStyles: true,
      frameworks: ['tailwindcss', 'custom'],
      cssSize: 156000, // bytes
      responsive: {
        hasViewportMeta: true,
        hasMediaQueries: true,
        hasMobileFirst: true,
      },
    },

    // Performance data expected by UX prompts
    performance: {
      loadTime: 1250, // milliseconds
      htmlSize: 45600, // bytes
      totalResourcesCount: 12,
      imagesWithoutAlt: 0,
      imagesWithoutSize: 1,
      externalResourcesCount: 4,
    },
    
    // Mobile data expected by UX prompts
    mobile: {
      isResponsive: true,
      viewportConfigured: true,
      touchTargetsAppropriate: true,
      textReadable: true,
      mobileScore: 85,
      issues: [],
    },
    
    // SEO data expected by SEO prompts
    seo: {
      hasRobotsTxt: true,
      hasSitemap: true,
      canonicalUrl: 'https://example.com',
      hreflangTags: [],
      openGraphTags: {
        title: 'Demo Website - Convert More Customers',
        description: 'A sample website for demonstrating streaming AI analysis capabilities',
        image: 'https://example.com/og-image.jpg',
        url: 'https://example.com',
        type: 'website',
      },
      twitterCard: {
        card: 'summary_large_image',
        title: 'Demo Website - Convert More Customers',
        description: 'A sample website for demonstrating streaming AI analysis capabilities',
        image: 'https://example.com/og-image.jpg',
      },
      headings: {
        h1: ['Welcome to Demo Site'],
        h2: ['Our Services', 'How We Help', 'Client Testimonials'],
        h3: ['Conversion Optimization', 'UX Analysis', 'Technical SEO'],
      },
      imageOptimization: {
        totalImages: 4,
        imagesWithAlt: 4,
        imagesOptimized: 3,
        issues: ['hero-image.jpg could be optimized further'],
      },
    },
    
    // Accessibility data
    accessibility: {
      score: 88,
      issues: [
        'Some buttons could have better color contrast',
        'Consider adding skip navigation links',
      ],
      hasAltTexts: true,
      hasSemanticHtml: true,
      colorContrastPassed: true,
    },
    
    // Error information (empty for successful crawl)
    errors: [],
    
    // Additional metadata
    metadata: {
      crawledAt: new Date().toISOString(),
      userAgent: 'ConvertIQ-Bot/1.0',
      processingTime: 2500,
      version: '1.0.0',
    },
  };
}