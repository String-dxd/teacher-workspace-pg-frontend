import { fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  EntitySelector,
  type EntityItem,
  type EntityScope,
  type SearchResults,
  type SelectedEntity,
} from './EntitySelector';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const CLASS_4A: EntityItem = {
  id: 'class-4a',
  label: '4A',
  type: 'group',
  groupType: 'class',
  count: 2,
  memberNames: ['Ahmad', 'Chen'],
  memberDetails: [{ name: 'Ahmad' }, { name: 'Chen' }],
};

const CLASS_4B: EntityItem = {
  id: 'class-4b',
  label: '4B',
  type: 'group',
  groupType: 'class',
  count: 1,
  memberNames: ['Priya'],
  memberDetails: [{ name: 'Priya' }],
};

const CCA_CHOIR: EntityItem = {
  id: 'cca-choir',
  label: 'Choir',
  type: 'group',
  groupType: 'cca',
  count: 1,
};

const STUDENT_AHMAD: EntityItem = {
  id: 'stu-ahmad',
  label: 'Ahmad bin Ibrahim',
  sublabel: '4A',
  type: 'individual',
};

const SCOPES: EntityScope[] = [
  { id: 'classes', label: 'Classes', items: [CLASS_4A, CLASS_4B] },
  { id: 'ccas', label: 'CCAs', items: [CCA_CHOIR] },
];

function searchFn(query: string): SearchResults {
  const q = query.toLowerCase();
  if (!q) return { groups: [], individuals: [] };
  return {
    groups: [CLASS_4A, CLASS_4B].filter((g) => g.label.toLowerCase().includes(q)),
    individuals: [STUDENT_AHMAD].filter((i) => i.label.toLowerCase().includes(q)),
  };
}

type SelectorProps = React.ComponentProps<typeof EntitySelector>;

/**
 * Renders the selector controlled, holding `value` in the harness the way the
 * real consumers do — the component reads its own selection back on every
 * render, so a static prop would hide reconciliation bugs.
 */
function setup({ value: initial = [], ...props }: Partial<SelectorProps> = {}) {
  const onChange = vi.fn();

  function Harness() {
    const [value, setValue] = React.useState<SelectedEntity[]>(initial);
    return (
      <EntitySelector
        scopes={SCOPES}
        searchFn={searchFn}
        placeholder="Search…"
        {...props}
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    );
  }

  render(<Harness />);
  return { onChange };
}

/**
 * Base UI opens the popup off the pointer sequence, not a bare synthetic
 * `click`, so drive the whole sequence the way a real pointer would.
 */
function comboboxInput() {
  return screen.getByRole('combobox');
}

function openPanel() {
  const input = comboboxInput();
  fireEvent.pointerDown(input);
  fireEvent.mouseDown(input);
  fireEvent.pointerUp(input);
  fireEvent.mouseUp(input);
  fireEvent.click(input);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('EntitySelector', () => {
  describe('combobox semantics', () => {
    it('puts role=combobox on the input, not a wrapper div', () => {
      setup();
      const input = comboboxInput();
      expect(input.tagName).toBe('INPUT');
      expect(input).toHaveAttribute('role', 'combobox');
      // The pre-rewrite version put the role on a div, which announced a
      // widget contract it could not keep.
      expect(document.querySelectorAll('div[role="combobox"]')).toHaveLength(0);
    });

    it('wires aria-controls to a real listbox once open', () => {
      setup();
      openPanel();
      const input = comboboxInput();
      const listbox = screen.getByRole('listbox');
      expect(input).toHaveAttribute('aria-expanded', 'true');
      expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    });

    it('exposes each row as an option with a selected state', () => {
      setup();
      openPanel();
      const options = screen.getAllByRole('option');
      expect(options.map((o) => o.textContent)).toEqual(
        expect.arrayContaining([expect.stringContaining('4A')]),
      );
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('selection', () => {
    it('adds the clicked entity', () => {
      const { onChange } = setup();
      openPanel();
      fireEvent.click(screen.getByRole('option', { name: /4A/ }));
      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'class-4a', label: '4A', count: 2 }),
      ]);
    });

    it('accumulates across multiple picks', () => {
      const { onChange } = setup();
      openPanel();
      fireEvent.click(screen.getByRole('option', { name: /4A/ }));
      fireEvent.click(screen.getByRole('option', { name: /4B/ }));
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ id: 'class-4a' }),
        expect.objectContaining({ id: 'class-4b' }),
      ]);
    });

    it('keeps only the last pick when multiSelect is off', () => {
      const { onChange } = setup({ multiSelect: false });
      openPanel();
      fireEvent.click(screen.getByRole('option', { name: /4A/ }));
      openPanel();
      fireEvent.click(screen.getByRole('option', { name: /4B/ }));
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'class-4b' })]);
    });
  });

  describe('locked entities', () => {
    const locked = new Set(['class-4a']);
    const preset: SelectedEntity[] = [
      { id: 'class-4a', label: '4A', type: 'group', count: 2 },
      { id: 'class-4b', label: '4B', type: 'group', count: 1 },
    ];

    it('renders no remove control on a locked chip', () => {
      setup({ value: preset, nonRemovableIds: locked, chipsBelow: true });
      expect(screen.queryByRole('button', { name: 'Remove 4A' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove 4B' })).toBeInTheDocument();
    });

    it('keeps locked entities when Clear all is pressed', () => {
      const { onChange } = setup({ value: preset, nonRemovableIds: locked, chipsBelow: true });
      fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
      expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 'class-4a' })]);
    });

    it('will not let a locked entity be deselected from the list', () => {
      const { onChange } = setup({ value: preset, nonRemovableIds: locked, chipsBelow: true });
      openPanel();
      fireEvent.click(screen.getByRole('option', { name: /4A/ }));
      // Either the option refuses the click outright, or the reconciler puts
      // the locked entity straight back — never a selection without it.
      for (const call of onChange.mock.calls) {
        expect(call[0]).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: 'class-4a' })]),
        );
      }
    });
  });

  describe('group members', () => {
    it('excludes a single member and reports it on the entity', () => {
      const { onChange } = setup({
        value: [
          {
            id: 'class-4a',
            label: '4A',
            type: 'group',
            count: 2,
            memberNames: CLASS_4A.memberNames,
          },
        ],
        chipsBelow: true,
      });
      openPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Show members of 4A' }));
      fireEvent.click(screen.getByRole('button', { name: /Chen/ }));
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ id: 'class-4a', excludedMemberNames: ['Chen'] }),
      ]);
    });

    it('drops the group once every member is excluded', () => {
      const { onChange } = setup({
        value: [
          {
            id: 'class-4b',
            label: '4B',
            type: 'group',
            count: 1,
            memberNames: CLASS_4B.memberNames,
          },
        ],
        chipsBelow: true,
      });
      openPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Show members of 4B' }));
      fireEvent.click(screen.getByRole('button', { name: /Priya/ }));
      expect(onChange).toHaveBeenLastCalledWith([]);
    });
  });

  describe('browsing and searching', () => {
    it('switches the visible rows when a scope tab is picked', () => {
      setup();
      openPanel();
      expect(screen.getByRole('option', { name: /4A/ })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'CCAs' }));
      expect(screen.queryByRole('option', { name: /4A/ })).not.toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Choir/ })).toBeInTheDocument();
    });

    it('renders searchFn results, grouped, once a query is typed', () => {
      setup();
      openPanel();
      fireEvent.change(comboboxInput(), { target: { value: 'ahmad' } });
      expect(screen.getByText('Individuals')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Ahmad bin Ibrahim/ })).toBeInTheDocument();
    });

    it('shows the no-results copy when the query matches nothing', () => {
      setup({ noResultsText: 'Nothing here' });
      openPanel();
      fireEvent.change(comboboxInput(), { target: { value: 'zzzz' } });
      expect(screen.getByText('Nothing here')).toBeInTheDocument();
    });
  });

  describe('chips', () => {
    it('removes the entity behind the chip', () => {
      const { onChange } = setup({
        value: [{ id: 'class-4a', label: '4A', type: 'group', count: 2 }],
        chipsBelow: true,
      });
      fireEvent.click(screen.getByRole('button', { name: 'Remove 4A' }));
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('collapses chips past maxVisibleTokens behind a "+N more" control', () => {
      setup({
        value: [
          { id: 'a', label: 'A', type: 'group', count: 1 },
          { id: 'b', label: 'B', type: 'group', count: 1 },
          { id: 'c', label: 'C', type: 'group', count: 1 },
        ],
        maxVisibleTokens: 2,
      });
      const more = screen.getByRole('button', { name: '+1 more' });
      fireEvent.click(more);
      expect(screen.queryByRole('button', { name: '+1 more' })).not.toBeInTheDocument();
    });

    it('hides chips entirely when hideChips is set', () => {
      setup({ value: [{ id: 'class-4a', label: '4A', type: 'group', count: 2 }], hideChips: true });
      expect(screen.queryByRole('button', { name: 'Remove 4A' })).not.toBeInTheDocument();
    });
  });

  describe('openOnFocus', () => {
    it('does not open on click when disabled', () => {
      setup({ openOnFocus: false });
      openPanel();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('still opens once the user types', () => {
      setup({ openOnFocus: false });
      fireEvent.change(comboboxInput(), { target: { value: '4' } });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });
});
