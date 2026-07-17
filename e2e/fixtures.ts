import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Runs an accessibility check and asserts no WCAG 2.1 A/AA violations.
 * Scoped to this feature's own tests — call it explicitly, not wired
 * globally, since the rest of the app has pre-existing violations out of
 * scope here. Pass `include` (a CSS selector) to scope the check to new
 * markup this feature adds — e.g. a dialog — rather than the whole page,
 * which would also drag in those pre-existing violations.
 */
export async function checkA11y(page: Page, include?: string): Promise<void> {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
  if (include) builder.include(include);
  const results = await builder.analyze();
  expect(results.violations, describeViolations(results.violations)).toEqual([]);
}

function describeViolations(violations: import('axe-core').Result[]): string {
  if (violations.length === 0) return '';
  return violations
    .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
    .join('\n');
}
