/**
 * Performance Monitoring & Metrics
 * Tracks page load speed, LCP, FID, CLS for production readiness
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint (ms)
  fid: number; // First Input Delay (ms)
  cls: number; // Cumulative Layout Shift (score)
  
  // Additional Metrics
  ttfb: number; // Time to First Byte (ms)
  fcp: number; // First Contentful Paint (ms)
  tti: number; // Time to Interactive (ms)
  tbt: number; // Total Blocking Time (ms)
  
  // Page-specific
  pageLoad: number; // Total page load time (ms)
  domContentLoaded: number; // DOMContentLoaded (ms)
  
  // Metadata
  url: string;
  timestamp: number;
  userAgent: string;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private readonly STORAGE_KEY = 'performance_metrics';
  private readonly MAX_SAMPLES = 100;

  /**
   * Collect Web Vitals and page performance metrics
   */
  collectMetrics(): PerformanceMetrics | null {
    if (typeof window === 'undefined' || !window.performance) {
      return null;
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
    
    const metrics: PerformanceMetrics = {
      // Core Web Vitals (will be updated by observers)
      lcp: 0,
      fid: 0,
      cls: 0,
      
      // Navigation Timing
      ttfb: navigation?.responseStart - navigation?.requestStart || 0,
      fcp,
      tti: 0,
      tbt: 0,
      
      pageLoad: navigation?.loadEventEnd - navigation?.fetchStart || 0,
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.fetchStart || 0,
      
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    };

    this.observeWebVitals(metrics);
    return metrics;
  }

  /**
   * Observe Core Web Vitals using Performance Observer API
   */
  private observeWebVitals(metrics: PerformanceMetrics): void {
    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('LCP observation not supported');
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstInput = entries[0] as any;
        metrics.fid = firstInput.processingStart - firstInput.startTime;
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.warn('FID observation not supported');
    }

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            metrics.cls = clsValue;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('CLS observation not supported');
    }
  }

  /**
   * Store metrics for analytics
   */
  storeMetrics(metrics: PerformanceMetrics): void {
    const url = metrics.url;
    const existing = this.metrics.get(url) || [];
    existing.push(metrics);
    
    // Keep only recent samples
    if (existing.length > this.MAX_SAMPLES) {
      existing.shift();
    }
    
    this.metrics.set(url, existing);
    
    // Persist to localStorage
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(this.metrics.entries())));
    } catch (e) {
      console.warn('Failed to store performance metrics');
    }
  }

  /**
   * Send metrics to analytics endpoint
   */
  async sendToAnalytics(metrics: PerformanceMetrics): Promise<void> {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
      });
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  }

  /**
   * Get performance summary for current page
   */
  getSummary(url?: string): {
    avg: Partial<PerformanceMetrics>;
    p50: Partial<PerformanceMetrics>;
    p95: Partial<PerformanceMetrics>;
    p99: Partial<PerformanceMetrics>;
    count: number;
  } | null {
    const targetUrl = url || window.location.href;
    const samples = this.metrics.get(targetUrl);
    
    if (!samples || samples.length === 0) {
      return null;
    }

    const calculatePercentile = (arr: number[], percentile: number): number => {
      const sorted = arr.slice().sort((a, b) => a - b);
      const index = Math.ceil((percentile / 100) * sorted.length) - 1;
      return sorted[index];
    };

    const keys: Array<keyof PerformanceMetrics> = ['lcp', 'fid', 'cls', 'ttfb', 'fcp', 'pageLoad'];
    const summary: any = {
      avg: {},
      p50: {},
      p95: {},
      p99: {},
      count: samples.length,
    };

    for (const key of keys) {
      const values = samples.map(s => s[key] as number).filter(v => v > 0);
      if (values.length > 0) {
        summary.avg[key] = values.reduce((a, b) => a + b, 0) / values.length;
        summary.p50[key] = calculatePercentile(values, 50);
        summary.p95[key] = calculatePercentile(values, 95);
        summary.p99[key] = calculatePercentile(values, 99);
      }
    }

    return summary;
  }

  /**
   * Check if performance meets production targets
   */
  meetsProductionTargets(metrics: PerformanceMetrics): {
    pass: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Target: Page load < 2000ms
    if (metrics.pageLoad > 2000) {
      issues.push(`Page load time (${metrics.pageLoad.toFixed(0)}ms) exceeds 2000ms target`);
    }
    
    // Core Web Vitals targets (Google recommendations)
    if (metrics.lcp > 2500) {
      issues.push(`LCP (${metrics.lcp.toFixed(0)}ms) exceeds 2500ms (Good: <2500ms)`);
    }
    
    if (metrics.fid > 100) {
      issues.push(`FID (${metrics.fid.toFixed(0)}ms) exceeds 100ms (Good: <100ms)`);
    }
    
    if (metrics.cls > 0.1) {
      issues.push(`CLS (${metrics.cls.toFixed(3)}) exceeds 0.1 (Good: <0.1)`);
    }
    
    if (metrics.ttfb > 600) {
      issues.push(`TTFB (${metrics.ttfb.toFixed(0)}ms) exceeds 600ms (Good: <600ms)`);
    }

    return {
      pass: issues.length === 0,
      issues,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const allMetrics: PerformanceMetrics[] = [];
    this.metrics.forEach(samples => allMetrics.push(...samples));

    if (allMetrics.length === 0) {
      return 'No performance data collected yet.';
    }

    const passCount = allMetrics.filter(m => this.meetsProductionTargets(m).pass).length;
    const passRateNum = (passCount / allMetrics.length * 100);
    const passRate = passRateNum.toFixed(1);

    const avgMetrics = {
      pageLoad: allMetrics.reduce((sum, m) => sum + m.pageLoad, 0) / allMetrics.length,
      lcp: allMetrics.reduce((sum, m) => sum + m.lcp, 0) / allMetrics.length,
      fid: allMetrics.reduce((sum, m) => sum + m.fid, 0) / allMetrics.length,
      cls: allMetrics.reduce((sum, m) => sum + m.cls, 0) / allMetrics.length,
    };

    return `
Performance Report
==================
Total Samples: ${allMetrics.length}
Pass Rate: ${passRate}% (${passCount}/${allMetrics.length})

Average Metrics:
- Page Load: ${avgMetrics.pageLoad.toFixed(0)}ms (Target: <2000ms)
- LCP: ${avgMetrics.lcp.toFixed(0)}ms (Target: <2500ms)
- FID: ${avgMetrics.fid.toFixed(0)}ms (Target: <100ms)
- CLS: ${avgMetrics.cls.toFixed(3)} (Target: <0.1)

Status: ${passRateNum >= 90 ? '✅ EXCELLENT' : passRateNum >= 75 ? '⚠️ GOOD' : '❌ NEEDS IMPROVEMENT'}
    `.trim();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-collect metrics on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const metrics = performanceMonitor.collectMetrics();
      if (metrics) {
        performanceMonitor.storeMetrics(metrics);
        performanceMonitor.sendToAnalytics(metrics);
        
        const check = performanceMonitor.meetsProductionTargets(metrics);
        if (!check.pass) {
          console.warn('Performance issues detected:', check.issues);
        }
      }
    }, 1000); // Wait 1s after load to capture all vitals
  });
}
