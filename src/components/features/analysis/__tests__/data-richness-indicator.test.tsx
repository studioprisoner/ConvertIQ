import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataRichnessIndicator from '../data-richness-indicator';

describe('DataRichnessIndicator', () => {
  const mockProps = {
    dataRichness: 75,
    totalFields: 20,
    extractedFields: 15,
  };

  it('renders data richness percentage correctly', () => {
    render(<DataRichnessIndicator {...mockProps} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Data Richness')).toBeInTheDocument();
  });

  it('displays progress bar with correct width', () => {
    render(<DataRichnessIndicator {...mockProps} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle('width: 75%');
  });

  it('shows extraction version v1 by default', () => {
    render(<DataRichnessIndicator {...mockProps} />);
    
    expect(screen.getByText('V1')).toBeInTheDocument();
  });

  it('shows extraction version v2 when specified', () => {
    render(<DataRichnessIndicator {...mockProps} extractionVersion="v2" />);
    
    expect(screen.getByText('V2')).toBeInTheDocument();
  });

  it('displays field details when showDetails is true', () => {
    render(<DataRichnessIndicator {...mockProps} showDetails={true} />);
    
    expect(screen.getByText('15 of 20 fields extracted')).toBeInTheDocument();
  });

  it('shows excellent quality for high richness (90%+)', () => {
    render(<DataRichnessIndicator {...mockProps} dataRichness={95} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-green-500');
  });

  it('shows good quality for medium-high richness (70-89%)', () => {
    render(<DataRichnessIndicator {...mockProps} dataRichness={80} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-blue-500');
  });

  it('shows fair quality for medium richness (50-69%)', () => {
    render(<DataRichnessIndicator {...mockProps} dataRichness={60} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-yellow-500');
  });

  it('shows poor quality for low richness (<50%)', () => {
    render(<DataRichnessIndicator {...mockProps} dataRichness={30} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-red-500');
  });

  it('handles zero richness gracefully', () => {
    render(<DataRichnessIndicator dataRichness={0} totalFields={10} extractedFields={0} />);
    
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveStyle('width: 0%');
  });

  it('handles 100% richness correctly', () => {
    render(<DataRichnessIndicator dataRichness={100} totalFields={10} extractedFields={10} />);
    
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveStyle('width: 100%');
  });

  it('applies custom className', () => {
    const { container } = render(
      <DataRichnessIndicator {...mockProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays quality label correctly', () => {
    const qualityTests = [
      { richness: 95, expectedLabel: 'Excellent' },
      { richness: 80, expectedLabel: 'Good' },
      { richness: 60, expectedLabel: 'Fair' },
      { richness: 30, expectedLabel: 'Poor' },
    ];

    qualityTests.forEach(({ richness, expectedLabel }) => {
      const { unmount } = render(
        <DataRichnessIndicator {...mockProps} dataRichness={richness} showDetails={true} />
      );
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      unmount();
    });
  });
});