/**
 * Vercel Analytics Tracking for Phase 3 Features
 * Custom event tracking for monitoring, analytics, and admin features
 */

import { track } from '@vercel/analytics';

// Phase 3 Feature Tracking Events
export const analyticsTracking = {
  // Monitoring Dashboard Events
  trackMonitoringView: (section: string) => {
    track('monitoring_dashboard_view', {
      section,
      feature: 'real_time_monitoring',
      phase: 'phase_3'
    });
  },


  trackServiceHealthCheck: (service: string, status: string) => {
    track('service_health_check', {
      service,
      status,
      feature: 'service_monitoring',
      phase: 'phase_3'
    });
  },

  // Analytics Dashboard Events
  trackAnalyticsView: (section: string) => {
    track('analytics_dashboard_view', {
      section,
      feature: 'analytics_monitoring',
      phase: 'phase_3'
    });
  },

  trackCostMonitoringView: (timeRange: string) => {
    track('cost_monitoring_view', {
      timeRange,
      feature: 'cost_controls',
      phase: 'phase_3'
    });
  },

  trackReportGenerated: (reportType: string, format: string) => {
    track('report_generated', {
      reportType,
      format,
      feature: 'reporting',
      phase: 'phase_3'
    });
  },

  // Performance Monitoring Events
  trackPerformanceView: (metric: string) => {
    track('performance_dashboard_view', {
      metric,
      feature: 'performance_monitoring',
      phase: 'phase_3'
    });
  },

  trackLoadTestRun: (concurrentUsers: number, duration: number) => {
    track('load_test_run', {
      concurrentUsers,
      duration,
      feature: 'load_testing',
      phase: 'phase_3'
    });
  },

  trackCachePerformance: (hitRate: number, cacheType: string) => {
    track('cache_performance', {
      hitRate,
      cacheType,
      feature: 'caching_system',
      phase: 'phase_3'
    });
  },

  // Security Dashboard Events
  trackSecurityView: (section: string) => {
    track('security_dashboard_view', {
      section,
      feature: 'security_monitoring',
      phase: 'phase_3'
    });
  },

  trackVulnerabilityScan: (scanType: string, result: string) => {
    track('vulnerability_scan', {
      scanType,
      result,
      feature: 'security_testing',
      phase: 'phase_3'
    });
  },

  // Admin Management Events
  trackAdminAction: (action: string, resource: string) => {
    track('admin_action', {
      action,
      resource,
      feature: 'admin_management',
      phase: 'phase_3'
    });
  },

  trackUserManagement: (action: string, userType: string) => {
    track('user_management', {
      action,
      userType,
      feature: 'user_administration',
      phase: 'phase_3'
    });
  },

  // Chat Interface Events
  trackChatInteraction: (interactionType: string, messageLength: number) => {
    track('chat_interaction', {
      interactionType,
      messageLength,
      feature: 'ai_chat',
      phase: 'phase_3'
    });
  },

  trackDocumentUpload: (fileType: string, fileSize: number) => {
    track('document_upload', {
      fileType,
      fileSize,
      feature: 'document_processing',
      phase: 'phase_3'
    });
  },

  trackBenefitsCalculation: (calculationType: string, result: string) => {
    track('benefits_calculation', {
      calculationType,
      result,
      feature: 'benefits_calculator',
      phase: 'phase_3'
    });
  },

  // Training and Documentation Events
  trackTrainingView: (module: string, duration: number) => {
    track('training_view', {
      module,
      duration,
      feature: 'training_system',
      phase: 'phase_3'
    });
  },

  trackDocumentationView: (document: string, section: string) => {
    track('documentation_view', {
      document,
      section,
      feature: 'documentation_system',
      phase: 'phase_3'
    });
  },

  // Error and Performance Tracking
  trackError: (errorType: string, component: string, severity: string) => {
    track('error_occurred', {
      errorType,
      component,
      severity,
      feature: 'error_tracking',
      phase: 'phase_3'
    });
  },

  trackPerformanceMetric: (metric: string, value: number, threshold: number) => {
    track('performance_metric', {
      metric,
      value,
      threshold,
      feature: 'performance_tracking',
      phase: 'phase_3'
    });
  },

  // Phase 3 Demo Events
  trackPhase3Demo: (section: string, duration: number) => {
    track('phase_3_demo', {
      section,
      duration,
      feature: 'demo_presentation',
      phase: 'phase_3'
    });
  },

  trackFeatureShowcase: (feature: string, success: boolean) => {
    track('feature_showcase', {
      feature,
      success,
      phase: 'phase_3'
    });
  },

  trackAlertAcknowledged: (alertId: string, acknowledgedBy: string) => {
    track('alert_acknowledged', {
      alertId,
      acknowledgedBy,
      feature: 'monitoring',
      phase: 'phase_3'
    });
  }
};

// Export individual functions for easier importing
export const trackAlertAcknowledged = (alertId: string, acknowledgedBy: string) => {
  track('alert_acknowledged', {
    alertId,
    acknowledgedBy,
    feature: 'monitoring',
    phase: 'phase_3'
  });
};

// Helper function to track page views with context
export const trackPageView = (page: string, context?: Record<string, any>) => {
  track('page_view', {
    page,
    ...context,
    feature: 'navigation',
    phase: 'phase_3'
  });
};

// Helper function to track user actions
export const trackUserAction = (action: string, context?: Record<string, any>) => {
  track('user_action', {
    action,
    ...context,
    feature: 'user_interaction',
    phase: 'phase_3'
  });
};

// Export individual tracking functions for easy use
export const {
  trackMonitoringView,
  trackAnalyticsView,
  trackPerformanceView,
  trackSecurityView,
  trackAdminAction,
  trackChatInteraction,
  trackPhase3Demo
} = analyticsTracking;
