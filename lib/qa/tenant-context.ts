// Single source of truth for the tenant company display name.
// Each deployment sets COMPANY_NAME in its environment; falls back to 'AmeriVet'.
// When this codebase serves a second client, no QA file needs to change — only the env var.
export const COMPANY_NAME: string = process.env.COMPANY_NAME ?? 'AmeriVet';
