import { recommendationTracker } from './recommendation-tracker';
import { databaseTrackingService } from './database-tracking';
import { progressDashboardService } from './progress-dashboard';

/**
 * Test script for the recommendation tracking system
 */
export async function testRecommendationTracking() {
  console.log('🧪 Testing Recommendation Tracking System...\n');

  try {
    // Test 1: Initialize tracking for a mock recommendation
    console.log('📝 Test 1: Starting recommendation tracking');
    const mockRecommendationId = 'test-rec-123';
    
    const progress = await recommendationTracker.startTracking(mockRecommendationId);
    console.log('✅ Started tracking recommendation:', progress.id);
    console.log('   Status:', progress.status);
    console.log('   Milestones:', progress.milestones.length);
    console.log('   Measurements:', progress.measurements.length);
    console.log('');

    // Test 2: Update progress with notes and milestone completion
    console.log('📝 Test 2: Updating recommendation progress');
    const updatedProgress = await recommendationTracker.updateProgress({
      recommendationId: mockRecommendationId,
      notes: 'Started researching best practices for implementation',
      actualEffort: 2,
      milestoneCompletions: [progress.milestones[0]?.id].filter(Boolean)
    });
    console.log('✅ Updated progress with notes and milestone completion');
    console.log('   Progress notes:', updatedProgress.progressNotes.length);
    console.log('   Completed milestones:', updatedProgress.milestones.filter(m => m.isCompleted).length);
    console.log('   Actual effort:', updatedProgress.actualEffort, 'hours');
    console.log('');

    // Test 3: Add a measurement
    console.log('📝 Test 3: Adding measurements');
    const progressWithMeasurement = await recommendationTracker.updateProgress({
      recommendationId: mockRecommendationId,
      measurements: [
        {
          metric: 'Page Load Speed',
          value: 3.2,
          notes: 'Baseline measurement before optimization'
        }
      ]
    });
    console.log('✅ Added measurement');
    console.log('   Total measurements:', progressWithMeasurement.measurements.length);
    console.log('');

    // Test 4: Add a blocker
    console.log('📝 Test 4: Adding a blocker');
    const progressWithBlocker = await recommendationTracker.updateProgress({
      recommendationId: mockRecommendationId,
      blockers: [
        {
          title: 'Missing access to codebase',
          description: 'Need developer credentials to implement changes',
          severity: 'high'
        }
      ]
    });
    console.log('✅ Added blocker');
    console.log('   Total blockers:', progressWithBlocker.blockers.length);
    console.log('   Blocker severity:', progressWithBlocker.blockers[0]?.severity);
    console.log('');

    // Test 5: Resolve the blocker
    console.log('📝 Test 5: Resolving blocker');
    await recommendationTracker.resolveBlocker(
      mockRecommendationId,
      progressWithBlocker.blockers[0]?.id || 'blocker_1',
      'Developer provided access credentials'
    );
    const finalProgress = await recommendationTracker.getProgress(mockRecommendationId);
    console.log('✅ Resolved blocker');
    console.log('   Resolved blockers:', finalProgress?.blockers.filter(b => b.isResolved).length);
    console.log('');

    // Test 6: Complete the recommendation
    console.log('📝 Test 6: Completing recommendation');
    const completedProgress = await recommendationTracker.updateProgress({
      recommendationId: mockRecommendationId,
      status: 'completed',
      notes: 'Successfully implemented all changes and tested',
      measurements: [
        {
          metric: 'Page Load Speed',
          value: 1.8,
          notes: 'Final measurement after optimization - 44% improvement!'
        }
      ]
    });
    console.log('✅ Completed recommendation');
    console.log('   Final status:', completedProgress.status);
    console.log('   Completion date:', completedProgress.completedAt?.toISOString());
    console.log('   Final measurements:', completedProgress.measurements.length);
    console.log('');

    // Test 7: Get progress summary
    console.log('📝 Test 7: Getting progress summary');
    const mockUserId = 'test-user-123';
    const summary = await progressDashboardService.getDashboardData(mockUserId);
    console.log('✅ Retrieved dashboard data');
    console.log('   Total recommendations:', summary.overview.totalRecommendations);
    console.log('   Completion rate:', summary.overview.completionRate + '%');
    console.log('   Category performance entries:', summary.categoryPerformance.length);
    console.log('');

    console.log('🎉 All tests completed successfully!\n');

    return {
      success: true,
      finalProgress: completedProgress,
      dashboardSummary: summary
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Performance test
export async function testTrackingPerformance() {
  console.log('⚡ Testing Performance...\n');

  const startTime = Date.now();
  
  // Test multiple concurrent operations
  const promises = Array.from({ length: 10 }, async (_, i) => {
    const recId = `perf-test-${i}`;
    
    // Start tracking
    const progress = await recommendationTracker.startTracking(recId);
    
    // Add some updates
    await recommendationTracker.updateProgress({
      recommendationId: recId,
      notes: `Performance test update ${i}`,
      actualEffort: Math.random() * 5
    });
    
    return progress;
  });

  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  console.log('✅ Performance test completed');
  console.log('   Operations:', results.length);
  console.log('   Total time:', endTime - startTime, 'ms');
  console.log('   Average time per operation:', Math.round((endTime - startTime) / results.length), 'ms');
  console.log('');

  return {
    operationCount: results.length,
    totalTime: endTime - startTime,
    averageTime: Math.round((endTime - startTime) / results.length)
  };
}

// Demo data generation
export async function generateDemoTrackingData() {
  console.log('🎭 Generating demo tracking data...\n');

  const demoRecommendations = [
    {
      id: 'demo-seo-1',
      title: 'Optimize Page Titles for SEO',
      category: 'seo'
    },
    {
      id: 'demo-ux-1',
      title: 'Improve Mobile Navigation',
      category: 'ux'
    },
    {
      id: 'demo-conversion-1',
      title: 'Add Trust Badges to Checkout',
      category: 'conversion'
    },
    {
      id: 'demo-performance-1',
      title: 'Optimize Image Loading',
      category: 'performance'
    }
  ];

  for (const rec of demoRecommendations) {
    console.log(`📝 Creating demo tracking for: ${rec.title}`);
    
    const progress = await recommendationTracker.startTracking(rec.id);
    
    // Simulate some progress
    await recommendationTracker.updateProgress({
      recommendationId: rec.id,
      notes: 'Started implementation phase',
      actualEffort: Math.random() * 4 + 1,
      milestoneCompletions: [progress.milestones[0]?.id].filter(Boolean)
    });
    
    // Random chance to complete
    if (Math.random() > 0.5) {
      await recommendationTracker.updateProgress({
        recommendationId: rec.id,
        status: 'completed',
        notes: 'Successfully completed implementation'
      });
      console.log('   ✅ Completed');
    } else {
      console.log('   🔄 In progress');
    }
  }

  console.log('🎉 Demo data generation completed!\n');
  
  return demoRecommendations;
}