import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StructuredDataPreview from '../structured-data-preview';

describe('StructuredDataPreview', () => {
  const mockEcommerceData = {
    product: {
      name: 'Test Product',
      price: { current: '$99.99', currency: 'USD' },
      description: 'A great test product',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
    },
    callsToAction: [
      { text: 'Buy Now', type: 'buy', prominence: 'primary' },
      { text: 'Add to Cart', type: 'cart', prominence: 'secondary' },
    ],
    socialProof: {
      reviews: [
        { rating: 5, text: 'Great product!', author: 'John Doe' },
        { rating: 4, text: 'Good value', author: 'Jane Smith' },
      ],
    },
    conversionElements: {
      scarcityIndicators: ['Only 5 left!', 'Limited time offer'],
      urgencyMessages: ['Sale ends today!'],
    },
  };

  const mockServiceData = {
    service: {
      name: 'Web Design Service',
      tagline: 'Professional web design',
      valueProposition: 'We create amazing websites',
    },
    businessInfo: {
      name: 'Design Agency',
      location: 'New York, NY',
    },
    contactInfo: {
      phone: '555-0123',
      email: 'info@agency.com',
    },
  };

  it('renders ecommerce product data correctly', () => {
    render(
      <StructuredDataPreview
        structuredData={mockEcommerceData}
        pageType="ecommerce-product"
      />
    );
    
    expect(screen.getByText('Product Information')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
    expect(screen.getByText('Calls to Action')).toBeInTheDocument();
    expect(screen.getByText('Buy Now')).toBeInTheDocument();
  });

  it('renders service landing data correctly', () => {
    render(
      <StructuredDataPreview
        structuredData={mockServiceData}
        pageType="service-landing"
      />
    );
    
    expect(screen.getByText('Service Information')).toBeInTheDocument();
    expect(screen.getByText('Web Design Service')).toBeInTheDocument();
    expect(screen.getByText('Business Information')).toBeInTheDocument();
    expect(screen.getByText('Design Agency')).toBeInTheDocument();
  });

  it('limits preview items based on maxPreviewItems prop', () => {
    render(
      <StructuredDataPreview
        structuredData={mockEcommerceData}
        pageType="ecommerce-product"
        maxPreviewItems={2}
      />
    );
    
    // Should show first 2 features plus "and X more" indicator
    expect(screen.getByText('Feature 1')).toBeInTheDocument();
    expect(screen.getByText('Feature 2')).toBeInTheDocument();
    expect(screen.getByText('and 1 more')).toBeInTheDocument();
  });

  it('toggles raw JSON view', () => {
    render(
      <StructuredDataPreview
        structuredData={mockEcommerceData}
        pageType="ecommerce-product"
      />
    );
    
    const jsonToggle = screen.getByText('Show Raw JSON');
    fireEvent.click(jsonToggle);
    
    expect(screen.getByText('Hide JSON')).toBeInTheDocument();
    expect(screen.getByText('"name": "Test Product"')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(
      <StructuredDataPreview
        structuredData={{}}
        pageType="ecommerce-product"
      />
    );
    
    expect(screen.getByText('No structured data available')).toBeInTheDocument();
  });

  it('handles unknown page type', () => {
    render(
      <StructuredDataPreview
        structuredData={mockEcommerceData}
        pageType="unknown"
      />
    );
    
    expect(screen.getByText('Raw Data')).toBeInTheDocument();
  });

  it('formats arrays correctly in preview', () => {
    render(
      <StructuredDataPreview
        structuredData={mockEcommerceData}
        pageType="ecommerce-product"
      />
    );
    
    // Features should be displayed as comma-separated list
    expect(screen.getByText('Feature 1, Feature 2, Feature 3')).toBeInTheDocument();
  });

  it('handles nested objects in data', () => {
    render(
      <StructuredDataPreview
        structuredData={mockEcommerceData}
        pageType="ecommerce-product"
      />
    );
    
    // Should handle price object nested structure
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StructuredDataPreview
        structuredData={mockEcommerceData}
        pageType="ecommerce-product"
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles very long arrays with truncation', () => {
    const dataWithLongArray = {
      features: Array.from({ length: 10 }, (_, i) => `Feature ${i + 1}`),
    };

    render(
      <StructuredDataPreview
        structuredData={dataWithLongArray}
        pageType="ecommerce-product"
        maxPreviewItems={3}
      />
    );
    
    expect(screen.getByText('Feature 1, Feature 2, Feature 3')).toBeInTheDocument();
    expect(screen.getByText('and 7 more')).toBeInTheDocument();
  });
});