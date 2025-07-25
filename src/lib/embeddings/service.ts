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
        throw new Error(`Voyage API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.data?.[0]?.embedding) {
        throw new Error('No embedding returned from Voyage AI');
      }

      return data.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error(
        `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // Voyage AI supports batch processing, but let's use smaller batches for reliability
      const maxBatchSize = 128;
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += maxBatchSize) {
        const batch = texts.slice(i, i + maxBatchSize);
        const preprocessedBatch = batch.map(text => this.preprocessText(text));

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
          throw new Error(`Voyage API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const batchEmbeddings = data.data.map((item: any) => item.embedding);
        results.push(...batchEmbeddings);
      }

      return results;
    } catch (error) {
      console.error('Failed to generate batch embeddings:', error);
      throw new Error(
        `Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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