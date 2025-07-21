/**
 * Domain validation utilities for basic plan users
 */

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.toLowerCase();
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}

/**
 * Check if two domains match (including subdomains)
 */
export function domainsMatch(domain1: string, domain2: string): boolean {
  const d1 = domain1.toLowerCase();
  const d2 = domain2.toLowerCase();
  
  // Exact match
  if (d1 === d2) return true;
  
  // Check if one is a subdomain of the other
  if (d1.endsWith('.' + d2) || d2.endsWith('.' + d1)) return true;
  
  return false;
}

/**
 * Get the root domain (without subdomains)
 */
export function getRootDomain(domain: string): string {
  const parts = domain.toLowerCase().split('.');
  
  // Handle cases like:
  // - example.com -> example.com
  // - www.example.com -> example.com
  // - shop.example.com -> example.com
  // - example.co.uk -> example.co.uk (handle common TLDs)
  
  if (parts.length <= 2) {
    return domain;
  }
  
  // Common multi-part TLDs
  const multiPartTlds = ['co.uk', 'com.au', 'co.jp', 'com.br', 'co.za'];
  const lastTwoParts = parts.slice(-2).join('.');
  
  if (multiPartTlds.includes(lastTwoParts)) {
    // For multi-part TLDs, keep 3 parts: domain.co.uk
    return parts.slice(-3).join('.');
  }
  
  // For regular TLDs, keep 2 parts: domain.com
  return parts.slice(-2).join('.');
}

/**
 * Validate if a URL can be scanned based on user's plan and primary domain
 */
export function validateDomainAccess(
  url: string,
  userPrimaryDomain: string | null,
  userPlan: 'basic' | 'pro' | 'enterprise'
): { allowed: boolean; reason?: string; suggestedDomain?: string } {
  // Pro and enterprise users can scan any domain
  if (userPlan !== 'basic') {
    return { allowed: true };
  }
  
  // Extract domain from the URL
  let urlDomain: string;
  try {
    urlDomain = extractDomain(url);
  } catch (error) {
    return { 
      allowed: false, 
      reason: 'Invalid URL format' 
    };
  }
  
  // If user hasn't set a primary domain yet, suggest this domain
  if (!userPrimaryDomain) {
    const rootDomain = getRootDomain(urlDomain);
    return {
      allowed: false,
      reason: 'Please set your primary website domain first',
      suggestedDomain: rootDomain
    };
  }
  
  // Check if the URL domain matches the user's primary domain
  const userRootDomain = getRootDomain(userPrimaryDomain);
  const urlRootDomain = getRootDomain(urlDomain);
  
  if (userRootDomain === urlRootDomain || domainsMatch(urlDomain, userPrimaryDomain)) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: `Basic plan only allows scanning pages from your primary domain: ${userPrimaryDomain}`,
    suggestedDomain: userPrimaryDomain
  };
}

/**
 * Check if a primary domain is valid
 */
export function validatePrimaryDomain(domain: string): { valid: boolean; error?: string } {
  try {
    // Try to create a URL with the domain to validate format
    new URL(`https://${domain}`);
    
    // Basic domain format validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!domainRegex.test(domain)) {
      return { valid: false, error: 'Invalid domain format' };
    }
    
    // Reject localhost and local domains
    if (domain.includes('localhost') || domain.includes('127.0.0.1') || domain.includes('0.0.0.0')) {
      return { valid: false, error: 'Local domains are not allowed' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid domain format' };
  }
}