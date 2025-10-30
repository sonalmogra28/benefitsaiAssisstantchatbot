/**
 * Production Monitoring System
 * Comprehensive monitoring and alerting for Phase 1
 */

import { logger } from '@/lib/logger';
import { productionConfig } from '@/lib/config/production-ready';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceStatus;
    storage: ServiceStatus;
    openai: ServiceStatus;
    auth: ServiceStatus;
    redis: ServiceStatus;
  };
  metrics: {
    responseTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

export class ProductionMonitor {
  private static instance: ProductionMonitor;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private alertThresholds = {
    responseTime: 5000, // 5 seconds
    errorRate: 0.05, // 5%
    memoryUsage: 0.85, // 85%
    cpuUsage: 0.80 // 80%
  };

  public static getInstance(): ProductionMonitor {
    if (!ProductionMonitor.instance) {
      ProductionMonitor.instance = new ProductionMonitor();
    }
    return ProductionMonitor.instance;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(): void {
    if (this.healthCheckInterval) {
      return; // Already monitoring
    }

    logger.info('Starting production monitoring', {});
    
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed', { data: error });
      }
    }, 30000);

    // Initial health check
    this.performHealthCheck();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Production monitoring stopped', {});
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    try {
      // Check all services in parallel
      const [database, storage, openai, auth, redis] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkStorage(),
        this.checkOpenAI(),
        this.checkAuth(),
        this.checkRedis()
      ]);

      const services = {
        database: this.getServiceStatus(database),
        storage: this.getServiceStatus(storage),
        openai: this.getServiceStatus(openai),
        auth: this.getServiceStatus(auth),
        redis: this.getServiceStatus(redis)
      };

      // Calculate overall system health
      const serviceStatuses = Object.values(services);
      const downServices = serviceStatuses.filter(s => s.status === 'down').length;
      const degradedServices = serviceStatuses.filter(s => s.status === 'degraded').length;

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (downServices > 0) {
        overallStatus = 'unhealthy';
      } else if (degradedServices > 0) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      // Get system metrics
      const metrics = await this.getSystemMetrics();

      const health: SystemHealth = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services,
        metrics
      };

      // Log health status
      if (overallStatus === 'unhealthy') {
        logger.error('System health check failed', { health });
        await this.sendAlert('System is unhealthy', health);
      } else if (overallStatus === 'degraded') {
        logger.warn('System health is degraded', { health });
      } else {
        logger.info('System health check passed', { health });
      }

      return health;

    } catch (error) {
      logger.error('Health check failed', { data: error });
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: { status: 'down', error: 'Health check failed', lastChecked: new Date().toISOString() },
          storage: { status: 'down', error: 'Health check failed', lastChecked: new Date().toISOString() },
          openai: { status: 'down', error: 'Health check failed', lastChecked: new Date().toISOString() },
          auth: { status: 'down', error: 'Health check failed', lastChecked: new Date().toISOString() },
          redis: { status: 'down', error: 'Health check failed', lastChecked: new Date().toISOString() }
        },
        metrics: {
          responseTime: 0,
          errorRate: 1,
          throughput: 0,
          memoryUsage: 0,
          cpuUsage: 0
        }
      };
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      const { getRepositories } = await import('@/lib/azure/cosmos');
      const repositories = await getRepositories();
      
      // Simple query to test connectivity
      await repositories.users.list();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime > 2000 ? 'degraded' : 'up',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Check storage connectivity
   */
  private async checkStorage(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      const { getStorageServices } = await import('@/lib/azure/storage');
      const storage = await getStorageServices();
      
      // Test storage connectivity
      await storage.documents.getFileUrl('health-check');
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime > 3000 ? 'degraded' : 'up',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Check OpenAI connectivity
   */
  private async checkOpenAI(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      const { azureOpenAIService } = await import('@/lib/azure/openai');
      
      // Simple test request
      await azureOpenAIService.generateText('test');
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime > 5000 ? 'degraded' : 'up',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Check authentication service
   */
  private async checkAuth(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      // Test Azure AD B2C configuration
      const tenantId = productionConfig.azure.adb2c.tenantId;
      const clientId = productionConfig.azure.adb2c.clientId;
      
      if (!tenantId || !clientId) {
        throw new Error('Azure AD B2C configuration missing');
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'up',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      const { redisService } = await import('@/lib/azure/redis');
      
      // Test Redis connectivity
      await redisService.ping();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime > 1000 ? 'degraded' : 'up',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      return {
        responseTime: 0, // Would be calculated from actual requests
        errorRate: 0, // Would be calculated from actual error logs
        throughput: 0, // Would be calculated from actual request count
        memoryUsage: memUsage.heapUsed / memUsage.heapTotal,
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to seconds
      };
    } catch (error) {
      logger.error('Failed to get system metrics', { data: error });
      return {
        responseTime: 0,
        errorRate: 0,
        throughput: 0,
        memoryUsage: 0,
        cpuUsage: 0
      };
    }
  }

  /**
   * Get service status from Promise result
   */
  private getServiceStatus(result: PromiseSettledResult<ServiceStatus>): ServiceStatus {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'down',
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(message: string, health: SystemHealth): Promise<void> {
    try {
      // In a real implementation, this would send to monitoring service
      logger.error('ALERT', { message, health });
      
      // Could integrate with:
      // - Azure Monitor
      // - PagerDuty
      // - Slack
      // - Email notifications
    } catch (error) {
      logger.error('Failed to send alert', { data: error });
    }
  }
}

// Export singleton instance
export const productionMonitor = ProductionMonitor.getInstance();
