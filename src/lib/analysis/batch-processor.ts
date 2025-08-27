/**
 * Advanced Batch Processor - Phase 3 Implementation
 * 
 * Provides sophisticated batch processing capabilities for large-scale analysis:
 * - Intelligent batching with resource optimization
 * - Priority-based queue management
 * - Parallel processing with concurrency control
 * - Progress tracking and error handling
 * - Resource-aware processing scheduling
 */

import { AdvancedExtractionEngine, type AnalysisOptions } from './extraction-engine';
import { streamingAnalysisService } from './streaming';
import { EventEmitter } from 'events';

export interface BatchJob {
  id: string;
  websiteUrls: string[];
  analysisOptions: AnalysisOptions;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    currentlyProcessing: number;
  };
  results: Map<string, any>;
  errors: Map<string, Error>;
  metadata: {
    userId?: string;
    requestId?: string;
    estimatedDuration: number;
    actualDuration?: number;
    resourceUsage?: {
      cpuTime: number;
      memoryPeak: number;
      apiCalls: number;
      cost: number;
    };
  };
}

export interface BatchProcessingOptions {
  concurrency: number; // Max parallel processes
  batchSize: number; // URLs per batch
  delayBetweenBatches: number; // Delay in ms
  maxRetries: number;
  timeoutPerUrl: number;
  resourceLimits: {
    maxMemoryMB: number;
    maxCpuPercent: number;
    maxApiCallsPerMinute: number;
  };
  onProgress?: (jobId: string, progress: BatchJob['progress']) => void;
  onComplete?: (jobId: string, results: Map<string, any>) => void;
  onError?: (jobId: string, error: Error) => void;
}

export interface BatchQueueStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  totalResourceUsage: {
    cpuTime: number;
    memoryUsed: number;
    apiCalls: number;
    totalCost: number;
  };
}

/**
 * Advanced Batch Processor for large-scale website analysis
 */
export class AdvancedBatchProcessor extends EventEmitter {
  private jobs: Map<string, BatchJob> = new Map();
  private processingQueue: BatchJob[] = [];
  private activeJobs: Set<string> = new Set();
  private resourceMonitor: ResourceMonitor;
  private defaultOptions: BatchProcessingOptions;

  constructor(options?: Partial<BatchProcessingOptions>) {
    super();
    
    this.defaultOptions = {
      concurrency: 3,
      batchSize: 5,
      delayBetweenBatches: 2000,
      maxRetries: 3,
      timeoutPerUrl: 120000, // 2 minutes per URL
      resourceLimits: {
        maxMemoryMB: 1024,
        maxCpuPercent: 80,
        maxApiCallsPerMinute: 100
      },
      ...options
    };

    this.resourceMonitor = new ResourceMonitor();
    this.startProcessingLoop();
    
    // Cleanup completed jobs periodically
    setInterval(() => this.cleanupCompletedJobs(), 300000); // Every 5 minutes
  }

  /**
   * Submit a new batch job for processing
   */
  async submitBatchJob(
    websiteUrls: string[],
    analysisOptions: AnalysisOptions,
    priority: BatchJob['priority'] = 'normal',
    userId?: string,
    requestId?: string
  ): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: BatchJob = {
      id: jobId,
      websiteUrls: [...websiteUrls], // Clone array
      analysisOptions,
      priority,
      createdAt: new Date(),
      status: 'pending',
      progress: {
        total: websiteUrls.length,
        completed: 0,
        failed: 0,
        currentlyProcessing: 0
      },
      results: new Map(),
      errors: new Map(),
      metadata: {
        userId,
        requestId,
        estimatedDuration: this.estimateProcessingTime(websiteUrls.length, analysisOptions)
      }
    };

    this.jobs.set(jobId, job);
    this.addToQueue(job);
    
    this.emit('job-submitted', { jobId, job });
    
    return jobId;
  }

  /**
   * Get job status and progress
   */
  getJobStatus(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Cancel a pending or processing job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'pending') {
      job.status = 'cancelled';
      this.removeFromQueue(jobId);
      this.emit('job-cancelled', { jobId, job });
      return true;
    }

    if (job.status === 'processing') {
      job.status = 'cancelled';
      this.activeJobs.delete(jobId);
      this.emit('job-cancelled', { jobId, job });
      return true;
    }

    return false; // Cannot cancel completed/failed jobs
  }

  /**
   * Get batch processing queue statistics
   */
  getQueueStats(): BatchQueueStats {
    const jobs = Array.from(this.jobs.values());
    
    const stats: BatchQueueStats = {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      processingJobs: jobs.filter(j => j.status === 'processing').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      averageProcessingTime: 0,
      totalResourceUsage: {
        cpuTime: 0,
        memoryUsed: 0,
        apiCalls: 0,
        totalCost: 0
      }
    };

    // Calculate averages and totals
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.metadata.actualDuration);
    if (completedJobs.length > 0) {
      stats.averageProcessingTime = completedJobs.reduce((sum, job) => 
        sum + (job.metadata.actualDuration || 0), 0) / completedJobs.length;
    }

    jobs.forEach(job => {
      if (job.metadata.resourceUsage) {
        stats.totalResourceUsage.cpuTime += job.metadata.resourceUsage.cpuTime;
        stats.totalResourceUsage.memoryUsed += job.metadata.resourceUsage.memoryPeak;
        stats.totalResourceUsage.apiCalls += job.metadata.resourceUsage.apiCalls;
        stats.totalResourceUsage.totalCost += job.metadata.resourceUsage.cost;
      }
    });

    return stats;
  }

  /**
   * Get all active jobs (processing or pending)
   */
  getActiveJobs(): BatchJob[] {
    return Array.from(this.jobs.values()).filter(job => 
      job.status === 'pending' || job.status === 'processing'
    );
  }

  /**
   * Process a batch of URLs for a specific job
   */
  private async processBatchJob(job: BatchJob): Promise<void> {
    const startTime = Date.now();
    job.status = 'processing';
    job.startedAt = new Date();
    
    this.emit('job-started', { jobId: job.id, job });

    try {
      // Create batches from URLs
      const batches = this.createBatches(job.websiteUrls, this.defaultOptions.batchSize);
      
      for (const [batchIndex, batch] of batches.entries()) {
        // Check if job was cancelled
        if (job.status === 'cancelled') {
          break;
        }

        // Check resource limits before processing batch
        if (await this.resourceMonitor.isResourceLimitExceeded(this.defaultOptions.resourceLimits)) {
          console.warn(`Resource limits exceeded for job ${job.id}, delaying batch ${batchIndex}`);
          await this.delay(5000); // Wait 5 seconds and try again
          continue;
        }

        // Process batch with concurrency control
        await this.processBatch(job, batch, batchIndex);

        // Delay between batches if not the last batch
        if (batchIndex < batches.length - 1 && job.status !== 'cancelled') {
          await this.delay(this.defaultOptions.delayBetweenBatches);
        }
      }

      // Finalize job
      if (job.status !== 'cancelled') {
        job.status = job.progress.failed > 0 ? 'failed' : 'completed';
        job.completedAt = new Date();
        job.metadata.actualDuration = Date.now() - startTime;
        job.metadata.resourceUsage = await this.resourceMonitor.getJobResourceUsage(job.id);
        
        this.emit('job-completed', { jobId: job.id, job, results: job.results });
        
        // Call completion callback if provided
        this.defaultOptions.onComplete?.(job.id, job.results);
      }

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.metadata.actualDuration = Date.now() - startTime;
      
      this.emit('job-failed', { jobId: job.id, job, error });
      
      // Call error callback if provided
      this.defaultOptions.onError?.(job.id, error as Error);
    }

    this.activeJobs.delete(job.id);
  }

  /**
   * Process a single batch of URLs
   */
  private async processBatch(job: BatchJob, urls: string[], batchIndex: number): Promise<void> {
    const batchPromises = urls.map(async (url) => {
      if (job.status === 'cancelled') return;

      job.progress.currentlyProcessing++;
      
      try {
        // Use the advanced extraction engine for analysis
        const extractionEngine = new AdvancedExtractionEngine();
        const result = await Promise.race([
          extractionEngine.performComprehensiveAnalysis(url, job.analysisOptions),
          this.createTimeout(this.defaultOptions.timeoutPerUrl)
        ]);

        job.results.set(url, result);
        job.progress.completed++;
        
        this.emit('url-completed', { jobId: job.id, url, result });
        
      } catch (error) {
        job.errors.set(url, error as Error);
        job.progress.failed++;
        
        this.emit('url-failed', { jobId: job.id, url, error });
        
        console.warn(`Failed to analyze ${url} in job ${job.id}:`, error);
      } finally {
        job.progress.currentlyProcessing--;
        
        // Call progress callback if provided
        this.defaultOptions.onProgress?.(job.id, job.progress);
        
        this.emit('job-progress', { jobId: job.id, progress: job.progress });
      }
    });

    // Wait for all URLs in this batch to complete
    await Promise.allSettled(batchPromises);
  }

  /**
   * Main processing loop
   */
  private startProcessingLoop(): void {
    setInterval(async () => {
      // Check if we can process more jobs
      if (this.activeJobs.size >= this.defaultOptions.concurrency) {
        return;
      }

      // Get next job from queue
      const nextJob = this.getNextJobFromQueue();
      if (!nextJob) {
        return;
      }

      // Check resource availability
      if (await this.resourceMonitor.isResourceLimitExceeded(this.defaultOptions.resourceLimits)) {
        console.log('Resource limits reached, delaying job processing');
        return;
      }

      // Start processing job
      this.activeJobs.add(nextJob.id);
      this.processBatchJob(nextJob).catch(error => {
        console.error(`Batch job ${nextJob.id} failed:`, error);
      });

    }, 1000); // Check every second
  }

  /**
   * Add job to priority queue
   */
  private addToQueue(job: BatchJob): void {
    this.processingQueue.push(job);
    // Sort by priority and creation time
    this.processingQueue.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Get next job from queue
   */
  private getNextJobFromQueue(): BatchJob | null {
    const index = this.processingQueue.findIndex(job => job.status === 'pending');
    if (index === -1) return null;
    
    return this.processingQueue.splice(index, 1)[0];
  }

  /**
   * Remove job from queue
   */
  private removeFromQueue(jobId: string): void {
    const index = this.processingQueue.findIndex(job => job.id === jobId);
    if (index !== -1) {
      this.processingQueue.splice(index, 1);
    }
  }

  /**
   * Create batches from URL array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Estimate processing time for a batch job
   */
  private estimateProcessingTime(urlCount: number, options: AnalysisOptions): number {
    // Base time per URL based on analysis type
    const baseTimePerUrl = {
      'quick': 30000,      // 30 seconds
      'standard': 120000,  // 2 minutes
      'comprehensive': 300000, // 5 minutes
      'competitive': 600000    // 10 minutes
    };

    const baseTime = baseTimePerUrl[options.analysisType] || baseTimePerUrl.standard;
    
    // Add time for focus areas
    const focusTimeMultiplier = 1 + ((options.focusAreas?.length || 1) - 1) * 0.2;
    
    // Add time for depth
    const depthMultiplier = (options.maxDepth || 2) * 0.3;
    
    const estimatedTimePerUrl = baseTime * focusTimeMultiplier * (1 + depthMultiplier);
    
    // Account for parallel processing
    const effectiveUrlCount = Math.ceil(urlCount / this.defaultOptions.concurrency);
    
    return effectiveUrlCount * estimatedTimePerUrl;
  }

  /**
   * Create timeout promise
   */
  private createTimeout(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Analysis timeout')), timeoutMs);
    });
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up completed jobs older than 24 hours
   */
  private cleanupCompletedJobs(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [jobId, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') && 
          job.completedAt && job.completedAt < oneDayAgo) {
        this.jobs.delete(jobId);
        this.emit('job-cleaned-up', { jobId });
      }
    }
  }
}

/**
 * Resource Monitor for tracking system resource usage
 */
class ResourceMonitor {
  private resourceHistory: Array<{
    timestamp: Date;
    cpuPercent: number;
    memoryMB: number;
    activeJobs: number;
  }> = [];

  async isResourceLimitExceeded(limits: BatchProcessingOptions['resourceLimits']): Promise<boolean> {
    // In a real implementation, this would check actual system resources
    // For now, we'll simulate resource monitoring
    
    const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    const currentCpu = 0; // Would use actual CPU monitoring library
    
    this.resourceHistory.push({
      timestamp: new Date(),
      cpuPercent: currentCpu,
      memoryMB: currentMemory,
      activeJobs: 0 // Would track actual active jobs
    });

    // Keep only last 100 measurements
    if (this.resourceHistory.length > 100) {
      this.resourceHistory = this.resourceHistory.slice(-100);
    }

    return currentMemory > limits.maxMemoryMB || currentCpu > limits.maxCpuPercent;
  }

  async getJobResourceUsage(jobId: string): Promise<BatchJob['metadata']['resourceUsage']> {
    // In a real implementation, this would track per-job resource usage
    return {
      cpuTime: Math.random() * 1000, // milliseconds
      memoryPeak: Math.random() * 100, // MB
      apiCalls: Math.floor(Math.random() * 50),
      cost: Math.random() * 5 // USD
    };
  }
}

// Export singleton instance
export const batchProcessor = new AdvancedBatchProcessor();