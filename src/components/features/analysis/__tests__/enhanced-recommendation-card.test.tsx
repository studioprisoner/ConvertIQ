import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EnhancedRecommendationCard from '../enhanced-recommendation-card';

describe('EnhancedRecommendationCard', () => {
  const mockRecommendation = {
    id: 'rec-1',
    title: 'Improve Product Images',
    description: 'Add high-quality product images to increase conversion',
    category: 'Visual Design',
    impact: 'high' as const,
    effort: 'medium' as const,
    estimatedImpact: 15,
    implementationSteps: [
      'Take professional product photos',
      'Optimize images for web',
      'Add image alt text',
    ],
    whyThisMatters: 'High-quality images build trust and help customers make purchase decisions',
    dataSupport: {
      confidence: 0.8,
      basedOnFields: ['product.images', 'product.gallery'],
      extractionVersion: 'v2' as const,
    },
  };

  it('renders recommendation title and description', () => {
    render(<EnhancedRecommendationCard recommendation={mockRecommendation} />);
    
    expect(screen.getByText('Improve Product Images')).toBeInTheDocument();
    expect(screen.getByText('Add high-quality product images to increase conversion')).toBeInTheDocument();
  });

  it('displays impact and effort badges correctly', () => {
    render(<EnhancedRecommendationCard recommendation={mockRecommendation} />);
    
    expect(screen.getByText('High Impact')).toBeInTheDocument();
    expect(screen.getByText('Medium Effort')).toBeInTheDocument();
  });

  it('shows estimated impact percentage', () => {
    render(<EnhancedRecommendationCard recommendation={mockRecommendation} />);
    
    expect(screen.getByText('~15%')).toBeInTheDocument();
  });

  it('displays data confidence when available', () => {
    render(<EnhancedRecommendationCard recommendation={mockRecommendation} />);
    
    expect(screen.getByText('80% confidence')).toBeInTheDocument();
    expect(screen.getByText('V2')).toBeInTheDocument();
  });

  it('expands to show implementation steps when clicked', () => {
    const onToggleExpand = vi.fn();
    render(
      <EnhancedRecommendationCard
        recommendation={mockRecommendation}
        onToggleExpand={onToggleExpand}
      />
    );
    
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);
    
    expect(onToggleExpand).toHaveBeenCalledWith('rec-1');
  });

  it('shows implementation steps when expanded', () => {
    render(
      <EnhancedRecommendationCard
        recommendation={mockRecommendation}
        expanded={true}
      />
    );
    
    expect(screen.getByText('Implementation Steps')).toBeInTheDocument();
    expect(screen.getByText('Take professional product photos')).toBeInTheDocument();
    expect(screen.getByText('Optimize images for web')).toBeInTheDocument();
    expect(screen.getByText('Add image alt text')).toBeInTheDocument();
  });

  it('shows why this matters section when expanded', () => {
    render(
      <EnhancedRecommendationCard
        recommendation={mockRecommendation}
        expanded={true}
      />
    );
    
    expect(screen.getByText('Why This Matters')).toBeInTheDocument();
    expect(screen.getByText('High-quality images build trust and help customers make purchase decisions')).toBeInTheDocument();
  });

  it('handles different impact levels with correct colors', () => {
    const impactTests = [
      { impact: 'high' as const, expectedClass: 'bg-red-100 text-red-800' },
      { impact: 'medium' as const, expectedClass: 'bg-yellow-100 text-yellow-800' },
      { impact: 'low' as const, expectedClass: 'bg-green-100 text-green-800' },
    ];

    impactTests.forEach(({ impact, expectedClass }) => {
      const { unmount } = render(
        <EnhancedRecommendationCard
          recommendation={{ ...mockRecommendation, impact }}
        />
      );
      
      const impactBadge = screen.getByText(`${impact.charAt(0).toUpperCase()}${impact.slice(1)} Impact`);
      expect(impactBadge).toHaveClass(...expectedClass.split(' '));
      unmount();
    });
  });

  it('handles different effort levels with correct colors', () => {
    const effortTests = [
      { effort: 'low' as const, expectedClass: 'bg-green-100 text-green-800' },
      { effort: 'medium' as const, expectedClass: 'bg-yellow-100 text-yellow-800' },
      { effort: 'high' as const, expectedClass: 'bg-red-100 text-red-800' },
    ];

    effortTests.forEach(({ effort, expectedClass }) => {
      const { unmount } = render(
        <EnhancedRecommendationCard
          recommendation={{ ...mockRecommendation, effort }}
        />
      );
      
      const effortBadge = screen.getByText(`${effort.charAt(0).toUpperCase()}${effort.slice(1)} Effort`);
      expect(effortBadge).toHaveClass(...expectedClass.split(' '));
      unmount();
    });
  });

  it('handles recommendation without data support', () => {
    const recommendationWithoutDataSupport = {
      ...mockRecommendation,
      dataSupport: undefined,
    };

    render(<EnhancedRecommendationCard recommendation={recommendationWithoutDataSupport} />);
    
    // Should not crash and should still render basic information
    expect(screen.getByText('Improve Product Images')).toBeInTheDocument();
    expect(screen.queryByText('confidence')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EnhancedRecommendationCard
        recommendation={mockRecommendation}
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows correct expand/collapse button text', () => {
    const { rerender } = render(
      <EnhancedRecommendationCard recommendation={mockRecommendation} expanded={false} />
    );
    
    expect(screen.getByLabelText('Expand details')).toBeInTheDocument();
    
    rerender(<EnhancedRecommendationCard recommendation={mockRecommendation} expanded={true} />);
    
    expect(screen.getByLabelText('Collapse details')).toBeInTheDocument();
  });
});