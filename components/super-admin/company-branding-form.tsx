'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getStorageServices } from '@/lib/azure/storage';
import { getContainer } from '@/lib/azure/cosmos-db';
import { Progress } from '@/components/ui/progress';
import { Upload, Palette, Settings, Eye, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyBranding {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  theme: 'light' | 'dark' | 'auto';
  customCss: string;
  updatedAt: string;
}

export function CompanyBrandingForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [branding, setBranding] = useState<CompanyBranding>({
    id: companyId,
    name: '',
    description: '',
    logoUrl: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    theme: 'light',
    customCss: '',
    updatedAt: new Date().toISOString(),
  });

  // Load existing branding data
  useEffect(() => {
    loadBrandingData();
  }, [companyId]);

  const loadBrandingData = async () => {
    try {
      setLoading(true);
      const container = await getContainer('companies');
      const { resource } = await container.item(companyId, companyId).read();
      
      if (resource) {
        setBranding({
          id: companyId,
          name: resource.name || '',
          description: resource.description || '',
          logoUrl: resource.logoUrl || '',
          primaryColor: resource.primaryColor || '#3B82F6',
          secondaryColor: resource.secondaryColor || '#10B981',
          theme: resource.theme || 'light',
          customCss: resource.customCss || '',
          updatedAt: resource.updatedAt || new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error loading branding data:', error);
      toast.error('Failed to load branding data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setFile(file);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setProgress(0);
      
      const storageServices = getStorageServices();
      const fileName = `logos/${companyId}/${file.name}`;
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const uploadResult = await storageServices.documents.uploadFile(
        Buffer.from(await file.arrayBuffer()),
        fileName,
        file.type
      );

      clearInterval(progressInterval);
      setProgress(100);

      setBranding(prev => ({
        ...prev,
        logoUrl: uploadResult.url,
      }));

      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const container = await getContainer('companies');
      await container.item(companyId, companyId).replace({
        ...branding,
        updatedAt: new Date().toISOString(),
      });

      toast.success('Branding updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save branding');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBranding(prev => ({
      ...prev,
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      theme: 'light',
      customCss: '',
    }));
    toast.info('Branding reset to defaults');
  };

  if (loading && !branding.name) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading branding data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
    <div>
          <h2 className="text-2xl font-bold">Company Branding</h2>
          <p className="text-muted-foreground">
            Customize your company's appearance and branding
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Basic company information and logo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={branding.name}
                    onChange={(e) => setBranding(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <select
                    id="theme"
                    value={branding.theme}
                    onChange={(e) => setBranding(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' | 'auto' }))}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  value={branding.description}
                  onChange={(e) => setBranding(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter company description"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  {branding.logoUrl && (
                    <div className="relative">
                      <img
                        src={branding.logoUrl}
                        alt="Company logo"
                        className="w-20 h-20 object-contain border rounded-lg"
                      />
                      <Badge className="absolute -top-2 -right-2">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Uploaded
                      </Badge>
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="mb-2"
                    />
                    {file && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          onClick={handleUpload}
                          disabled={loading}
                          size="sm"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Logo
                        </Button>
                        {progress > 0 && progress < 100 && (
                          <div className="space-y-1">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              Uploading... {progress}%
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
        </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Color Scheme
              </CardTitle>
              <CardDescription>
                Customize your company's color palette
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
          <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex items-center gap-2">
          <Input
            id="primaryColor"
            type="color"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={branding.primaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        placeholder="#10B981"
                        className="flex-1"
          />
        </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Color Preview</Label>
                  <div className="space-y-2">
                    <div
                      className="h-12 rounded-lg flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: branding.primaryColor }}
                    >
                      Primary Color
                    </div>
                    <div
                      className="h-12 rounded-lg flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: branding.secondaryColor }}
                    >
                      Secondary Color
                    </div>
                    <div className="h-12 rounded-lg flex items-center justify-center text-white font-medium bg-gray-600">
                      Neutral Color
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Colors
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>
                Configure the overall appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="themeMode">Theme Mode</Label>
                  <select
                    id="themeMode"
                    value={branding.theme}
                    onChange={(e) => setBranding(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' | 'auto' }))}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className={`p-4 rounded-lg border ${
                    branding.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                  }`}>
                    <p className="text-sm">Theme preview</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Customization</CardTitle>
              <CardDescription>
                Add custom CSS for advanced styling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customCss">Custom CSS</Label>
                <Textarea
                  id="customCss"
                  value={branding.customCss}
                  onChange={(e) => setBranding(prev => ({ ...prev, customCss: e.target.value }))}
                  placeholder="/* Add your custom CSS here */"
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use this to add custom styling. Be careful with syntax errors.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Mode */}
      {previewMode && (
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              See how your branding will look to users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6" style={{ backgroundColor: branding.theme === 'dark' ? '#1a1a1a' : '#ffffff' }}>
              <div className="flex items-center gap-4 mb-4">
                {branding.logoUrl && (
                  <img
                    src={branding.logoUrl}
                    alt="Logo"
                    className="h-12 w-12 object-contain"
                  />
                )}
                <div>
                  <h3 className="text-xl font-bold" style={{ color: branding.primaryColor }}>
                    {branding.name || 'Your Company'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {branding.description || 'Company description'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button style={{ backgroundColor: branding.primaryColor, color: 'white' }}>
                  Primary Button
                </Button>
                <Button variant="outline" style={{ borderColor: branding.secondaryColor, color: branding.secondaryColor }}>
                  Secondary Button
        </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
