import type { Report, ReportRecommendation } from './types';

export class PDFExportService {
  // jsPDF (~127KB) and html2canvas (~50KB, browser-only) are loaded lazily so
  // they are never parsed at module load — this file is reached by server-side
  // routers via the reports barrel, where neither library is needed unless a
  // PDF is actually generated.
  private async loadJsPDF() {
    const { default: jsPDF } = await import('jspdf');
    return jsPDF;
  }

  private async loadHtml2Canvas() {
    const { default: html2canvas } = await import('html2canvas');
    return html2canvas;
  }

  /**
   * Generate PDF from HTML report content
   */
  async generatePDFFromHTML(htmlElement: HTMLElement, filename: string): Promise<Blob> {
    try {
      const html2canvas = await this.loadHtml2Canvas();
      const jsPDF = await this.loadJsPDF();

      // Create canvas from HTML element
      const canvas = await html2canvas(htmlElement, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      return pdf.output('blob');
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate PDF from HTML');
    }
  }

  /**
   * Generate PDF directly from report data
   */
  async generatePDFFromData(report: Report): Promise<Blob> {
    try {
      const jsPDF = await this.loadJsPDF();
      const pdf = new jsPDF('p', 'mm', 'a4');
      let yPosition = 20;
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Helper function to add new page if needed
      const checkPageBreak = (additionalHeight: number) => {
        if (yPosition + additionalHeight > 280) { // Leave margin at bottom
          pdf.addPage();
          yPosition = 20;
        }
      };

      // Helper function to wrap text
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return lines.length * (fontSize * 0.35); // Approximate line height
      };

      // Title Page
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(report.title, margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date(report.createdAt).toLocaleDateString()}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Website: ${report.metadata.websiteUrl}`, margin, yPosition);
      yPosition += 20;

      // Executive Summary
      checkPageBreak(40);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 10;

      const summaryHeight = addWrappedText(report.summary, margin, yPosition, contentWidth, 12);
      yPosition += summaryHeight + 15;

      // Key Insights
      if (report.content.type === 'marketing' || report.content.type === 'conversion') {
        checkPageBreak(30);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key Findings', margin, yPosition);
        yPosition += 10;

        const keyFindings = report.content.executiveSummary.keyFindings;
        keyFindings.forEach((finding, index) => {
          checkPageBreak(8);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          const findingText = `${index + 1}. ${finding}`;
          const findingHeight = addWrappedText(findingText, margin, yPosition, contentWidth, 12);
          yPosition += findingHeight + 5;
        });
        yPosition += 10;
      }

      // Recommendations Section
      checkPageBreak(30);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Priority Recommendations', margin, yPosition);
      yPosition += 15;

      // Top 5 recommendations
      const topRecommendations = report.recommendations.slice(0, 5);
      topRecommendations.forEach((rec, index) => {
        checkPageBreak(50);
        
        // Recommendation title
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        const titleHeight = addWrappedText(`${index + 1}. ${rec.title}`, margin, yPosition, contentWidth, 14);
        yPosition += titleHeight + 5;

        // Priority and scores
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Priority: ${rec.priority.toUpperCase()} | Impact: ${rec.impact.score}/10 | Effort: ${rec.effort.score}/10`, margin, yPosition);
        yPosition += 8;

        // Description
        pdf.setFontSize(11);
        const descHeight = addWrappedText(rec.description, margin, yPosition, contentWidth, 11);
        yPosition += descHeight + 5;

        // Why it matters
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        const whyHeight = addWrappedText(`Why it matters: ${rec.whyItMatters}`, margin, yPosition, contentWidth, 10);
        yPosition += whyHeight + 10;
      });

      // Implementation Timeline
      if (report.content.type === 'marketing' || report.content.type === 'conversion') {
        checkPageBreak(50);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Quick Wins (Immediate Actions)', margin, yPosition);
        yPosition += 10;

        const quickWins = report.content.quickWins;
        quickWins.forEach((win, index) => {
          checkPageBreak(20);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          const winHeight = addWrappedText(`${index + 1}. ${win.title}`, margin, yPosition, contentWidth, 12);
          yPosition += winHeight + 3;

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          const descHeight = addWrappedText(win.description, margin + 5, yPosition, contentWidth - 5, 10);
          yPosition += descHeight + 2;

          pdf.setFontSize(9);
          pdf.text(`Time: ${win.timeToComplete} | Expected Impact: ${win.expectedImpact}`, margin + 5, yPosition);
          yPosition += 8;
        });
      }

      // Footer on each page
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`ConvertIQ Report - Page ${i} of ${pageCount}`, margin, 290);
        pdf.text('Generated by ConvertIQ AI Analysis Engine', pageWidth - margin - 60, 290);
      }

      return pdf.output('blob');
    } catch (error) {
      console.error('PDF generation from data failed:', error);
      throw new Error('Failed to generate PDF from report data');
    }
  }

  /**
   * Generate implementation guide PDF
   */
  async generateImplementationGuidePDF(
    recommendations: ReportRecommendation[],
    websiteUrl: string
  ): Promise<Blob> {
    try {
      const jsPDF = await this.loadJsPDF();
      const pdf = new jsPDF('p', 'mm', 'a4');
      let yPosition = 20;
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Helper functions (same as above)
      const checkPageBreak = (additionalHeight: number) => {
        if (yPosition + additionalHeight > 280) {
          pdf.addPage();
          yPosition = 20;
        }
      };

      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return lines.length * (fontSize * 0.35);
      };

      // Title Page
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Implementation Guide', margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Website: ${websiteUrl}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
      yPosition += 20;

      // Process each recommendation
      recommendations.forEach((rec, index) => {
        checkPageBreak(60);
        
        // Recommendation header
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        const titleHeight = addWrappedText(`${index + 1}. ${rec.title}`, margin, yPosition, contentWidth, 18);
        yPosition += titleHeight + 10;

        // Implementation guide
        const guide = rec.implementationGuide;
        
        // Overview
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Overview', margin, yPosition);
        yPosition += 8;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const overviewHeight = addWrappedText(guide.overview, margin, yPosition, contentWidth, 11);
        yPosition += overviewHeight + 10;

        // Prerequisites
        if (guide.prerequisites && guide.prerequisites.length > 0) {
          checkPageBreak(30);
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Prerequisites', margin, yPosition);
          yPosition += 8;

          guide.prerequisites.forEach(prereq => {
            checkPageBreak(8);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            const prereqHeight = addWrappedText(`• ${prereq}`, margin, yPosition, contentWidth, 11);
            yPosition += prereqHeight + 3;
          });
          yPosition += 5;
        }

        // Implementation steps
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Implementation Steps', margin, yPosition);
        yPosition += 10;

        guide.steps.forEach(step => {
          checkPageBreak(40);
          
          // Step title
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          const stepTitleHeight = addWrappedText(`Step ${step.step}: ${step.title}`, margin, yPosition, contentWidth, 12);
          yPosition += stepTitleHeight + 5;

          // Step description
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          const stepDescHeight = addWrappedText(step.description, margin, yPosition, contentWidth, 11);
          yPosition += stepDescHeight + 5;

          // Step details
          step.details.forEach(detail => {
            checkPageBreak(8);
            pdf.setFontSize(10);
            const detailHeight = addWrappedText(`• ${detail}`, margin + 5, yPosition, contentWidth - 5, 10);
            yPosition += detailHeight + 2;
          });

          // Tips if available
          if (step.tips && step.tips.length > 0) {
            yPosition += 3;
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Tips:', margin + 5, yPosition);
            yPosition += 5;
            
            step.tips.forEach(tip => {
              checkPageBreak(6);
              const tipHeight = addWrappedText(`→ ${tip}`, margin + 10, yPosition, contentWidth - 10, 9);
              yPosition += tipHeight + 2;
            });
          }

          yPosition += 8;
        });

        // Success metrics
        checkPageBreak(25);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Success Metrics', margin, yPosition);
        yPosition += 8;

        guide.successMetrics.forEach(metric => {
          checkPageBreak(6);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          const metricHeight = addWrappedText(`• ${metric}`, margin, yPosition, contentWidth, 11);
          yPosition += metricHeight + 3;
        });

        // Timeline and difficulty
        yPosition += 5;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Timeline: ${guide.timeline}`, margin, yPosition);
        yPosition += 6;
        pdf.text(`Difficulty: ${guide.difficulty.charAt(0).toUpperCase() + guide.difficulty.slice(1)}`, margin, yPosition);
        yPosition += 20;

        // Add separator line
        if (index < recommendations.length - 1) {
          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 15;
        }
      });

      // Add footer to all pages
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Implementation Guide - Page ${i} of ${pageCount}`, margin, 290);
        pdf.text('ConvertIQ', pageWidth - margin - 20, 290);
      }

      return pdf.output('blob');
    } catch (error) {
      console.error('Implementation guide PDF generation failed:', error);
      throw new Error('Failed to generate implementation guide PDF');
    }
  }

  /**
   * Download PDF blob as file
   */
  downloadPDF(pdfBlob: Blob, filename: string): void {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate filename for report PDF
   */
  generateFilename(report: Report): string {
    const date = new Date(report.createdAt).toISOString().split('T')[0];
    const domain = new URL(report.metadata.websiteUrl).hostname.replace('www.', '');
    const reportType = report.type.charAt(0).toUpperCase() + report.type.slice(1);
    
    return `ConvertIQ_${reportType}_Report_${domain}_${date}.pdf`;
  }

  /**
   * Generate complete report package with multiple PDFs
   */
  async generateReportPackage(report: Report): Promise<{
    mainReport: Blob;
    implementationGuide: Blob;
    filenames: {
      mainReport: string;
      implementationGuide: string;
    };
  }> {
    try {
      const [mainReport, implementationGuide] = await Promise.all([
        this.generatePDFFromData(report),
        this.generateImplementationGuidePDF(report.recommendations, report.metadata.websiteUrl)
      ]);

      const baseFilename = this.generateFilename(report);
      const implementationFilename = baseFilename.replace('.pdf', '_Implementation_Guide.pdf');

      return {
        mainReport,
        implementationGuide,
        filenames: {
          mainReport: baseFilename,
          implementationGuide: implementationFilename
        }
      };
    } catch (error) {
      console.error('Report package generation failed:', error);
      throw new Error('Failed to generate complete report package');
    }
  }
}

// Export singleton instance
export const pdfExportService = new PDFExportService();