import { aiAnalysisDb } from '@/lib/ai/database';

export interface EmbeddingJob {
  analysisId: string;
  priority: 'normal' | 'high';
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Simple embedding queue processor for background embedding generation
 * In production, this could be replaced with Redis Queue or similar
 */
export class EmbeddingQueue {
  private queue: EmbeddingJob[] = [];
  private processing = false;
  private readonly maxRetries = 3;
  private readonly processingDelay = 1000; // 1 second between jobs

  /**
   * Add embedding job to queue
   */
  async add(job: Omit<EmbeddingJob, 'retryCount'>): Promise<void> {
    const queueJob: EmbeddingJob = {
      ...job,
      retryCount: 0,
      maxRetries: job.maxRetries || this.maxRetries,
    };

    // Insert based on priority
    if (job.priority === 'high') {
      this.queue.unshift(queueJob);
    } else {
      this.queue.push(queueJob);
    }

    console.log(`🔮 Added embedding job to queue: ${job.analysisId} (${job.priority} priority)`);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process jobs in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    console.log('🔮 Starting embedding queue processing');

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      try {
        console.log(`🔮 Processing embedding job: ${job.analysisId} (attempt ${(job.retryCount || 0) + 1})`);
        
        // Generate embedding for the analysis
        await aiAnalysisDb.generateEmbeddingForAnalysis(job.analysisId);
        
        console.log(`🔮 Embedding job completed: ${job.analysisId}`);
      } catch (error) {
        console.error(`🔮 Embedding job failed: ${job.analysisId}`, error);
        
        // Retry logic
        const retryCount = (job.retryCount || 0) + 1;
        const maxRetries = job.maxRetries || this.maxRetries;
        
        if (retryCount < maxRetries) {
          const retryJob: EmbeddingJob = {
            ...job,
            retryCount,
          };
          
          // Add back to queue with exponential backoff
          setTimeout(() => {
            this.queue.push(retryJob);
            console.log(`🔮 Retrying embedding job: ${job.analysisId} (attempt ${retryCount + 1}/${maxRetries})`);
          }, Math.pow(2, retryCount) * 1000); // 2s, 4s, 8s delays
        } else {
          console.error(`🔮 Embedding job failed permanently: ${job.analysisId} after ${maxRetries} attempts`);
        }
      }

      // Small delay between jobs to avoid overwhelming the API
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.processingDelay));
      }
    }

    this.processing = false;
    console.log('🔮 Embedding queue processing completed');
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queueLength: number;
    processing: boolean;
    highPriorityJobs: number;
    normalPriorityJobs: number;
  } {
    const highPriorityJobs = this.queue.filter(job => job.priority === 'high').length;
    const normalPriorityJobs = this.queue.filter(job => job.priority === 'normal').length;

    return {
      queueLength: this.queue.length,
      processing: this.processing,
      highPriorityJobs,
      normalPriorityJobs,
    };
  }

  /**
   * Clear all jobs from queue
   */
  clear(): void {
    this.queue = [];
    console.log('🔮 Embedding queue cleared');
  }

  /**
   * Process backfill of existing analyses without embeddings
   */
  async backfillEmbeddings(): Promise<void> {
    try {
      console.log('🔮 Starting embedding backfill process');
      
      const analysesWithoutEmbeddings = await aiAnalysisDb.getAnalysesWithoutEmbeddings();
      
      console.log(`🔮 Found ${analysesWithoutEmbeddings.length} analyses without embeddings`);
      
      // Add all to queue with normal priority
      for (const analysis of analysesWithoutEmbeddings) {
        await this.add({
          analysisId: analysis.id,
          priority: 'normal',
        });
      }
      
      console.log('🔮 Embedding backfill queued');
    } catch (error) {
      console.error('🔮 Embedding backfill failed:', error);
      throw error;
    }
  }
}

// Singleton instance
export const embeddingQueue = new EmbeddingQueue();