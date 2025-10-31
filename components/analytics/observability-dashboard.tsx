'use client';

/**
 * Observability Metrics Dashboard
 * Displays RAG pipeline metrics from lib/rag/observability.ts
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMetricsSnapshot } from '../../lib/rag/observability';

export function ObservabilityDashboard() {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = () => {
    const data = getMetricsSnapshot();
    setSnapshot(data);
    setLoading(false);
  };

  if (loading || !snapshot) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading metrics...</div>
      </div>
    );
  }

  // Prepare chart data
  const tierRequestData = [
    { tier: 'L1', count: snapshot.requests.byTier.L1, percentage: ((snapshot.requests.byTier.L1 / snapshot.requests.total) * 100).toFixed(1) },
    { tier: 'L2', count: snapshot.requests.byTier.L2, percentage: ((snapshot.requests.byTier.L2 / snapshot.requests.total) * 100).toFixed(1) },
    { tier: 'L3', count: snapshot.requests.byTier.L3, percentage: ((snapshot.requests.byTier.L3 / snapshot.requests.total) * 100).toFixed(1) },
  ];

  const latencyData = [
    { metric: 'Avg', value: Math.round(snapshot.latency.avg) },
    { metric: 'P50', value: Math.round(snapshot.latency.p50) },
    { metric: 'P95', value: Math.round(snapshot.latency.p95) },
    { metric: 'P99', value: Math.round(snapshot.latency.p99) },
  ];

  const componentLatencyData = [
    { component: 'Cache', value: Math.round(snapshot.latency.byComponent.cache) },
    { component: 'Retrieval', value: Math.round(snapshot.latency.byComponent.retrieval) },
    { component: 'Generation', value: Math.round(snapshot.latency.byComponent.generation) },
    { component: 'Validation', value: Math.round(snapshot.latency.byComponent.validation) },
  ];

  const costByTierData = [
    { tier: 'L1', cost: snapshot.cost.byTier.L1.toFixed(4), avgPerRequest: snapshot.cost.avgPerRequest.toFixed(4) },
    { tier: 'L2', cost: snapshot.cost.byTier.L2.toFixed(4), avgPerRequest: snapshot.cost.avgPerRequest.toFixed(4) },
    { tier: 'L3', cost: snapshot.cost.byTier.L3.toFixed(4), avgPerRequest: snapshot.cost.avgPerRequest.toFixed(4) },
  ];

  const cacheData = [
    { type: 'Exact Hits', value: snapshot.cache.exactHits },
    { type: 'Semantic Hits', value: snapshot.cache.semanticHits },
    { type: 'Misses', value: snapshot.cache.misses },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{snapshot.requests.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {snapshot.requests.cached} from cache ({((snapshot.requests.cached / snapshot.requests.total) * 100).toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
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
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(snapshot.latency.avg)}ms</div>
            <p className="text-xs text-muted-foreground">
              P95: {Math.round(snapshot.latency.p95)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
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
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${snapshot.cost.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${snapshot.cost.avgPerRequest.toFixed(4)} per request
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
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
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{snapshot.cache.hitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {snapshot.cache.exactHits + snapshot.cache.semanticHits} hits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="latency">Latency</TabsTrigger>
          <TabsTrigger value="cost">Cost</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Requests by Tier</CardTitle>
                <CardDescription>LLM tier distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tierRequestData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tier" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8b5cf6" name="Request Count" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {tierRequestData.map((tier) => (
                    <div key={tier.tier} className="flex justify-between text-sm">
                      <span className="font-medium">{tier.tier}:</span>
                      <span className="text-muted-foreground">
                        {tier.count} requests ({tier.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
                <CardDescription>Hit rate: {snapshot.cache.hitRate.toFixed(1)}%</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cacheData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Total Lookups:</span>
                    <span className="text-muted-foreground">
                      {snapshot.cache.exactHits + snapshot.cache.semanticHits + snapshot.cache.misses}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Escalated Requests:</span>
                    <span className="text-muted-foreground">{snapshot.requests.escalated}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="latency" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Latency Percentiles</CardTitle>
                <CardDescription>Response time distribution (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={latencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Latency by Component</CardTitle>
                <CardDescription>Pipeline breakdown (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={componentLatencyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="component" type="category" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost by Tier</CardTitle>
              <CardDescription>LLM usage costs (USD)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costByTierData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tier" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cost" fill="#ec4899" name="Total Cost ($)" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    ${snapshot.cost.byTier.L1.toFixed(4)}
                  </div>
                  <p className="text-xs text-muted-foreground">L1 Total Cost</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-bold text-amber-600">
                    ${snapshot.cost.byTier.L2.toFixed(4)}
                  </div>
                  <p className="text-xs text-muted-foreground">L2 Total Cost</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-bold text-pink-600">
                    ${snapshot.cost.byTier.L3.toFixed(4)}
                  </div>
                  <p className="text-xs text-muted-foreground">L3 Total Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Grounding Quality</CardTitle>
                <CardDescription>Average: {snapshot.grounding.avg.toFixed(1)}%</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Average Grounding Score</span>
                      <span className="text-sm text-muted-foreground">
                        {snapshot.grounding.avg.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${snapshot.grounding.avg}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Responses Below Threshold (70%):</span>
                      <span className="font-medium text-red-600">
                        {snapshot.grounding.belowThreshold}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Grounding Checks:</span>
                      <span className="font-medium">{snapshot.requests.total}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Metrics</CardTitle>
                <CardDescription>Total errors: {snapshot.errors.total}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(snapshot.errors.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
                  {snapshot.errors.total === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No errors recorded
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
