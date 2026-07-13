import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Ms Tan Wei Ling" → "Tan Wei Ling" — post pages show names without salutations. */
export function stripSalutation(name: string): string {
  return name.replace(/^(Mrs?\.?|Ms\.?|Miss|Mdm\.?|Dr\.?|Prof\.?)\s+/i, '');
}
