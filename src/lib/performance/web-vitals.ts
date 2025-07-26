import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

// Core Web Vitals thresholds
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  INP: { good: 200, needsImprovement: 500 }, // INP replaces FID in web-vitals v4+
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};

type MetricName = 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';

interface WebVitalMetric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

function getMetricRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function sendToAnalytics(metric: WebVitalMetric) {
  // Send to Vercel Analytics
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', 'Core Web Vital', {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      metric_delta: metric.delta,
      metric_id: metric.id,
    });
  }

  // Send to Sentry for performance monitoring
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.addBreadcrumb({
      category: 'vitals',
      message: `${metric.name}: ${metric.value}`,
      level: metric.rating === 'poor' ? 'warning' : 'info',
      data: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      },
    });

    // Set measurement for Sentry performance monitoring
    window.Sentry.setMeasurement(metric.name, metric.value, 'millisecond');
  }

  // Console log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  }
}

export function reportWebVitals() {
  try {
    onCLS((metric) => {
      const webVitalMetric: WebVitalMetric = {
        name: 'CLS',
        value: metric.value,
        rating: getMetricRating('CLS', metric.value),
        delta: metric.delta,
        id: metric.id,
      };
      sendToAnalytics(webVitalMetric);
    });

    onINP((metric) => {
      const webVitalMetric: WebVitalMetric = {
        name: 'INP',
        value: metric.value,
        rating: getMetricRating('INP', metric.value),
        delta: metric.delta,
        id: metric.id,
      };
      sendToAnalytics(webVitalMetric);
    });

    onFCP((metric) => {
      const webVitalMetric: WebVitalMetric = {
        name: 'FCP',
        value: metric.value,
        rating: getMetricRating('FCP', metric.value),
        delta: metric.delta,
        id: metric.id,
      };
      sendToAnalytics(webVitalMetric);
    });

    onLCP((metric) => {
      const webVitalMetric: WebVitalMetric = {
        name: 'LCP',
        value: metric.value,
        rating: getMetricRating('LCP', metric.value),
        delta: metric.delta,
        id: metric.id,
      };
      sendToAnalytics(webVitalMetric);
    });

    onTTFB((metric) => {
      const webVitalMetric: WebVitalMetric = {
        name: 'TTFB',
        value: metric.value,
        rating: getMetricRating('TTFB', metric.value),
        delta: metric.delta,
        id: metric.id,
      };
      sendToAnalytics(webVitalMetric);
    });
  } catch (error) {
    console.error('Error reporting web vitals:', error);
  }
}

// Performance observer for custom metrics
export function observePerformance() {
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    try {
      // Observe Long Tasks (tasks > 50ms)
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            if (window.Sentry) {
              window.Sentry.addBreadcrumb({
                category: 'performance',
                message: `Long task detected: ${entry.duration}ms`,
                level: 'warning',
                data: {
                  duration: entry.duration,
                  startTime: entry.startTime,
                  type: 'longtask',
                },
              });
            }

            if (process.env.NODE_ENV === 'development') {
              console.warn(`[Performance] Long task detected: ${entry.duration}ms`);
            }
          }
        }
      });

      if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      }

      // Observe Navigation Timing
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const navigationEntry = entry as PerformanceNavigationTiming;
          
          const metrics = {
            dns: navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart,
            tcp: navigationEntry.connectEnd - navigationEntry.connectStart,
            tls: navigationEntry.secureConnectionStart ? navigationEntry.connectEnd - navigationEntry.secureConnectionStart : 0,
            ttfb: navigationEntry.responseStart - navigationEntry.requestStart,
            download: navigationEntry.responseEnd - navigationEntry.responseStart,
            domParse: navigationEntry.domContentLoadedEventStart - navigationEntry.responseEnd,
            domReady: navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart,
          };

          // Send detailed timing to analytics
          if (window.va) {
            Object.entries(metrics).forEach(([key, value]) => {
              window.va('track', 'Navigation Timing', {
                metric_name: key,
                metric_value: value,
              });
            });
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('[Performance] Navigation metrics:', metrics);
          }
        }
      });

      if (PerformanceObserver.supportedEntryTypes?.includes('navigation')) {
        navigationObserver.observe({ entryTypes: ['navigation'] });
      }
    } catch (error) {
      console.error('Error setting up performance observers:', error);
    }
  }
}

// Custom performance markers
export function markPerformance(name: string) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    try {
      performance.mark(name);
    } catch (error) {
      console.error('Error marking performance:', error);
    }
  }
}

export function measurePerformance(name: string, startMark: string, endMark?: string) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    try {
      const measurement = endMark 
        ? performance.measure(name, startMark, endMark)
        : performance.measure(name, startMark);
        
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name}: ${measurement.duration}ms`);
      }
      
      return measurement.duration;
    } catch (error) {
      console.error('Error measuring performance:', error);
      return 0;
    }
  }
  return 0;
}

// Declare global types for window extensions
declare global {
  interface Window {
    va?: (event: string, name: string, properties: Record<string, any>) => void;
    Sentry?: {
      addBreadcrumb: (breadcrumb: any) => void;
      setMeasurement: (name: string, value: number, unit: string) => void;
    };
  }
}