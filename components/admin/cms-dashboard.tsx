/**
 * CMS Dashboard Component
 * Complete content management system for FAQs and content
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
import { Textarea } from '@/components/ui/textarea';
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
  FileText,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  EyeOff,
  Star,
  Tag,
  Calendar,
  User,
  BarChart3,
} from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  priority: 'low' | 'medium' | 'high';
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CMSStats {
  totalFAQs: number;
  publishedFAQs: number;
  draftFAQs: number;
  totalViews: number;
  averageRating: number;
  topCategories: Array<{
    category: string;
    count: number;
  }>;
}

interface CMSDashboardProps {
  tenantId: string;
  companyName?: string;
}

export function CMSDashboard({
  tenantId,
  companyName = 'Amerivet',
}: CMSDashboardProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [stats, setStats] = useState<CMSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [activeTab, setActiveTab] = useState('faqs');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);

  // Form state for creating/editing FAQs
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    tags: [] as string[],
    isPublic: false,
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // Mock data for demonstration
  const mockFAQs: FAQ[] = [
    {
      id: '1',
      question: 'What health insurance plans are available?',
      answer: 'We offer three health insurance plans: Basic HMO, Enhanced HMO, and PPO. Each plan has different coverage levels and costs.',
      category: 'Health Insurance',
      tags: ['health', 'insurance', 'coverage'],
      isPublic: true,
      priority: 'high',
      viewCount: 45,
      helpfulCount: 38,
      notHelpfulCount: 7,
      createdBy: 'admin@amerivet.com',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
    },
    {
      id: '2',
      question: 'How do I enroll in dental coverage?',
      answer: 'You can enroll in dental coverage during open enrollment or within 30 days of a qualifying life event. Visit the benefits portal or contact HR.',
      category: 'Dental',
      tags: ['dental', 'enrollment', 'coverage'],
      isPublic: true,
      priority: 'medium',
      viewCount: 32,
      helpfulCount: 28,
      notHelpfulCount: 4,
      createdBy: 'admin@amerivet.com',
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-18T11:15:00Z',
    },
    {
      id: '3',
      question: 'What is the retirement plan matching?',
      answer: 'We match 50% of your 401(k) contributions up to 6% of your salary. This means if you contribute 6%, we add an additional 3%.',
      category: 'Retirement',
      tags: ['retirement', '401k', 'matching'],
      isPublic: true,
      priority: 'high',
      viewCount: 28,
      helpfulCount: 25,
      notHelpfulCount: 3,
      createdBy: 'admin@amerivet.com',
      createdAt: '2024-01-05T14:00:00Z',
      updatedAt: '2024-01-15T16:45:00Z',
    },
  ];

  const mockStats: CMSStats = {
    totalFAQs: 23,
    publishedFAQs: 18,
    draftFAQs: 5,
    totalViews: 1247,
    averageRating: 4.2,
    topCategories: [
      { category: 'Health Insurance', count: 8 },
      { category: 'Dental', count: 5 },
      { category: 'Retirement', count: 4 },
      { category: 'Vision', count: 3 },
      { category: 'Life Insurance', count: 3 },
    ],
  };

  // Fetch FAQs and stats
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API calls
      // const [faqsResponse, statsResponse] = await Promise.all([
      //   fetch(`/api/admin/faqs?tenantId=${tenantId}`),
      //   fetch(`/api/admin/cms/stats?tenantId=${tenantId}`)
      // ]);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setFaqs(mockFAQs);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch CMS data:', error);
      setFaqs(mockFAQs);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter FAQs based on search and filters
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesPriority = selectedPriority === 'all' || faq.priority === selectedPriority;
    
    return matchesSearch && matchesCategory && matchesPriority;
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingFAQ) {
        // Update existing FAQ
        const updatedFAQ = {
          ...editingFAQ,
          ...formData,
          updatedAt: new Date().toISOString(),
        };
        
        setFaqs(prev => prev.map(faq => faq.id === editingFAQ.id ? updatedFAQ : faq));
        setEditingFAQ(null);
      } else {
        // Create new FAQ
        const newFAQ: FAQ = {
          id: Date.now().toString(),
          ...formData,
          viewCount: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
          createdBy: 'admin@amerivet.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setFaqs(prev => [newFAQ, ...prev]);
      }
      
      // Reset form
      setFormData({
        question: '',
        answer: '',
        category: '',
        tags: [],
        isPublic: false,
        priority: 'medium',
      });
      
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to save FAQ:', error);
    }
  };

  // Handle delete FAQ
  const handleDelete = async (faqId: string) => {
    if (confirm('Are you sure you want to delete this FAQ?')) {
      setFaqs(prev => prev.filter(faq => faq.id !== faqId));
    }
  };

  // Handle edit FAQ
  const handleEdit = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags,
      isPublic: faq.isPublic,
      priority: faq.priority,
    });
    setIsCreateDialogOpen(true);
  };

  // Export FAQs to CSV
  const exportToCSV = () => {
    const csvData = [
      ['Question', 'Answer', 'Category', 'Tags', 'Priority', 'Public', 'Views', 'Helpful', 'Not Helpful', 'Created', 'Updated'],
      ...filteredFAQs.map(faq => [
        faq.question,
        faq.answer,
        faq.category,
        faq.tags.join(';'),
        faq.priority,
        faq.isPublic ? 'Yes' : 'No',
        faq.viewCount.toString(),
        faq.helpfulCount.toString(),
        faq.notHelpfulCount.toString(),
        new Date(faq.createdAt).toLocaleDateString(),
        new Date(faq.updatedAt).toLocaleDateString(),
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faqs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading CMS data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Management System</h1>
          <p className="text-muted-foreground">
            Manage FAQs, content, and knowledge base for {companyName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="size-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
                New FAQ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingFAQ ? 'Edit FAQ' : 'Create New FAQ'}
                </DialogTitle>
                <DialogDescription>
                  {editingFAQ ? 'Update the FAQ information below.' : 'Add a new FAQ to the knowledge base.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Question</label>
                  <Input
                    value={formData.question}
                    onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="Enter the question..."
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Answer</label>
                  <Textarea
                    value={formData.answer}
                    onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                    placeholder="Enter the answer..."
                    rows={4}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Health Insurance">Health Insurance</SelectItem>
                        <SelectItem value="Dental">Dental</SelectItem>
                        <SelectItem value="Vision">Vision</SelectItem>
                        <SelectItem value="Retirement">Retirement</SelectItem>
                        <SelectItem value="Life Insurance">Life Insurance</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Tags (comma-separated)</label>
                  <Input
                    value={formData.tags.join(', ')}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    }))}
                    placeholder="health, insurance, coverage"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="isPublic" className="text-sm font-medium">
                    Make this FAQ public
                  </label>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingFAQ ? 'Update FAQ' : 'Create FAQ'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total FAQs</CardTitle>
              <FileText className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFAQs}</div>
              <p className="text-xs text-muted-foreground">
                {stats.publishedFAQs} published, {stats.draftFAQs} drafts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                All time views
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}/5</div>
              <p className="text-xs text-muted-foreground">
                User satisfaction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <Eye className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.publishedFAQs}</div>
              <p className="text-xs text-muted-foreground">
                Live FAQs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
              <EyeOff className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.draftFAQs}</div>
              <p className="text-xs text-muted-foreground">
                Pending review
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="faqs" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
                <Input
                  placeholder="Search FAQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Health Insurance">Health Insurance</SelectItem>
                <SelectItem value="Dental">Dental</SelectItem>
                <SelectItem value="Vision">Vision</SelectItem>
                <SelectItem value="Retirement">Retirement</SelectItem>
                <SelectItem value="Life Insurance">Life Insurance</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* FAQs Table */}
          <Card>
            <CardHeader>
              <CardTitle>FAQs ({filteredFAQs.length})</CardTitle>
              <CardDescription>
                Manage your frequently asked questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFAQs.map((faq) => (
                    <TableRow key={faq.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-xs truncate">
                          {faq.question}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{faq.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            faq.priority === 'high' ? 'destructive' :
                            faq.priority === 'medium' ? 'default' : 'secondary'
                          }
                        >
                          {faq.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={faq.isPublic ? 'default' : 'secondary'}>
                          {faq.isPublic ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>{faq.viewCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">
                            {faq.helpfulCount > 0 ? 
                              ((faq.helpfulCount / (faq.helpfulCount + faq.notHelpfulCount)) * 5).toFixed(1) : 
                              'N/A'
                            }
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(faq)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(faq.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>FAQ Analytics</CardTitle>
              <CardDescription>
                Insights into FAQ performance and usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Analytics charts would go here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Management</CardTitle>
              <CardDescription>
                Manage FAQ categories and organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.topCategories.map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{category.category}</h3>
                        <p className="text-sm text-muted-foreground">{category.count} FAQs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="size-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="size-4 mr-2" />
                        Analytics
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
