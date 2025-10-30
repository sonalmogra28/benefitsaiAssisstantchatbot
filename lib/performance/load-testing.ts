/**
 * Load Testing and Performance Optimization
 * Phase 3: Production Readiness - 500 Concurrent Users
 */

import { logger } from '@/lib/logger';

export interface LoadTestConfig {
  concurrentUsers: number;
  duration: number; // in minutes
  rampUpTime: number; // in minutes
  targetRPS: number; // requests per second
  endpoints: LoadTestEndpoint[];
}

export interface LoadTestEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  weight: number; // percentage of total requests
  payload?: any;
  headers?: Record<string, string>;
}

export interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  throughput: number;
  concurrentUsers: number;
  duration: number;
  timestamp: string;
}

export class LoadTester {
  private config: LoadTestConfig;
  private results: LoadTestResult[] = [];
  private isRunning = false;

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  /**
   * Run comprehensive load test for 500 concurrent users
   */
  async runLoadTest(): Promise<LoadTestResult> {
    this.isRunning = true;
    const startTime = Date.now();
    
    logger.info('Starting load test', {
      concurrentUsers: this.config.concurrentUsers,
      duration: this.config.duration,
      targetRPS: this.config.targetRPS
    });

    try {
      // Add timeout protection for the entire load test
      const testTimeout = setTimeout(() => {
        this.isRunning = false;
        throw new Error('Load test timeout exceeded');
      }, (this.config.duration + 5) * 60 * 1000); // 5 minutes buffer

      // Simulate users with proper ramp-up time
      const userPromises = this.createUserPromises();

      const userResults = await Promise.allSettled(userPromises);
      
      clearTimeout(testTimeout);
      
      const endTime = Date.now();
      const totalDuration = (endTime - startTime) / 1000;

      // Calculate aggregated results
      const result = this.calculateResults(userResults, totalDuration);
      
      this.results.push(result);
      
      logger.info('Load test completed', result);
      
      return result;
    } catch (error) {
      logger.error('Load test failed', { error });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Create user promises with proper ramp-up time
   */
  private createUserPromises(): Promise<any>[] {
    const userPromises: Promise<any>[] = [];
    const rampUpInterval = (this.config.rampUpTime * 60 * 1000) / this.config.concurrentUsers;
    
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      const userStartDelay = i * rampUpInterval;
      const userPromise = this.simulateUserWithDelay(i, userStartDelay);
      userPromises.push(userPromise);
    }
    
    return userPromises;
  }

  /**
   * Simulate user with delay for proper ramp-up
   */
  private async simulateUserWithDelay(userId: number, startDelay: number): Promise<any> {
    await this.sleep(startDelay);
    return this.simulateUser(userId, this.config.duration * 60 * 1000);
  }

  /**
   * Simulate a single user's behavior
   */
  private async simulateUser(userId: number, duration: number): Promise<{
    requests: number;
    successful: number;
    failed: number;
    responseTimes: number[];
  }> {
    const startTime = Date.now();
    const responseTimes: number[] = [];
    let requests = 0;
    let successful = 0;
    let failed = 0;

    while (Date.now() - startTime < duration) {
      try {
        const endpoint = this.selectRandomEndpoint();
        const requestStart = Date.now();
        
        // Add timeout protection for individual requests (30 seconds)
        const requestTimeout = new Promise<Response>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 30000);
        });
        
        // Simulate API call with timeout
        const response = await Promise.race([
          this.makeRequest(endpoint),
          requestTimeout
        ]);
        
        const responseTime = Date.now() - requestStart;
        responseTimes.push(responseTime);
        
        requests++;
        if (response.ok) {
          successful++;
        } else {
          failed++;
        }

        // Random delay between requests (1-5 seconds)
        const delay = Math.random() * 4000 + 1000;
        await this.sleep(delay);
      } catch (error) {
        requests++;
        failed++;
        logger.warn('User request failed', { userId, error });
      }
    }

    return { requests, successful, failed, responseTimes };
  }

  /**
   * Select random endpoint based on weights
   */
  private selectRandomEndpoint(): LoadTestEndpoint {
    const totalWeight = this.config.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of this.config.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return this.config.endpoints[0];
  }

  /**
   * Make actual HTTP request
   */
  private async makeRequest(endpoint: LoadTestEndpoint): Promise<Response> {
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${endpoint.path}`;
    
    const options: RequestInit = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        ...endpoint.headers
      }
    };

    if (endpoint.payload && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
      options.body = JSON.stringify(endpoint.payload);
    }

    return fetch(url, options);
  }

  /**
   * Calculate aggregated test results
   */
  private calculateResults(userResults: PromiseSettledResult<any>[], duration: number): LoadTestResult {
    const allResponseTimes: number[] = [];
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    userResults.forEach(result => {
      if (result.status === 'fulfilled') {
        const userData = result.value;
        totalRequests += userData.requests;
        successfulRequests += userData.successful;
        failedRequests += userData.failed;
        
        // Prevent unbounded growth by limiting response times array
        if (allResponseTimes.length < 10000) { // Limit to 10k entries
          allResponseTimes.push(...userData.responseTimes);
        }
      }
    });

    // Handle division by zero cases
    const safeDuration = Math.max(duration, 1); // Prevent division by zero
    const safeTotalRequests = Math.max(totalRequests, 1); // Prevent division by zero

    // Sort response times for percentile calculations
    allResponseTimes.sort((a, b) => a - b);

    const averageResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length 
      : 0;
    
    const p95Index = Math.floor(allResponseTimes.length * 0.95);
    const p99Index = Math.floor(allResponseTimes.length * 0.99);
    
    const p95ResponseTime = allResponseTimes[p95Index] || 0;
    const p99ResponseTime = allResponseTimes[p99Index] || 0;
    
    const requestsPerSecond = totalRequests / safeDuration;
    const errorRate = failedRequests / safeTotalRequests;
    const throughput = successfulRequests / safeDuration;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      requestsPerSecond,
      errorRate,
      throughput,
      concurrentUsers: this.config.concurrentUsers,
      duration: safeDuration,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get performance recommendations based on test results
   */
  getPerformanceRecommendations(result: LoadTestResult): string[] {
    const recommendations: string[] = [];

    if (result.averageResponseTime > 2000) {
      recommendations.push('Consider implementing response caching to reduce average response time');
    }

    if (result.p95ResponseTime > 5000) {
      recommendations.push('Optimize database queries and implement connection pooling');
    }

    if (result.errorRate > 0.01) {
      recommendations.push('Investigate and fix error sources to reduce error rate');
    }

    if (result.requestsPerSecond < this.config.targetRPS * 0.8) {
      recommendations.push('Scale up infrastructure or implement horizontal scaling');
    }

    if (result.throughput < this.config.targetRPS * 0.7) {
      recommendations.push('Consider implementing CDN and edge caching');
    }

    return recommendations;
  }

  /**
   * Generate load test report
   */
  generateReport(result: LoadTestResult): string {
    const recommendations = this.getPerformanceRecommendations(result);
    
    return `
# Load Test Report - Phase 3 Production Readiness

## Test Configuration
- Concurrent Users: ${result.concurrentUsers}
- Duration: ${result.duration.toFixed(2)} seconds
- Target RPS: ${this.config.targetRPS}

## Results Summary
- Total Requests: ${result.totalRequests.toLocaleString()}
- Successful Requests: ${result.successfulRequests.toLocaleString()}
- Failed Requests: ${result.failedRequests.toLocaleString()}
- Success Rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%

## Performance Metrics
- Average Response Time: ${result.averageResponseTime.toFixed(2)}ms
- 95th Percentile: ${result.p95ResponseTime.toFixed(2)}ms
- 99th Percentile: ${result.p99ResponseTime.toFixed(2)}ms
- Requests Per Second: ${result.requestsPerSecond.toFixed(2)}
- Throughput: ${result.throughput.toFixed(2)} req/s
- Error Rate: ${(result.errorRate * 100).toFixed(2)}%

## Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}

## Status
${this.isProductionReady(result) ? '✅ PRODUCTION READY' : '❌ NEEDS OPTIMIZATION'}

Generated: ${result.timestamp}
    `.trim();
  }

  /**
   * Check if system is ready for production
   */
  private isProductionReady(result: LoadTestResult): boolean {
    return (
      result.averageResponseTime < 2000 &&
      result.p95ResponseTime < 5000 &&
      result.errorRate < 0.01 &&
      result.requestsPerSecond >= this.config.targetRPS * 0.8
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default load test configuration for 500 concurrent users
export const defaultLoadTestConfig: LoadTestConfig = {
  concurrentUsers: 500,
  duration: 10, // 10 minutes
  rampUpTime: 2, // 2 minutes ramp up
  targetRPS: 100, // 100 requests per second
  endpoints: [
    {
      path: '/api/chat',
      method: 'POST',
      weight: 40,
      payload: { message: 'What are my health benefits?' }
    },
    {
      path: '/api/health',
      method: 'GET',
      weight: 20
    },
    {
      path: '/api/analytics/dashboard',
      method: 'GET',
      weight: 15
    },
    {
      path: '/api/documents',
      method: 'GET',
      weight: 15
    },
    {
      path: '/api/benefits/compare',
      method: 'POST',
      weight: 10,
      payload: { plans: ['plan1', 'plan2'] }
    }
  ]
};

// Export singleton instance
export const loadTester = new LoadTester(defaultLoadTestConfig);
