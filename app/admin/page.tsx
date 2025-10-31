'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../context/auth-context';
import { useRouter } from 'next/navigation';
import { logger } from '../../lib/logger';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import {
  Users,
  FileText,
  Building2,
  BarChart3,
  Settings,
  Activity,
  Database,
  Shield,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

const BenefitsDashboard = dynamic(
  () => import('../../components/benefits-dashboard').then((mod) => mod.BenefitsDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Loading benefits insights...
      </div>
    ),
  },
);

interface SystemStats {
  totalUsers: number;
  totalCompanies: number;
  totalDocuments: number;
  activeSessions: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastBackup: string;
  storageUsed: number;
  storageTotal: number;
}

interface RecentActivity {
  id: string;
  type: 'user_login' | 'document_upload' | 'company_created' | 'error' | 'backup';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
}

export default function AdminDashboard() {
  const { account, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !account) {
      router.push('/login');
      return;
    }
  }, [account, loading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        // TODO: Replace with actual API calls
        // const response = await fetch('/api/admin/stats');
        // const data = await response.json();
        
        // Mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStats({
          totalUsers: 1247,
          totalCompanies: 23,
          totalDocuments: 1843,
          activeSessions: 45,
          systemHealth: 'healthy',
          lastBackup: '2024-01-20T14:30:00Z',
          storageUsed: 2.3,
          storageTotal: 10.0,
        });

        setRecentActivity([
          {
            id: '1',
            type: 'user_login',
            message: 'New user registered: john.doe@company.com',
            timestamp: '2024-01-20T15:30:00Z',
            severity: 'info',
          },
          {
            id: '2',
            type: 'document_upload',
            message: 'Document uploaded: benefits-guide-2024.pdf',
            timestamp: '2024-01-20T15:25:00Z',
            severity: 'info',
          },
          {
            id: '3',
            type: 'company_created',
            message: 'New company registered: TechCorp Inc.',
            timestamp: '2024-01-20T15:20:00Z',
            severity: 'info',
          },
          {
            id: '4',
            type: 'backup',
            message: 'Daily backup completed successfully',
            timestamp: '2024-01-20T14:30:00Z',
            severity: 'info',
          },
          {
            id: '5',
            type: 'error',
            message: 'Failed to process document: corrupted-file.pdf',
            timestamp: '2024-01-20T14:15:00Z',
            severity: 'warning',
          },
        ]);
      } catch (error) {
        logger.error('Failed to fetch admin stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (account) {
      fetchStats();
    }
  }, [account]);

  if (loading || loadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return null;
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="size-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="size-4 text-yellow-500" />;
      default:
        return <CheckCircle className="size-4 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-green-600 bg-green-50';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and management for {account?.name || 'Admin'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={stats?.systemHealth === 'healthy' ? 'default' : 'destructive'}
            className="flex items-center gap-1"
          >
            <Activity className="size-3" />
            {stats?.systemHealth === 'healthy' ? 'System Healthy' : 'System Issues'}
          </Badge>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    +12% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Companies</CardTitle>
                  <Building2 className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCompanies}</div>
                  <p className="text-xs text-muted-foreground">
                    +2 this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documents</CardTitle>
                  <FileText className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDocuments.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    +8% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                  <Activity className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeSessions}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently online
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 size-4" />
                  Manage Users
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="mr-2 size-4" />
                  Manage Companies
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 size-4" />
                  View Documents
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="mr-2 size-4" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Current system health and metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">System Health</span>
                  <Badge variant={stats?.systemHealth === 'healthy' ? 'default' : 'destructive'}>
                    {stats?.systemHealth === 'healthy' ? 'Healthy' : 'Issues Detected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Storage Usage</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.storageUsed}GB / {stats?.storageTotal}GB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Backup</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.lastBackup ? new Date(stats.lastBackup).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Benefits Snapshot</CardTitle>
              <CardDescription>Live employee metrics powered by the benefits API</CardDescription>
            </CardHeader>
            <CardContent>
              <BenefitsDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system events and user actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getSeverityIcon(activity.severity)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={getSeverityColor(activity.severity)}>
                      {activity.type.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Database Status</CardTitle>
                <CardDescription>Database health and performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connection Status</span>
                  <Badge variant="default">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Response Time</span>
                  <span className="text-sm text-muted-foreground">45ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Connections</span>
                  <span className="text-sm text-muted-foreground">12/100</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Status</CardTitle>
                <CardDescription>File storage and backup status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Storage Used</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.storageUsed}GB / {stats?.storageTotal}GB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Backup Status</span>
                  <Badge variant="default">Up to Date</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Backup</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.lastBackup ? new Date(stats.lastBackup).toLocaleString() : 'Never'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Comments & Notes</CardTitle>
              <CardDescription>Administrative comments and system notes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <MessageSquare className="size-5 text-blue-500 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">System Maintenance</span>
                      <Badge variant="outline">Info</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Scheduled maintenance completed successfully. All systems are running normally.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <AlertTriangle className="size-5 text-yellow-500 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">Storage Warning</span>
                      <Badge variant="outline" className="text-yellow-600 bg-yellow-50">Warning</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(Date.now() - 86400000).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Storage usage is approaching 80% capacity. Consider cleaning up old files or upgrading storage plan.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <CheckCircle className="size-5 text-green-500 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">Security Update</span>
                      <Badge variant="outline" className="text-green-600 bg-green-50">Success</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(Date.now() - 172800000).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Security patches applied successfully. All systems are up to date and secure.
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <div className="text-center">
                    <MessageSquare className="size-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Add a new comment or note
                    </p>
                    <Button variant="outline" size="sm">
                      Add Comment
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
