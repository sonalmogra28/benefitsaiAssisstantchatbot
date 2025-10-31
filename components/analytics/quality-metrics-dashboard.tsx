'use client';

/**
 * Conversation Quality Metrics Dashboard
 * Displays real-time analytics for conversation quality, grounding, satisfaction, and escalations
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QualityTracker, QualityMetrics } from '../../lib/analytics/quality-tracker';

interface QualityMetricsDashboardProps {
  companyId?: string;
  timeRange?: 'hour' | 'day' | 'week' | 'month';
}

const COLORS = {
  excellent: '#10b981', // green
  good: '#3b82f6',      // blue
  poor: '#ef4444',      // red
  L1: '#8b5cf6',        // purple
  L2: '#f59e0b',        // amber
  L3: '#ec4899',        // pink
  promoters: '#10b981',
  passives: '#f59e0b',
  detractors: '#ef4444',
};

export function QualityMetricsDashboard({ companyId, timeRange = 'day' }: QualityMetricsDashboardProps) {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [companyId, timeRange]);

  const loadMetrics = () => {
    const now = Date.now();
    const ranges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    const startTime = now - ranges[timeRange];

    const data = companyId
      ? QualityTracker.getCompanyMetrics(companyId, startTime, now)
      : QualityTracker.getMetrics(startTime, now);

    setMetrics(data);
    setLoading(false);
  };

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  // Prepare data for charts
  const groundingData = [
    { name: 'Excellent (>90%)', value: metrics.groundingDistribution.excellent, fill: COLORS.excellent },
    { name: 'Good (70-90%)', value: metrics.groundingDistribution.good, fill: COLORS.good },
    { name: 'Poor (<70%)', value: metrics.groundingDistribution.poor, fill: COLORS.poor },
  ];

  const npsData = [
    { name: 'Promoters (9-10)', value: metrics.npsCategory.promoters, fill: COLORS.promoters },
    { name: 'Passives (7-8)', value: metrics.npsCategory.passives, fill: COLORS.passives },
    { name: 'Detractors (0-6)', value: metrics.npsCategory.detractors, fill: COLORS.detractors },
  ];

  const tierPerformanceData = [
    {
      tier: 'L1',
      count: metrics.byTier.L1.count,
      avgResponseTime: metrics.byTier.L1.avgResponseTime,
      avgGrounding: metrics.byTier.L1.avgGroundingScore,
      avgSatisfaction: metrics.byTier.L1.avgSatisfaction,
    },
    {
      tier: 'L2',
      count: metrics.byTier.L2.count,
      avgResponseTime: metrics.byTier.L2.avgResponseTime,
      avgGrounding: metrics.byTier.L2.avgGroundingScore,
      avgSatisfaction: metrics.byTier.L2.avgSatisfaction,
    },
    {
      tier: 'L3',
      count: metrics.byTier.L3.count,
      avgResponseTime: metrics.byTier.L3.avgResponseTime,
      avgGrounding: metrics.byTier.L3.avgGroundingScore,
      avgSatisfaction: metrics.byTier.L3.avgSatisfaction,
    },
  ];

  const responseTimeData = [
    { metric: 'Avg', value: Math.round(metrics.avgResponseTime) },
    { metric: 'P50', value: Math.round(metrics.p50ResponseTime) },
    { metric: 'P95', value: Math.round(metrics.p95ResponseTime) },
    { metric: 'P99', value: Math.round(metrics.p99ResponseTime) },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalConversations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.conversationsWithRatings} with ratings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.avgResponseTime)}ms</div>
            <p className="text-xs text-muted-foreground">
              P95: {Math.round(metrics.p95ResponseTime)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Grounding Score</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgGroundingScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.groundingDistribution.poor} below threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">First Contact Resolution</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.firstContactResolutionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.escalationRate.toFixed(1)}% escalation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
          <TabsTrigger value="tiers">Tier Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
                <CardDescription>Latency percentiles (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
                <CardDescription>Cache hit rate: {metrics.cacheHitRate.toFixed(1)}%</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary">
                    {metrics.cacheHitRate.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {Math.round((metrics.cacheHitRate / 100) * metrics.totalConversations)} cache hits
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Grounding Score Distribution</CardTitle>
                <CardDescription>Response accuracy breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={groundingData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {groundingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Escalation Metrics</CardTitle>
                <CardDescription>Tier upgrade patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Escalation Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {metrics.escalationRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${metrics.escalationRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">First Contact Resolution</span>
                    <span className="text-sm text-muted-foreground">
                      {metrics.firstContactResolutionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${metrics.firstContactResolutionRate}%` }}
                    />
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Avg Escalations: <span className="font-medium text-foreground">
                      {metrics.avgEscalationCount.toFixed(2)}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="satisfaction" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Satisfaction (CSAT)</CardTitle>
                <CardDescription>Average rating: {metrics.avgCSAT.toFixed(2)} / 5.0</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary">
                    {metrics.avgCSAT.toFixed(1)}
                  </div>
                  <div className="flex justify-center mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-8 h-8 ${
                          star <= Math.round(metrics.avgCSAT)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on {metrics.conversationsWithRatings} responses
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Net Promoter Score (NPS)</CardTitle>
                <CardDescription>Average: {metrics.avgNPS.toFixed(1)} / 10</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={npsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {npsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Tier</CardTitle>
              <CardDescription>LLM tier comparison (L1/L2/L3)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={tierPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tier" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill={COLORS.L1} name="Request Count" />
                  <Bar yAxisId="right" dataKey="avgResponseTime" fill={COLORS.L2} name="Avg Response Time (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {(['L1', 'L2', 'L3'] as const).map((tier) => (
              <Card key={tier}>
                <CardHeader>
                  <CardTitle>{tier} Metrics</CardTitle>
                  <CardDescription>{metrics.byTier[tier].count} requests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Avg Response Time:</span>
                    <span className="font-medium">
                      {Math.round(metrics.byTier[tier].avgResponseTime)}ms
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Grounding:</span>
                    <span className="font-medium">
                      {metrics.byTier[tier].avgGroundingScore.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Satisfaction:</span>
                    <span className="font-medium">
                      {metrics.byTier[tier].avgSatisfaction.toFixed(2)} / 5.0
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
