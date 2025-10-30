import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Additional utility functions for the application
export function fetcher(url: string) {
  return fetch(url).then((res) => res.json());
}

export function fetchWithErrorHandlers(url: string, options?: RequestInit) {
  return fetch(url, options).then(async (res) => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  });
}

export function getDocumentTimestampByIndex(documents: any[], index: number): string {
  if (!documents || !documents[index]) return '';
  return new Date(documents[index].createdAt || Date.now()).toLocaleString();
}

export function getTextFromMessage(message: any): string {
  if (typeof message === 'string') return message;
  if (message?.content) return message.content;
  if (message?.text) return message.text;
  return '';
}

export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}