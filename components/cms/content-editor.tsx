'use client';

/**
 * CMS Content Editor
 * Rich text editor for benefit plan content management using TipTap
 */

import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CMSEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  onSave?: (content: string) => void;
}

export function CMSEditor({ initialContent = '', onChange, onSave }: CMSEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[400px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;

    const url = window.prompt('Image URL');

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor) return;

    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const handleSave = () => {
    if (!editor) return;
    const html = editor.getHTML();
    onSave?.(html);
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Content Editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="border rounded-lg p-2 flex flex-wrap gap-1">
          {/* Text Formatting */}
          <div className="flex gap-1 border-r pr-2">
            <Button
              size="sm"
              variant={editor.isActive('bold') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
              </svg>
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('italic') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <line x1="19" y1="4" x2="10" y2="4" />
                <line x1="14" y1="20" x2="5" y2="20" />
                <line x1="15" y1="4" x2="9" y2="20" />
              </svg>
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('strike') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <line x1="4" y1="12" x2="20" y2="12" />
                <path d="M17 5H3" />
                <path d="M21 19H5" />
              </svg>
            </Button>
          </div>

          {/* Headings */}
          <div className="flex gap-1 border-r pr-2">
            <Button
              size="sm"
              variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
            >
              H1
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
            >
              H2
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
            >
              H3
            </Button>
          </div>

          {/* Lists */}
          <div className="flex gap-1 border-r pr-2">
            <Button
              size="sm"
              variant={editor.isActive('bulletList') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet List"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <circle cx="4" cy="6" r="1" />
                <circle cx="4" cy="12" r="1" />
                <circle cx="4" cy="18" r="1" />
              </svg>
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('orderedList') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numbered List"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <line x1="10" y1="6" x2="21" y2="6" />
                <line x1="10" y1="12" x2="21" y2="12" />
                <line x1="10" y1="18" x2="21" y2="18" />
                <path d="M4 6h1v4" />
                <path d="M4 10h2" />
                <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
              </svg>
            </Button>
          </div>

          {/* Special Elements */}
          <div className="flex gap-1 border-r pr-2">
            <Button
              size="sm"
              variant="outline"
              onClick={setLink}
              title="Insert Link"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={addImage}
              title="Insert Image"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={addTable}
              title="Insert Table"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M3 3h18v18H3z" />
                <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
              </svg>
            </Button>
            <Button
              size="sm"
              variant={editor.isActive('blockquote') ? 'default' : 'outline'}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Blockquote"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
              </svg>
            </Button>
          </div>

          {/* Undo/Redo */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="border rounded-lg min-h-[400px] bg-background">
          <EditorContent editor={editor} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => editor.commands.clearContent()}>
            Clear
          </Button>
          <Button onClick={handleSave}>
            Save Content
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Document Template Selector
 */
export function DocumentTemplateSelector({ onSelect }: { onSelect: (template: string) => void }) {
  const templates = {
    'Benefit Plan Summary': `
<h1>Benefit Plan Summary</h1>
<h2>Plan Overview</h2>
<p>This document outlines the key features and benefits of your benefit plan.</p>

<h2>Coverage Details</h2>
<ul>
  <li>Medical Coverage</li>
  <li>Dental Coverage</li>
  <li>Vision Coverage</li>
</ul>

<h2>Costs</h2>
<table>
  <thead>
    <tr>
      <th>Coverage Type</th>
      <th>Employee Cost</th>
      <th>Employer Contribution</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Medical</td>
      <td>$150/month</td>
      <td>$350/month</td>
    </tr>
  </tbody>
</table>
    `,
    'Policy Document': `
<h1>Company Policy</h1>
<h2>1. Purpose</h2>
<p>This policy establishes guidelines for...</p>

<h2>2. Scope</h2>
<p>This policy applies to all employees...</p>

<h2>3. Procedures</h2>
<ol>
  <li>Step one</li>
  <li>Step two</li>
  <li>Step three</li>
</ol>
    `,
    'FAQ Document': `
<h1>Frequently Asked Questions</h1>

<h3>Q: How do I enroll in benefits?</h3>
<p>A: You can enroll during the open enrollment period...</p>

<h3>Q: When does my coverage start?</h3>
<p>A: Coverage begins on the first day of the month following your enrollment...</p>

<h3>Q: Can I change my plan mid-year?</h3>
<p>A: Plan changes are only allowed during open enrollment or qualifying life events...</p>
    `,
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Object.entries(templates).map(([name, template]) => (
        <Card key={name} className="cursor-pointer hover:border-primary transition-colors" onClick={() => onSelect(template)}>
          <CardHeader>
            <CardTitle className="text-base">{name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Start with a pre-built {name.toLowerCase()} template
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
