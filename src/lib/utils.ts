import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a company name to a URL-safe slug.
 * - Trims whitespace
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters (keeps only alphanumeric and hyphens)
 * - Removes consecutive hyphens
 * - Removes leading/trailing hyphens
 */
export function slugifyCompany(company: string): string {
  if (!company) return '';

  return company
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '')     // Remove special characters
    .replace(/-+/g, '-')            // Remove consecutive hyphens
    .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
}

/**
 * Finds a company name from a list by comparing slugified versions.
 * Returns the original company name if found, null otherwise.
 */
export function findCompanyBySlug(slug: string, companies: string[]): string | null {
  if (!slug || !companies.length) return null;

  return companies.find(company => slugifyCompany(company) === slug) || null;
}
