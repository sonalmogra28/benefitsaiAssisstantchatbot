// lib/config.ts
export const APP_NAME = process.env.APP_NAME ?? "Benefits Assistant";
export const DEFAULT_COMPANY_ID = process.env.DEFAULT_COMPANY_ID ?? "amerivet";
export const COMPANY_NAME = "AmeriVet";

// AI Configuration
export const AI_NAME = "Benefits Assistant";
export const AI_COMPANY_NAME = "AmeriVet";

// Azure Storage Configuration
export const AZURE_BLOB_CONTAINER_DOCUMENTS = process.env.AZURE_BLOB_CONTAINER_DOCUMENTS || "documents";
export const AZURE_BLOB_CONTAINER_IMAGES = process.env.AZURE_BLOB_CONTAINER_IMAGES || "images";

// Document Categories
export const DOCUMENT_CATEGORIES = {
  BENEFIT_GUIDE: "benefit-guide",
  FAQ: "faq",
  POLICY: "policy",
  FORM: "form"
} as const;

// System Prompts
export const getSystemPrompt = () => `
You are ${AI_NAME} for ${AI_COMPANY_NAME}. Help employees with benefits, policies, and FAQs.
Be concise and accurate. If unsure, ask for the document name or category (benefit-guide or faq).
Always provide helpful, accurate information based on the available documentation.
`;
