'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { CMSEditor, DocumentTemplateSelector } from '../cms/content-editor';

const ADMIN_API_TOKEN = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || 'demo-admin-token';

const categories = [
  { value: 'medical', label: 'Medical Benefits' },
  { value: 'dental', label: 'Dental' },
  { value: 'vision', label: 'Vision' },
  { value: '401k', label: 'Retirement / 401k' },
  { value: 'pto', label: 'Paid Time Off' },
  { value: 'other', label: 'Other' },
] as const;

type Category = (typeof categories)[number]['value'];
type PublishStatus = 'draft' | 'published';

interface DocumentComposerProps {
  companyId: string;
  onCreated?: () => void;
}

export function DocumentComposer({ companyId, onCreated }: DocumentComposerProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('medical');
  const [status, setStatus] = useState<PublishStatus>('draft');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tags = useMemo(
    () =>
      tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tagsInput],
  );

  const hasMeaningfulContent = (value: string) => {
    const stripped = value.replace(/<[^>]*>/g, '').trim();
    return stripped.length > 0;
  };

  const resetEditor = () => {
    setContent('');
    setInitialContent('');
    setEditorKey((key) => key + 1);
  };

  const handleSubmit = async (contentOverride?: string) => {
    const payloadContent = contentOverride ?? content;

    setError(null);

    if (!title.trim()) {
      const message = 'Please provide a document title.';
      setError(message);
      toast.error(message);
      return;
    }

    if (!payloadContent || !hasMeaningfulContent(payloadContent)) {
      const message = 'Document content cannot be empty.';
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setSaving(true);

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ADMIN_API_TOKEN}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content: payloadContent,
          contentType: 'html',
          category,
          status,
          ...(tags.length > 0 ? { tags } : {}),
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to save document');
      }

      toast.success('Document saved to knowledge base.');
      setTitle('');
      setTagsInput('');
      setStatus('draft');
      resetEditor();
      onCreated?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save document.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSelect = (template: string) => {
    setInitialContent(template);
    setContent(template);
    setEditorKey((key) => key + 1);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Knowledge Base Content</CardTitle>
        <p className="text-sm text-muted-foreground">
          Draft rich benefit guides and publish them directly to the {companyId} tenant knowledge base.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="document-title">Document Title</Label>
            <Input
              id="document-title"
              placeholder="e.g. 2024 Medical Plan Overview"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-category">Category</Label>
            <select
              id="document-category"
              className="w-full rounded-md border px-3 py-2"
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
            >
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-status">Publish State</Label>
            <select
              id="document-status"
              className="w-full rounded-md border px-3 py-2"
              value={status}
              onChange={(event) => setStatus(event.target.value as PublishStatus)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-tags">Tags</Label>
            <Textarea
              id="document-tags"
              placeholder="Comma separated keywords (optional)"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Tags help the retrieval pipeline surface this document for relevant questions.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Jump Start With A Template</Label>
          <DocumentTemplateSelector onSelect={handleTemplateSelect} />
        </div>

        <CMSEditor
          key={editorKey}
          initialContent={initialContent}
          onChange={setContent}
          onSave={handleSubmit}
        />

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Saved documents become available to the AI once processing completes.
          </div>
          <Button onClick={() => handleSubmit()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Document'}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
