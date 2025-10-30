/**
 * Environment Configuration - Production-Ready Environment Management
 * 
 * This module provides environment-aware configuration that works across
 * all deployment scenarios (development, staging, production, build-time).
 * 
 * Key Features:
 * - Environment detection and validation
 * - Graceful fallbacks for missing services
 * - Build-time vs runtime configuration
 * - Service availability detection
 */

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface EnvironmentConfig {
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  isBuildTime: boolean;
  skipExternalServices: boolean;
  enableMockServices: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

class EnvironmentManager {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.detectEnvironment();
  }

  private detectEnvironment(): EnvironmentConfig {
    const nodeEnv = (process.env.NODE_ENV as Environment) || 'development';
    const isBuildTime = process.env.SKIP_AZURE_CONFIG === '1' || 
                       process.env.NODE_ENV === 'test' ||
                       process.env.NEXT_PHASE === 'phase-production-build';
    
    return {
      environment: nodeEnv,
      isDevelopment: nodeEnv === 'development',
      isProduction: nodeEnv === 'production',
      isTest: nodeEnv === 'test',
      isBuildTime,
      skipExternalServices: isBuildTime || process.env.SKIP_EXTERNAL_SERVICES === '1',
      enableMockServices: isBuildTime || process.env.ENABLE_MOCK_SERVICES === '1',
      logLevel: (process.env.LOG_LEVEL as any) || (nodeEnv === 'production' ? 'info' : 'debug'),
    };
  }

  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  isServiceRequired(serviceName: string): boolean {
    // During build time, no external services are required
    if (this.config.isBuildTime) {
      return false;
    }

    // In test environment, only require services if explicitly enabled
    if (this.config.isTest) {
      return process.env[`REQUIRE_${serviceName.toUpperCase()}`] === '1';
    }

    // In production, all services are required
    if (this.config.isProduction) {
      return true;
    }

    // In development, services are optional
    return false;
  }

  shouldUseMockService(serviceName: string): boolean {
    // Always use mocks during build time
    if (this.config.isBuildTime) {
      return true;
    }

    // Use mocks if explicitly enabled
    if (this.config.enableMockServices) {
      return true;
    }

    // Use mocks if service is not required and not available
    if (!this.isServiceRequired(serviceName)) {
      return true;
    }

    return false;
  }

  getServiceConfig(serviceName: string): Record<string, any> {
    const baseConfig = {
      enabled: !this.shouldUseMockService(serviceName),
      mockMode: this.shouldUseMockService(serviceName),
      retryAttempts: this.config.isProduction ? 3 : 1,
      timeout: this.config.isProduction ? 30000 : 10000,
    };

    // Import production mapping for better environment variable handling
    const { PRODUCTION_ENV_MAPPING } = require('./production-env-mapping');

    switch (serviceName.toLowerCase()) {
      case 'cosmos':
        return {
          ...baseConfig,
          endpoint: PRODUCTION_ENV_MAPPING.COSMOS_DB_ENDPOINT,
          key: PRODUCTION_ENV_MAPPING.COSMOS_DB_KEY,
          database: PRODUCTION_ENV_MAPPING.COSMOS_DB_DATABASE || 'BenefitsChat',
        };
      
      case 'redis':
        return {
          ...baseConfig,
          url: PRODUCTION_ENV_MAPPING.REDIS_URL,
          host: PRODUCTION_ENV_MAPPING.REDIS_HOST,
          port: parseInt(PRODUCTION_ENV_MAPPING.REDIS_PORT || '6379'),
          password: PRODUCTION_ENV_MAPPING.REDIS_PASSWORD,
        };
      
      case 'openai':
        return {
          ...baseConfig,
          apiKey: PRODUCTION_ENV_MAPPING.OPENAI_API_KEY,
          endpoint: PRODUCTION_ENV_MAPPING.AZURE_OPENAI_ENDPOINT,
          apiVersion: PRODUCTION_ENV_MAPPING.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
        };
      
      default:
        return baseConfig;
    }
  }

  // Health check for environment configuration
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Import production mapping for validation
    const { PRODUCTION_ENV_MAPPING } = require('./production-env-mapping');
    
    // Only validate required services
    if (this.isServiceRequired('cosmos')) {
      if (!PRODUCTION_ENV_MAPPING.COSMOS_DB_ENDPOINT) {
        errors.push('COSMOS_DB_ENDPOINT is required');
      }
      if (!PRODUCTION_ENV_MAPPING.COSMOS_DB_KEY) {
        errors.push('COSMOS_DB_KEY is required');
      }
    }

    if (this.isServiceRequired('redis')) {
      if (!PRODUCTION_ENV_MAPPING.REDIS_URL && !PRODUCTION_ENV_MAPPING.REDIS_HOST) {
        errors.push('REDIS_URL or REDIS_HOST is required');
      }
    }

    if (this.isServiceRequired('openai')) {
      if (!PRODUCTION_ENV_MAPPING.OPENAI_API_KEY) {
        errors.push('OPENAI_API_KEY is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Get environment-specific logging configuration
  getLoggingConfig() {
    return {
      level: this.config.logLevel,
      enableConsole: !this.config.isProduction,
      enableFile: this.config.isProduction,
      enableStructured: this.config.isProduction,
      includeStackTraces: this.config.isDevelopment,
    };
  }

  // Get performance configuration based on environment
  getPerformanceConfig() {
    return {
      enableCaching: !this.config.isTest,
      cacheTimeout: this.config.isProduction ? 3600 : 300, // 1 hour in prod, 5 min in dev
      enableCompression: this.config.isProduction,
      enableMinification: this.config.isProduction,
      enableSourceMaps: this.config.isDevelopment,
    };
  }
}

// Singleton instance
export const environmentManager = new EnvironmentManager();

// Convenience functions
export function getEnvironment(): EnvironmentConfig {
  return environmentManager.getConfig();
}

export function isServiceRequired(serviceName: string): boolean {
  return environmentManager.isServiceRequired(serviceName);
}

export function shouldUseMockService(serviceName: string): boolean {
  return environmentManager.shouldUseMockService(serviceName);
}

export function getServiceConfig(serviceName: string): Record<string, any> {
  return environmentManager.getServiceConfig(serviceName);
}

export function validateEnvironment(): { valid: boolean; errors: string[] } {
  return environmentManager.validateConfiguration();
}
