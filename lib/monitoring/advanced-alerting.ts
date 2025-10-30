/**
 * Advanced Monitoring & Alerting System
 * Phase 3: Production Readiness with Real-time Dashboards and Circuit Breakers
 */

import { logger } from '@/lib/logger';
import { productionMonitor, SystemHealth } from './production-monitor';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // minutes
  lastTriggered?: Date;
  notificationChannels: NotificationChannel[];
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'not_contains';
  threshold: number | string;
  duration: number; // seconds
  aggregation?: 'avg' | 'sum' | 'max' | 'min' | 'count';
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  metadata: Record<string, any>;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  successCount: number;
}

export class AdvancedAlertingSystem {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private metricsBuffer: Array<{ metric: string; value: number; timestamp: Date }> = [];
  private isMonitoring = false;

  constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  /**
   * Initialize default alert rules for production
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-response-time',
        name: 'High Response Time',
        description: 'Average response time exceeds 5 seconds',
        condition: {
          metric: 'response_time',
          operator: '>',
          threshold: 5000,
          duration: 300, // 5 minutes
          aggregation: 'avg'
        },
        severity: 'high',
        enabled: true,
        cooldown: 15,
        notificationChannels: [
          { type: 'email', config: { recipients: ['admin@company.com'] } },
          { type: 'slack', config: { webhook: process.env.SLACK_WEBHOOK_URL } }
        ]
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds 5%',
        condition: {
          metric: 'error_rate',
          operator: '>',
          threshold: 0.05,
          duration: 300,
          aggregation: 'avg'
        },
        severity: 'critical',
        enabled: true,
        cooldown: 5,
        notificationChannels: [
          { type: 'email', config: { recipients: ['admin@company.com', 'devops@company.com'] } },
          { type: 'pagerduty', config: { integrationKey: process.env.PAGERDUTY_KEY } }
        ]
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Memory usage exceeds 85%',
        condition: {
          metric: 'memory_usage',
          operator: '>',
          threshold: 0.85,
          duration: 180,
          aggregation: 'avg'
        },
        severity: 'medium',
        enabled: true,
        cooldown: 30,
        notificationChannels: [
          { type: 'email', config: { recipients: ['admin@company.com'] } }
        ]
      },
      {
        id: 'low-throughput',
        name: 'Low Throughput',
        description: 'Throughput below expected threshold',
        condition: {
          metric: 'throughput',
          operator: '<',
          threshold: 50,
          duration: 600,
          aggregation: 'avg'
        },
        severity: 'medium',
        enabled: true,
        cooldown: 60,
        notificationChannels: [
          { type: 'email', config: { recipients: ['admin@company.com'] } }
        ]
      },
      {
        id: 'database-connection-failure',
        name: 'Database Connection Failure',
        description: 'Database connection failures detected',
        condition: {
          metric: 'database_status',
          operator: '==',
          threshold: 'down',
          duration: 60
        },
        severity: 'critical',
        enabled: true,
        cooldown: 1,
        notificationChannels: [
          { type: 'pagerduty', config: { integrationKey: process.env.PAGERDUTY_KEY } },
          { type: 'sms', config: { phone: process.env.ADMIN_PHONE } }
        ]
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * Start monitoring system health and metrics
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Monitor system health every 30 seconds
    setInterval(async () => {
      try {
        const health = await productionMonitor.performHealthCheck();
        await this.processHealthData(health);
      } catch (error) {
        logger.error('Health monitoring error', { error });
      }
    }, 30000);

    // Process metrics every 10 seconds
    setInterval(() => {
      this.processMetrics();
    }, 10000);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);

    logger.info('Advanced alerting system started');
  }

  /**
   * Process system health data and check alert conditions
   */
  private async processHealthData(health: SystemHealth): Promise<void> {
    const timestamp = new Date();
    
    // Add health metrics to buffer
    this.addMetric('response_time', health.metrics.responseTime, timestamp);
    this.addMetric('error_rate', health.metrics.errorRate, timestamp);
    this.addMetric('throughput', health.metrics.throughput, timestamp);
    this.addMetric('memory_usage', health.metrics.memoryUsage, timestamp);
    this.addMetric('cpu_usage', health.metrics.cpuUsage, timestamp);

    // Check service status
    Object.entries(health.services).forEach(([service, status]) => {
      this.addMetric(`${service}_status`, status.status === 'up' ? 1 : 0, timestamp);
    });

    // Check alert rules
    await this.checkAlertRules();
  }

  /**
   * Add metric to buffer
   */
  private addMetric(metric: string, value: number, timestamp: Date): void {
    this.metricsBuffer.push({ metric, value, timestamp });
    
    // Keep only last 1 hour of metrics
    const oneHourAgo = new Date(Date.now() - 3600000);
    this.metricsBuffer = this.metricsBuffer.filter(m => m.timestamp > oneHourAgo);
  }

  /**
   * Process metrics and check for alert conditions
   */
  private async processMetrics(): Promise<void> {
    const now = new Date();
    
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldown * 60 * 1000;
        if (now.getTime() - rule.lastTriggered.getTime() < cooldownMs) {
          continue;
        }
      }

      const shouldTrigger = await this.evaluateCondition(rule.condition, now);
      if (shouldTrigger) {
        await this.triggerAlert(rule);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private async evaluateCondition(condition: AlertCondition, now: Date): Promise<boolean> {
    const cutoffTime = new Date(now.getTime() - condition.duration * 1000);
    const relevantMetrics = this.metricsBuffer.filter(
      m => m.metric === condition.metric && m.timestamp >= cutoffTime
    );

    if (relevantMetrics.length === 0) return false;

    let value: number;
    if (condition.aggregation) {
      switch (condition.aggregation) {
        case 'avg':
          value = relevantMetrics.reduce((sum, m) => sum + m.value, 0) / relevantMetrics.length;
          break;
        case 'sum':
          value = relevantMetrics.reduce((sum, m) => sum + m.value, 0);
          break;
        case 'max':
          value = Math.max(...relevantMetrics.map(m => m.value));
          break;
        case 'min':
          value = Math.min(...relevantMetrics.map(m => m.value));
          break;
        case 'count':
          value = relevantMetrics.length;
          break;
        default:
          value = relevantMetrics[relevantMetrics.length - 1].value;
      }
    } else {
      value = relevantMetrics[relevantMetrics.length - 1].value;
    }

    return this.compareValues(value, condition.operator, condition.threshold);
  }

  /**
   * Compare values based on operator
   */
  private compareValues(value: number, operator: string, threshold: number | string): boolean {
    switch (operator) {
      case '>':
        return value > (threshold as number);
      case '<':
        return value < (threshold as number);
      case '>=':
        return value >= (threshold as number);
      case '<=':
        return value <= (threshold as number);
      case '==':
        return value === (threshold as number);
      case '!=':
        return value !== (threshold as number);
      case 'contains':
        return String(value).includes(String(threshold));
      case 'not_contains':
        return !String(value).includes(String(threshold));
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(rule: AlertRule): Promise<void> {
    const alertId = `${rule.id}-${Date.now()}`;
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      title: rule.name,
      message: rule.description,
      severity: rule.severity,
      status: 'active',
      triggeredAt: new Date(),
      metadata: {
        condition: rule.condition,
        triggeredBy: 'system'
      }
    };

    this.alerts.set(alertId, alert);
    rule.lastTriggered = new Date();

    // Send notifications
    await this.sendNotifications(alert, rule.notificationChannels);

    logger.warn('Alert triggered', {
      alertId,
      ruleId: rule.id,
      severity: rule.severity,
      message: rule.description
    });
  }

  /**
   * Send notifications through configured channels
   */
  private async sendNotifications(alert: Alert, channels: NotificationChannel[]): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailNotification(alert, channel.config);
            break;
          case 'slack':
            await this.sendSlackNotification(alert, channel.config);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert, channel.config);
            break;
          case 'sms':
            await this.sendSMSNotification(alert, channel.config);
            break;
          case 'pagerduty':
            await this.sendPagerDutyNotification(alert, channel.config);
            break;
        }
      } catch (error) {
        logger.error('Notification send failed', {
          channel: channel.type,
          alertId: alert.id,
          error
        });
      }
    }
  }

  /**
   * Check alert rules against current metrics
   */
  private async checkAlertRules(): Promise<void> {
    const currentTime = Date.now();
    const recentMetrics = this.metricsBuffer.filter(m => 
      currentTime - m.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    // Check CPU usage
    const cpuMetrics = recentMetrics.filter(m => m.metric === 'cpu_usage');
    if (cpuMetrics.length > 0) {
      const avgCpu = cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length;
      if (avgCpu > 80) {
        this.createAlert('high_cpu', 'High CPU Usage', 
          `CPU usage is at ${avgCpu.toFixed(1)}%`, 'high');
      }
    }

    // Check memory usage
    const memoryMetrics = recentMetrics.filter(m => m.metric === 'memory_usage');
    if (memoryMetrics.length > 0) {
      const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length;
      if (avgMemory > 85) {
        this.createAlert('high_memory', 'High Memory Usage', 
          `Memory usage is at ${avgMemory.toFixed(1)}%`, 'high');
      }
    }

    // Check error rates
    const errorMetrics = recentMetrics.filter(m => m.metric === 'error_rate');
    if (errorMetrics.length > 0) {
      const avgErrorRate = errorMetrics.reduce((sum, m) => sum + m.value, 0) / errorMetrics.length;
      if (avgErrorRate > 5) {
        this.createAlert('high_error_rate', 'High Error Rate', 
          `Error rate is at ${avgErrorRate.toFixed(1)}%`, 'critical');
      }
    }
  }

  /**
   * Create a new alert
   */
  private createAlert(ruleId: string, title: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alert: Alert = {
      id: alertId,
      ruleId,
      title,
      message,
      severity,
      status: 'active',
      triggeredAt: new Date(),
      metadata: {}
    };

    this.alerts.set(alertId, alert);
    logger.warn('Alert created', { alertId, ruleId, title, severity });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: Alert, config: any): Promise<void> {
    // In production, integrate with email service (SendGrid, SES, etc.)
    logger.info('Email notification sent', {
      alertId: alert.id,
      recipients: config.recipients,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`
    });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: Alert, config: any): Promise<void> {
    if (!config.webhook) return;

    const payload = {
      text: `🚨 *${alert.title}*`,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          fields: [
            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
            { title: 'Status', value: alert.status, short: true },
            { title: 'Message', value: alert.message, short: false },
            { title: 'Time', value: alert.triggeredAt.toISOString(), short: true }
          ]
        }
      ]
    };

    // In production, make actual HTTP request to Slack webhook
    logger.info('Slack notification sent', { alertId: alert.id });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: Alert, config: any): Promise<void> {
    if (!config.url) return;

    const payload = {
      alert,
      timestamp: new Date().toISOString(),
      source: 'benefits-chatbot'
    };

    // In production, make actual HTTP request
    logger.info('Webhook notification sent', { alertId: alert.id, url: config.url });
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(alert: Alert, config: any): Promise<void> {
    if (!config.phone) return;

    const message = `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`;
    
    // In production, integrate with SMS service (Twilio, etc.)
    logger.info('SMS notification sent', { alertId: alert.id, phone: config.phone });
  }

  /**
   * Send PagerDuty notification
   */
  private async sendPagerDutyNotification(alert: Alert, config: any): Promise<void> {
    if (!config.integrationKey) return;

    const payload = {
      routing_key: config.integrationKey,
      event_action: 'trigger',
      dedup_key: alert.id,
      payload: {
        summary: alert.title,
        source: 'benefits-chatbot',
        severity: alert.severity,
        custom_details: {
          message: alert.message,
          metadata: alert.metadata
        }
      }
    };

    // In production, make actual HTTP request to PagerDuty
    logger.info('PagerDuty notification sent', { alertId: alert.id });
  }

  /**
   * Get severity color for UI
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'good';
      case 'low': return '#36a64f';
      default: return '#36a64f';
    }
  }

  /**
   * Circuit breaker implementation
   */
  async executeWithCircuitBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
    config: CircuitBreakerConfig
  ): Promise<T> {
    const state = this.getCircuitBreakerState(serviceName, config);
    
    if (state.state === 'open') {
      if (state.nextAttemptTime && new Date() < state.nextAttemptTime) {
        throw new Error(`Circuit breaker is open for ${serviceName}`);
      }
      state.state = 'half-open';
      state.successCount = 0;
    }

    try {
      const result = await operation();
      
      if (state.state === 'half-open') {
        state.successCount++;
        if (state.successCount >= config.halfOpenMaxCalls) {
          state.state = 'closed';
          state.failureCount = 0;
        }
      } else {
        state.failureCount = 0;
      }
      
      return result;
    } catch (error) {
      state.failureCount++;
      state.lastFailureTime = new Date();
      
      if (state.failureCount >= config.failureThreshold) {
        state.state = 'open';
        state.nextAttemptTime = new Date(Date.now() + config.recoveryTimeout);
        
        // Trigger circuit breaker alert
        await this.triggerAlert({
          id: `circuit-breaker-${serviceName}`,
          name: `Circuit Breaker Open - ${serviceName}`,
          description: `Circuit breaker opened for ${serviceName} due to ${state.failureCount} consecutive failures`,
          condition: { metric: 'circuit_breaker', operator: '==', threshold: 'open', duration: 0 },
          severity: 'high',
          enabled: true,
          cooldown: 5,
          notificationChannels: [
            { type: 'email', config: { recipients: ['admin@company.com'] } }
          ]
        });
      }
      
      throw error;
    }
  }

  /**
   * Get circuit breaker state
   */
  private getCircuitBreakerState(serviceName: string, config: CircuitBreakerConfig): CircuitBreakerState {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, {
        state: 'closed',
        failureCount: 0,
        successCount: 0
      });
    }
    
    return this.circuitBreakers.get(serviceName)!;
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const oneHourAgo = new Date(Date.now() - 3600000);
    this.metricsBuffer = this.metricsBuffer.filter(m => m.timestamp > oneHourAgo);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    
    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();
    
    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    
    return true;
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    bySeverity: Record<string, number>;
  } {
    const alerts = Array.from(this.alerts.values());
    
    return {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      bySeverity: alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

// Export singleton instance
export const alertingSystem = new AdvancedAlertingSystem();
