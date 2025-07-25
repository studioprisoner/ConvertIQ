export interface TextProcessor {
  preprocessReportText(markdown: string): string;
  chunkLongText(text: string, maxTokens: number): string[];
  combineEmbeddings(embeddings: number[][]): number[];
}

export class ReportTextProcessor implements TextProcessor {
  /**
   * Preprocess markdown text from AI reports for better embeddings
   */
  preprocessReportText(markdown: string): string {
    return markdown
      .replace(/^#+\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic  
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Split long text into chunks based on approximate token count
   * Rough estimation: 1 token ≈ 4 characters for English text
   */
  chunkLongText(text: string, maxTokens: number = 8000): string[] {
    const maxChars = maxTokens * 4; // Rough token-to-character ratio
    const chunks: string[] = [];

    if (text.length <= maxChars) {
      return [text];
    }

    // Split by sentences first to maintain semantic meaning
    const sentences = text.split(/[.!?]+\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      // If adding this sentence would exceed the limit
      if (currentChunk.length + trimmedSentence.length + 2 > maxChars) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If the sentence itself is too long, split it further
        if (trimmedSentence.length > maxChars) {
          const words = trimmedSentence.split(/\s+/);
          let wordChunk = '';
          
          for (const word of words) {
            if (wordChunk.length + word.length + 1 > maxChars) {
              if (wordChunk) {
                chunks.push(wordChunk.trim());
                wordChunk = '';
              }
            }
            wordChunk += (wordChunk ? ' ' : '') + word;
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          }
        } else {
          currentChunk = trimmedSentence;
        }
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Combine multiple embeddings into a single embedding using averaging
   * This is useful when a text has been chunked and we need a single representation
   */
  combineEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      throw new Error('Cannot combine empty embeddings array');
    }

    if (embeddings.length === 1) {
      return embeddings[0];
    }

    const dimensions = embeddings[0].length;
    const combined = new Array(dimensions).fill(0);

    // Average all embeddings
    for (const embedding of embeddings) {
      if (embedding.length !== dimensions) {
        throw new Error('All embeddings must have the same dimensions');
      }
      
      for (let i = 0; i < dimensions; i++) {
        combined[i] += embedding[i];
      }
    }

    // Normalize by dividing by count
    for (let i = 0; i < dimensions; i++) {
      combined[i] /= embeddings.length;
    }

    return combined;
  }

  /**
   * Extract the most important content from a report for embedding
   * Prioritizes summary, key findings, and recommendations
   */
  extractKeyContent(reportJson: string): string {
    try {
      const report = JSON.parse(reportJson);
      const keyContent: string[] = [];

      // Add summary if available
      if (report.summary) {
        keyContent.push(report.summary);
      }

      // Add key findings
      if (report.keyFindings && Array.isArray(report.keyFindings)) {
        keyContent.push(...report.keyFindings);
      }

      // Add high-priority recommendations
      if (report.recommendations && Array.isArray(report.recommendations)) {
        const highPriorityRecs = report.recommendations
          .filter((rec: any) => rec.priority === 'high' || rec.impact === 'high')
          .map((rec: any) => `${rec.title}: ${rec.description}`)
          .slice(0, 5); // Limit to top 5 high-priority recommendations
        
        keyContent.push(...highPriorityRecs);
      }

      // Add overall assessment
      if (report.overallAssessment) {
        keyContent.push(report.overallAssessment);
      }

      return keyContent.join(' ');
    } catch (error) {
      console.error('Failed to parse report JSON, using raw text:', error);
      return reportJson;
    }
  }
}

// Singleton instance
export const textProcessor = new ReportTextProcessor();