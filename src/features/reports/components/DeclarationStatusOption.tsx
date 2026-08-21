import { RadioGroupCard, RadioGroupCardIndicator } from '~/components/ui';
import { cn } from '~/lib/utils';

interface DeclarationStatusOptionProps {
  value: string;
  label: string;
  selected: boolean;
}

/**
 * Full-width selectable row — a plainer, single-line sibling of
 * ResponseTypeSelector's preview-card grid. Reuses that component's
 * selected-state colour convention (border-primary + primary/[0.04] tint)
 * at row density instead of a 2-column card grid, since this is a plain
 * binary choice with no preview to show.
 */
function DeclarationStatusOption({ value, label, selected }: DeclarationStatusOptionProps) {
  return (
    <RadioGroupCard
      value={value}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3',
        'hover:border-input hover:bg-muted',
        selected ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/20' : 'border-border',
      )}
    >
      <RadioGroupCardIndicator className="size-4" />
      <span className="text-sm">{label}</span>
    </RadioGroupCard>
  );
}

export { DeclarationStatusOption };
export type { DeclarationStatusOptionProps };
