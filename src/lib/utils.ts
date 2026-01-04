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

/**
 * Formats a number to 3 decimal places.
 * Returns '-' for null, undefined, or empty values.
 * Returns the original string for non-numeric values.
 */
export function formatNumber(value: any): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toFixed(3);
}

/**
 * Rounds a number to 3 decimal places for calculations.
 * Use this when storing/computing values that need 3 decimal precision.
 */
export function roundTo3Decimals(value: number): number {
  return Math.round(value * 1000) / 1000;
}
