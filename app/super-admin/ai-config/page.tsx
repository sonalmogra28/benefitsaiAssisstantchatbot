'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { logger, logError } from '@/lib/logger';
import { Control, FieldPath, FieldValues } from 'react-hook-form';

import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'; // Assuming form components exist

// Define the validation schema with Zod
const aiConfigSchema = z.object({
  personality: z
    .string()
    .min(10, 'Personality must be at least 10 characters.'),
  tone: z.enum(['formal', 'friendly', 'neutral', 'humorous']),
  // Example of a more complex field
  responseLength: z.number().min(50).max(500),
});

// Infer the TypeScript type from the schema
type AiConfigFormValues = z.infer<typeof aiConfigSchema>;

/**
 * Renders the AI Configuration page for the Super Admin.
 * This page contains the form to manage the AI's personality and tone.
 */
export default function AiConfigPage() {
  // We can add state for loading and feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<AiConfigFormValues>({
    resolver: zodResolver(aiConfigSchema),
    // Default values can be fetched from the API
    defaultValues: {
      personality: 'You are a helpful and friendly benefits assistant.',
      tone: 'friendly',
      responseLength: 250,
    },
  });

  // Load existing AI configuration
  useEffect(() => {
    loadAIConfig();
  }, [form]);

  const loadAIConfig = async () => {
    try {
      const response = await fetch('/api/super-admin/ai-config');
      const result = await response.json();
      
      if (result.success && result.data) {
        const config = result.data;
        form.reset({
          personality: config.personality,
          tone: config.tone,
          responseLength: config.responseLength,
          // model: config.model, // Removed - not in form schema
          // temperature: config.temperature, // Removed - not in form schema
          // maxTokens: config.maxTokens, // Removed - not in form schema
          // systemPrompt: config.systemPrompt, // Removed - not in form schema
          // enabledFeatures: config.enabledFeatures // Removed - not in form schema
        });
        logger.info({}, 'AI config loaded successfully');
      } else {
        logger.warn({ data: result.error }, 'Failed to load AI config:');
      }
    } catch (error) {
      logError('Error loading AI config:', error);
    }
  };

  const onSubmit = async (data: AiConfigFormValues) => {
    setIsLoading(true);
    setIsSuccess(false);
    logger.info({ data }, 'Submitting AI config');

    try {
      const response = await fetch('/api/super-admin/ai-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setIsSuccess(true);
        logger.info({}, 'AI config saved successfully');
      } else {
        logger.error({ data: result.error }, 'Failed to save AI config:');
        // You could add error state handling here
      }
    } catch (error) {
      logError('Error saving AI config:', error);
      // You could add error state handling here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Heading
        title="AI Configuration"
        description="Manage the chatbot's personality, tone, and response style."
      />
      <Card>
        <CardHeader>
          <CardTitle>AI Behavior Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                name="personality"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Personality</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="Describe the AI&apos;s personality..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This is the core instruction that defines the AI&apos;s
                      character.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="tone"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Tone</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="humorous">Humorous</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The default tone of the AI&apos;s responses.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="responseLength"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Response Length</FormLabel>
                    <FormControl>
                      <input
                        type="number"
                        min="50"
                        max="500"
                        placeholder="250"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </FormControl>
                    <FormDescription>
                      The preferred length of AI responses in characters (50-500).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Configuration'}
              </Button>
              {isSuccess && (
                <p className="text-green-500">Settings saved successfully!</p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
