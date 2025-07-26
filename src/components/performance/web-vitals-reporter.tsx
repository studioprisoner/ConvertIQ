'use client';

import { useEffect } from 'react';
import { reportWebVitals, observePerformance } from '@/lib/performance/web-vitals';

export function WebVitalsReporter() {
  useEffect(() => {
    // Report web vitals
    reportWebVitals();
    
    // Set up performance observers
    observePerformance();
  }, []);

  return null; // This component doesn't render anything
}