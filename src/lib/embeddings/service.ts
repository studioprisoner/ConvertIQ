export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
  getEmbeddingDimensions(): number;
  validateEmbedding(embedding: number[]): boolean;
}

export class VoyageEmbeddingService implements EmbeddingService {
  private readonly model = 'voyage-3.5';
  private readonly dimensions = 1024; // voyage-3.5 dimensions
  private readonly baseUrl = 'https://api.voyageai.com/v1';

  constructor() {
    if (!process.env.VOYAGE_API_KEY) {
      throw new Error('VOYAGE_API_KEY environment variable is required');
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return this.generateEmbeddingWithRetry(text, 3);
  }

  /**
   * Generate embedding with exponential backoff retry logic
   */
  private async generateEmbeddingWithRetry(text: string, maxRetries: number): Promise<number[]> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const preprocessedText = this.preprocessText(text);
        
        const response = await fetch(`${this.baseUrl}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
          },
          body: JSON.stringify({
            input: [preprocessedText],
            model: this.model,
            input_type: 'document',
          }),
        });

        if (!response.ok) {
          // Handle rate limiting (429) and server errors (5xx) with retry
          if (response.status === 429 || response.status >= 500) {
            const errorBody = await response.text();
            lastError = new Error(`Voyage API error: ${response.status} ${response.statusText} - ${errorBody}`);
            
            if (attempt < maxRetries) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
              console.warn(`Rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
              await this.sleep(delay);
              continue;
            }
          } else {
            // For other errors (4xx), don't retry
            const errorBody = await response.text();
            throw new Error(`Voyage API error: ${response.status} ${response.statusText} - ${errorBody}`);
          }
        } else {
          const data = await response.json();
          
          if (!data.data?.[0]?.embedding) {
            throw new Error('No embedding returned from Voyage AI');
          }

          return data.data[0].embedding;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // If it's a network error, retry
        if (attempt < maxRetries && (
          lastError.message.includes('fetch') || 
          lastError.message.includes('network') ||
          lastError.message.includes('timeout')
        )) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.warn(`Network error (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }
        
        // For other errors, don't retry
        break;
      }
    }

    console.error('Failed to generate embedding after retries:', lastError);
    throw new Error(
      `Embedding generation failed: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    // For rate limiting safety, reduce batch size and add delays between batches
    const maxBatchSize = 32; // Reduced from 128
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += maxBatchSize) {
      const batch = texts.slice(i, i + maxBatchSize);
      
      try {
        const batchResults = await this.generateBatchWithRetry(batch, 3);
        results.push(...batchResults);
        
        // Add delay between batches to avoid rate limiting
        if (i + maxBatchSize < texts.length) {
          await this.sleep(500); // 500ms delay between batches
        }
      } catch (error) {
        console.error(`Failed to process batch ${i / maxBatchSize + 1}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Generate batch embeddings with retry logic
   */
  private async generateBatchWithRetry(texts: string[], maxRetries: number): Promise<number[][]> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const preprocessedBatch = texts.map(text => this.preprocessText(text));

        const response = await fetch(`${this.baseUrl}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
          },
          body: JSON.stringify({
            input: preprocessedBatch,
            model: this.model,
            input_type: 'document',
          }),
        });

        if (!response.ok) {
          // Handle rate limiting (429) and server errors (5xx) with retry
          if (response.status === 429 || response.status >= 500) {
            const errorBody = await response.text();
            lastError = new Error(`Voyage API error: ${response.status} ${response.statusText} - ${errorBody}`);
            
            if (attempt < maxRetries) {
              const delay = Math.min(2000 * Math.pow(2, attempt), 20000); // Longer delays for batch
              console.warn(`Batch rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
              await this.sleep(delay);
              continue;
            }
          } else {
            const errorBody = await response.text();
            throw new Error(`Voyage API error: ${response.status} ${response.statusText} - ${errorBody}`);
          }
        } else {
          const data = await response.json();
          const batchEmbeddings = data.data.map((item: any) => item.embedding);
          return batchEmbeddings;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // If it's a network error, retry
        if (attempt < maxRetries && (
          lastError.message.includes('fetch') || 
          lastError.message.includes('network') ||
          lastError.message.includes('timeout')
        )) {
          const delay = Math.min(2000 * Math.pow(2, attempt), 20000);
          console.warn(`Batch network error (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }
        
        break;
      }
    }

    console.error('Failed to generate batch embeddings after retries:', lastError);
    throw new Error(
      `Batch embedding generation failed: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Get the dimension size of embeddings
   */
  getEmbeddingDimensions(): number {
    return this.dimensions;
  }

  /**
   * Validate that an embedding has the correct format and dimensions
   */
  validateEmbedding(embedding: number[]): boolean {
    if (!Array.isArray(embedding)) {
      return false;
    }

    if (embedding.length !== this.dimensions) {
      return false;
    }

    return embedding.every(value => typeof value === 'number' && !isNaN(value));
  }

  /**
   * Preprocess text for better embeddings
   * Removes markdown formatting and normalizes whitespace
   */
  private preprocessText(text: string): string {
    return text
      .replace(/^#+\s+/gm, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
      .replace(/`(.*?)`/g, '$1') // Remove code markdown
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/\n+/g, ' ') // Replace multiple newlines with single space
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}

// Singleton instance
export const embeddingService = new VoyageEmbeddingService();