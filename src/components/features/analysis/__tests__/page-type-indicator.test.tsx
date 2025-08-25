import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageTypeIndicator from '../page-type-indicator';
import type { PageType } from '../page-type-indicator';

describe('PageTypeIndicator', () => {
  const mockProps = {
    pageType: 'ecommerce-product' as PageType,
    confidence: 0.85,
  };

  it('renders page type and confidence correctly', () => {
    render(<PageTypeIndicator {...mockProps} />);
    
    expect(screen.getByText('E-commerce Product')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('displays correct icon for page type', () => {
    render(<PageTypeIndicator {...mockProps} />);
    
    const icon = screen.getByLabelText('E-commerce Product icon');
    expect(icon).toBeInTheDocument();
  });

  it('shows high confidence with green color', () => {
    render(<PageTypeIndicator {...mockProps} confidence={0.9} />);
    
    const badge = screen.getByText('90%');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('shows medium confidence with yellow color', () => {
    render(<PageTypeIndicator {...mockProps} confidence={0.6} />);
    
    const badge = screen.getByText('60%');
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('shows low confidence with red color', () => {
    render(<PageTypeIndicator {...mockProps} confidence={0.3} />);
    
    const badge = screen.getByText('30%');
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('displays details when showDetails is true', () => {
    const detailedProps = {
      ...mockProps,
      showDetails: true,
      reasoning: 'AI detected product page indicators',
      keyIndicators: ['product images', 'price display', 'add to cart button'],
    };

    render(<PageTypeIndicator {...detailedProps} />);
    
    expect(screen.getByText('AI detected product page indicators')).toBeInTheDocument();
    expect(screen.getByText('product images')).toBeInTheDocument();
    expect(screen.getByText('price display')).toBeInTheDocument();
    expect(screen.getByText('add to cart button')).toBeInTheDocument();
  });

  it('handles all page types correctly', () => {
    const pageTypes: PageType[] = [
      'ecommerce-product',
      'ecommerce-category',
      'service-landing',
      'business-homepage',
      'blog-post',
      'lead-generation',
      'portfolio',
      'about',
      'contact',
      'pricing',
      'unknown'
    ];

    pageTypes.forEach(pageType => {
      const { unmount } = render(<PageTypeIndicator pageType={pageType} confidence={0.8} />);
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
      unmount();
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <PageTypeIndicator {...mockProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});