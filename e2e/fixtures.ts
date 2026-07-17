import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Runs an accessibility check against the current page and asserts no
 * WCAG 2.1 A/AA violations. Scoped to this feature's own tests — call it
 * explicitly after navigating to a scenario under test, not wired globally,
 * since the rest of the app has pre-existing violations out of scope here.
 */
export async function checkA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations, describeViolations(results.violations)).toEqual([]);
}

function describeViolations(violations: import('axe-core').Result[]): string {
  if (violations.length === 0) return '';
  return violations
    .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
    .join('\n');
}
