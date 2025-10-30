/**
 * Cost Monitoring Dashboard Component
 * Track spending, set budget alerts, and monitor costs
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  Settings,
  Bell,
  BarChart3,
  Calendar,
  CreditCard,
  Zap,
  Database,
  Globe,
} from 'lucide-react';

interface CostData {
  date: string;
  aiUsage: number;
  storage: number;
  apiCalls: number;
  total: number;
}

interface BudgetAlert {
  id: string;
  type: 'ai_usage' | 'storage' | 'api_calls' | 'total';
  threshold: number;
  current: number;
  percentage: number;
  status: 'active' | 'triggered' | 'disabled';
  createdAt: string;
}

interface CostMonitoringProps {
  tenantId: string;
  companyName?: string;
}

export function CostMonitoringDashboard({
  tenantId,
  companyName = 'Amerivet',
}: CostMonitoringProps) {
  const [costData, setCostData] = useState<CostData[]>([]);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

  // Mock data for demonstration
  const mockCostData: CostData[] = [
    { date: '2024-01-01', aiUsage: 45.20, storage: 12.30, apiCalls: 8.50, total: 66.00 },
    { date: '2024-01-02', aiUsage: 52.80, storage: 12.45, apiCalls: 9.20, total: 74.45 },
    { date: '2024-01-03', aiUsage: 38.90, storage: 12.60, apiCalls: 7.80, total: 59.30 },
    { date: '2024-01-04', aiUsage: 61.20, storage: 12.75, apiCalls: 10.50, total: 84.45 },
    { date: '2024-01-05', aiUsage: 48.70, storage: 12.90, apiCalls: 8.90, total: 70.50 },
    { date: '2024-01-06', aiUsage: 55.30, storage: 13.05, apiCalls: 9.60, total: 77.95 },
    { date: '2024-01-07', aiUsage: 42.10, storage: 13.20, apiCalls: 7.40, total: 62.70 },
  ];

  const mockAlerts: BudgetAlert[] = [
    {
      id: '1',
      type: 'ai_usage',
      threshold: 200,
      current: 180.50,
      percentage: 90,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      type: 'total',
      threshold: 300,
      current: 234.50,
      percentage: 78,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      type: 'storage',
      threshold: 50,
      current: 25.30,
      percentage: 51,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ];

  // Calculate totals
  const totals = costData.reduce(
    (acc, day) => ({
      aiUsage: acc.aiUsage + day.aiUsage,
      storage: acc.storage + day.storage,
      apiCalls: acc.apiCalls + day.apiCalls,
      total: acc.total + day.total,
    }),
    { aiUsage: 0, storage: 0, apiCalls: 0, total: 0 }
  );

  const monthlyBudget = 300;
  const budgetUsed = totals.total;
  const budgetRemaining = monthlyBudget - budgetUsed;
  const budgetPercentage = (budgetUsed / monthlyBudget) * 100;

  // Fetch cost data
  const fetchCostData = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API calls
      // const response = await fetch(`/api/admin/costs?tenantId=${tenantId}&timeRange=${timeRange}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCostData(mockCostData);
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Failed to fetch cost data:', error);
      setCostData(mockCostData);
      setAlerts(mockAlerts);
    } finally {
      setLoading(false);
    }
  }, [tenantId, timeRange]);

  useEffect(() => {
    fetchCostData();
  }, [fetchCostData]);

  // Export cost data to CSV
  const exportToCSV = () => {
    const csvData = [
      ['Date', 'AI Usage ($)', 'Storage ($)', 'API Calls ($)', 'Total ($)'],
      ...costData.map(day => [
        day.date,
        day.aiUsage.toFixed(2),
        day.storage.toFixed(2),
        day.apiCalls.toFixed(2),
        day.total.toFixed(2),
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `costs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get alert status color
  const getAlertStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Get alert status badge variant
  const getAlertStatusBadge = (percentage: number) => {
    if (percentage >= 90) return 'destructive';
    if (percentage >= 75) return 'default';
    return 'secondary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading cost data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cost Monitoring</h1>
          <p className="text-muted-foreground">
            Track spending and manage budgets for {companyName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="size-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Bell className="size-4 mr-2" />
                Set Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Budget Alert</DialogTitle>
                <DialogDescription>
                  Set up notifications when costs exceed your thresholds.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Alert Type</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cost type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ai_usage">AI Usage</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                      <SelectItem value="api_calls">API Calls</SelectItem>
                      <SelectItem value="total">Total Cost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Threshold Amount ($)</label>
                  <Input type="number" placeholder="Enter threshold amount" />
                </div>
                <div>
                  <label className="text-sm font-medium">Alert Frequency</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAlertDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsAlertDialogOpen(false)}>
                  Create Alert
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyBudget}</div>
            <p className="text-xs text-muted-foreground">
              Total monthly allowance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used This Month</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${budgetUsed.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {budgetPercentage.toFixed(1)}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <TrendingDown className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${budgetRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${budgetRemaining.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {budgetRemaining >= 0 ? 'Available' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(budgetUsed / costData.length).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per day this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Usage</CardTitle>
          <CardDescription>
            Monthly budget utilization and spending trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Budget</span>
              <span className="text-sm text-muted-foreground">
                ${budgetUsed.toFixed(2)} / ${monthlyBudget}
              </span>
            </div>
            <Progress 
              value={budgetPercentage} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-sm">
              <span className={getAlertStatusColor(budgetPercentage)}>
                {budgetPercentage.toFixed(1)}% used
              </span>
              <span className="text-muted-foreground">
                {budgetRemaining >= 0 ? `${budgetRemaining.toFixed(2)} remaining` : `${Math.abs(budgetRemaining).toFixed(2)} over budget`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Usage</CardTitle>
                <Zap className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totals.aiUsage.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  OpenAI API costs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage</CardTitle>
                <Database className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totals.storage.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Document storage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                <Globe className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totals.apiCalls.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  External APIs
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Spending</CardTitle>
              <CardDescription>
                Daily cost breakdown for the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>AI Usage</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>API Calls</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costData.slice(-7).map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                      <TableCell>${day.aiUsage.toFixed(2)}</TableCell>
                      <TableCell>${day.storage.toFixed(2)}</TableCell>
                      <TableCell>${day.apiCalls.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">${day.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>
                Detailed spending analysis by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="size-4 text-blue-600" />
                    <span className="font-medium">AI Usage</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${totals.aiUsage.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      {((totals.aiUsage / totals.total) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                </div>
                <Progress value={(totals.aiUsage / totals.total) * 100} className="h-2" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="size-4 text-green-600" />
                    <span className="font-medium">Storage</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${totals.storage.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      {((totals.storage / totals.total) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                </div>
                <Progress value={(totals.storage / totals.total) * 100} className="h-2" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="size-4 text-purple-600" />
                    <span className="font-medium">API Calls</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${totals.apiCalls.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      {((totals.apiCalls / totals.total) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                </div>
                <Progress value={(totals.apiCalls / totals.total) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Alerts</CardTitle>
              <CardDescription>
                Monitor spending thresholds and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`size-5 ${getAlertStatusColor(alert.percentage)}`} />
                      <div>
                        <h3 className="font-medium capitalize">
                          {alert.type.replace('_', ' ')} Alert
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Threshold: ${alert.threshold} | Current: ${alert.current.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getAlertStatusBadge(alert.percentage)}>
                        {alert.percentage.toFixed(0)}%
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Settings className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spending Trends</CardTitle>
              <CardDescription>
                Cost trends and projections over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Cost trend charts would go here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
