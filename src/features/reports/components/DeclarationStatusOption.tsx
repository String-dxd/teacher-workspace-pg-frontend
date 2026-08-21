import { cn } from '~/lib/utils';

interface DeclarationStatusOptionProps {
  name: string;
  value: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Full-width selectable row — a plainer, single-line sibling of
 * ResponseTypeSelector's preview-card grid. Reuses that component's
 * selected-state colour convention (border-primary + primary/[0.04] tint)
 * at row density instead of a 2-column card grid, since this is a plain
 * binary choice with no preview to show.
 */
function DeclarationStatusOption({
  name,
  value,
  label,
  selected,
  onSelect,
}: DeclarationStatusOptionProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
        'hover:border-input hover:bg-muted',
        selected ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/20' : 'border-border',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onSelect}
        className="h-4 w-4 accent-primary"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export { DeclarationStatusOption };
export type { DeclarationStatusOptionProps };
