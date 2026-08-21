import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronDown, Minus, User, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button, Toggle, ToggleGroup, ToggleGroupItem } from '~/components/ui';
import { cn } from '~/lib/utils';

// Ported from the design-teacher-workspace EntitySelector (PR #165), adapted
// for this MFE: desktop dropdown only (no mobile Sheet — the TW host shell is
// desktop-first), no create-group links, and DS tokens from index.css.

// ─── Types ──────────────────────────────────────────────────────────────────

export type GroupType =
  | 'class'
  | 'level'
  | 'school'
  | 'cca'
  | 'teaching'
  | 'custom'
  | 'department'
  | 'staff-group';

export interface MemberDetail {
  name: string;
  sublabel?: string; // e.g. "3A · tanml@school.edu.sg" for staff
  badge?: string; // right-aligned label (e.g. masked NRIC for students)
}

export interface EntityItem {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
  type: 'group' | 'individual';
  count?: number;
  memberNames?: string[]; // plain names for chip tooltips
  memberDetails?: MemberDetail[]; // richer per-member info for expanded list
  groupType?: GroupType;
}

export interface SelectedEntity {
  id: string;
  label: string;
  type: 'group' | 'individual';
  count: number;
  groupType?: GroupType;
  memberNames?: string[];
  excludedMemberNames?: string[];
}

export interface ScopeSection {
  label: string;
  items: EntityItem[];
}

export interface EntityScope {
  id: string;
  label: string;
  items: EntityItem[];
  sections?: ScopeSection[];
}

export interface SearchResults {
  groups: EntityItem[];
  individuals: EntityItem[];
}

interface EntitySelectorProps {
  value: SelectedEntity[];
  onChange: (entities: SelectedEntity[]) => void;
  scopes?: EntityScope[];
  searchFn: (query: string) => SearchResults;
  multiSelect?: boolean;
  placeholder?: string;
  noResultsText?: string;
  emptyTabText?: string;
  maxScrollHeight?: string;
  /** When set, collapses chips beyond this count behind a "+N more" badge. */
  maxVisibleTokens?: number;
  /** Optional slot rendered inside each selected chip, after the label. */
  renderChipExtra?: (entity: SelectedEntity) => React.ReactNode;
  /** When true, selected chips render below the search input instead of inline. */
  chipsBelow?: boolean;
  /** When true, suppresses chip rendering entirely. */
  hideChips?: boolean;
  /** Entity ids whose chips render without a remove control (e.g. staff already on a sent post). */
  nonRemovableIds?: Set<string>;
  /** Entity ids whose chips render with a tinted highlight (e.g. the signed-in teacher). */
  highlightedIds?: Set<string>;
  /** Hides the "Clear all" control (e.g. when only the teacher's own chip is removable). */
  hideClearAll?: boolean;
  /** When false, focusing the input won't open the dropdown. Defaults to true. */
  openOnFocus?: boolean;
  /** When true, the dropdown opens immediately on mount. */
  autoOpen?: boolean;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

// Returns the unit label for a group's member count.
function getCountUnit(groupType: GroupType | undefined, count: number): string {
  const studentTypes: GroupType[] = ['class', 'level', 'school', 'cca', 'teaching', 'custom'];
  if (groupType && studentTypes.includes(groupType)) {
    return count === 1 ? 'student' : 'students';
  }
  return count === 1 ? 'member' : 'members';
}

export function detectOverlaps(
  entities: SelectedEntity[],
  overlapMap: Record<string, string[]>,
): { childLabel: string; parentLabel: string }[] {
  const selectedIds = new Set(entities.map((e) => e.id));
  const warnings: { childLabel: string; parentLabel: string }[] = [];

  for (const [parentId, childIds] of Object.entries(overlapMap)) {
    if (!selectedIds.has(parentId)) continue;
    const parent = entities.find((e) => e.id === parentId);
    if (!parent) continue;
    for (const childId of childIds) {
      if (!selectedIds.has(childId)) continue;
      const child = entities.find((e) => e.id === childId);
      if (!child) continue;
      warnings.push({ childLabel: child.label, parentLabel: parent.label });
    }
  }

  return warnings;
}

function toSelectedEntity(item: EntityItem): SelectedEntity {
  return {
    id: item.id,
    label: item.label,
    type: item.type,
    count: item.count ?? 1,
    groupType: item.groupType,
    memberNames: item.memberNames,
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

interface ResultRowProps {
  item: EntityItem;
  isSelected: boolean;
  locked?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  excludedMemberNames?: Set<string>;
  onMemberToggle?: (name: string) => void;
}

/**
 * One option in the list. The selectable part is a real `Combobox.Item`, so
 * Base UI owns its `role="option"`, `aria-selected`, highlight state and
 * keyboard traversal. The expand chevron and the member list sit *outside*
 * the Item — they are disclosure controls, not options, and nesting them
 * inside would put buttons inside an option and fight the widget's own
 * click handling.
 */
function ResultRow({
  item,
  isSelected,
  locked = false,
  isExpanded = false,
  onToggleExpand,
  excludedMemberNames = new Set(),
  onMemberToggle,
}: ResultRowProps) {
  const hasMembers =
    item.type === 'group' &&
    ((item.memberDetails?.length ?? 0) > 0 || (item.memberNames?.length ?? 0) > 0);

  return (
    <>
      <div
        className={cn(
          'flex w-full transition-colors',
          isSelected ? 'bg-twblue-1' : 'hover:bg-slate-4',
        )}
      >
        <Combobox.Item
          value={toSelectedEntity(item)}
          disabled={locked}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-60 data-highlighted:bg-slate-4"
        >
          {/* Checkbox — Minus when the group is selected with members excluded */}
          <span
            className={cn(
              'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-slate-6 bg-background',
            )}
          >
            {isSelected && excludedMemberNames.size === 0 && <Check className="h-3 w-3" />}
            {isSelected && excludedMemberNames.size > 0 && <Minus className="h-3 w-3" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{item.label}</span>
            {item.sublabel && (
              <span className="block truncate text-xs text-muted-foreground">{item.sublabel}</span>
            )}
          </span>
          {item.type === 'group' && item.count !== undefined && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {isSelected && excludedMemberNames.size > 0 ? (
                <>
                  <span className="font-medium text-twblue-11">
                    {item.count - excludedMemberNames.size}
                  </span>
                  /{item.count}
                </>
              ) : (
                item.count - excludedMemberNames.size
              )}{' '}
              {getCountUnit(item.groupType, item.count - excludedMemberNames.size)}
            </span>
          )}
          {item.badge && (
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.badge}</span>
          )}
        </Combobox.Item>

        {/* Expand chevron — only for groups with member names */}
        {hasMembers && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            // Named per group: every group row carries one of these, so a bare
            // "Show members" is ambiguous to anyone listing the buttons.
            aria-label={
              isExpanded ? `Hide members of ${item.label}` : `Show members of ${item.label}`
            }
            aria-expanded={isExpanded}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onToggleExpand?.()}
            className={cn(
              'h-auto shrink-0 rounded-none px-2',
              isSelected ? 'hover:bg-twblue-3' : 'hover:bg-slate-4',
            )}
          >
            <ChevronDown
              className={cn(
                'size-3.5 text-muted-foreground transition-transform duration-150',
                isExpanded && 'rotate-180',
              )}
            />
          </Button>
        )}
      </div>

      {/* Expanded member list */}
      {isExpanded && hasMembers && (
        <div className="border-b border-slate-4 bg-slate-2/60 px-4 pt-2.5 pb-3">
          {(() => {
            const total = item.memberDetails?.length ?? item.memberNames!.length;
            return (
              <p className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {`${total} ${getCountUnit(item.groupType, total)}`}
              </p>
            );
          })()}

          <div className="max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {(item.memberDetails ?? item.memberNames!.map((name): MemberDetail => ({ name }))).map(
              (detail, index) => {
                const isMemberIncluded = isSelected && !excludedMemberNames.has(detail.name);
                return (
                  <Toggle
                    key={detail.name}
                    pressed={isMemberIncluded}
                    disabled={locked}
                    onMouseDown={(e) => e.preventDefault()}
                    onPressedChange={() => onMemberToggle?.(detail.name)}
                    className="h-auto w-full min-w-0 justify-start gap-2 rounded px-1.5 py-1 text-xs font-normal hover:bg-twblue-3 data-pressed:bg-transparent"
                  >
                    <span
                      className={cn(
                        'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors',
                        isMemberIncluded
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-slate-6 bg-background',
                      )}
                    >
                      {isMemberIncluded && <Check className="h-3 w-3" />}
                    </span>
                    <span className="w-5 shrink-0 text-right text-[10px] text-slate-9 tabular-nums">
                      #{index + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span
                        className={cn(
                          'font-medium',
                          isMemberIncluded ? 'text-slate-12' : 'text-slate-9',
                        )}
                      >
                        {detail.name}
                      </span>
                      {detail.sublabel && detail.sublabel !== item.label && (
                        <span className="ml-1 shrink-0 rounded bg-slate-4 px-1 py-px text-[9px] font-medium text-slate-11">
                          {detail.sublabel}
                        </span>
                      )}
                    </span>
                    {detail.badge && (
                      <span className="shrink-0 font-mono text-[10px] text-slate-9">
                        {detail.badge}
                      </span>
                    )}
                  </Toggle>
                );
              },
            )}
          </div>

          {(() => {
            const shown = item.memberDetails?.length ?? item.memberNames!.length;
            return (
              item.count !== undefined &&
              item.count > shown && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Full roster not available in this preview (+{item.count - shown} more)
                </p>
              )
            );
          })()}
        </div>
      )}
    </>
  );
}

/** Shared visual for a selected entity, used by both chip presentations. */
function chipBody(entity: SelectedEntity, extra: React.ReactNode, large: boolean) {
  return (
    <>
      {entity.type === 'group' ? (
        <Users className={cn('shrink-0', large ? 'h-3.5 w-3.5 text-slate-9' : 'h-3 w-3')} />
      ) : (
        <User className={cn('shrink-0', large ? 'h-3.5 w-3.5 text-slate-9' : 'h-3 w-3')} />
      )}
      <span className="truncate">{entity.label}</span>
      {entity.type === 'group' && (
        <span className={cn('shrink-0', large ? 'text-slate-9' : 'opacity-60')}>
          · {entity.count}
        </span>
      )}
      {extra != null && (
        <span className={cn('flex shrink-0 items-center', large ? 'ml-2' : 'ml-1')}>{extra}</span>
      )}
    </>
  );
}

function chipClasses(large: boolean, highlighted: boolean, hasExtra: boolean, clickable: boolean) {
  return cn(
    'inline-flex shrink-0 items-center rounded-md font-medium',
    large
      ? cn(
          'gap-2 border px-3 py-1.5 text-sm text-slate-12',
          highlighted ? 'border-twblue-6 bg-twblue-2' : 'border-input bg-background',
        )
      : cn(
          'gap-1 bg-twblue-2 px-2 py-0.5 text-xs text-twblue-9',
          highlighted && 'ring-1 ring-inset ring-twblue-6',
          hasExtra ? 'max-w-[260px]' : 'max-w-[180px]',
        ),
    clickable && 'cursor-pointer hover:bg-slate-3',
  );
}

function chipTooltip(entity: SelectedEntity) {
  const names = entity.memberNames ?? [];
  if (names.length === 0) return undefined;
  return names.length > 12
    ? `${names.slice(0, 12).join(', ')} and ${names.length - 12} more`
    : names.join(', ');
}

/** Inline chip — a real `Combobox.Chip`, so Backspace/Delete traversal works. */
function InlineChip({
  entity,
  extra,
  removable,
  highlighted,
}: {
  entity: SelectedEntity;
  extra?: React.ReactNode;
  removable: boolean;
  highlighted: boolean;
}) {
  return (
    <Combobox.Chip
      title={chipTooltip(entity)}
      className={chipClasses(false, highlighted, extra != null, false)}
    >
      {chipBody(entity, extra, false)}
      {removable && (
        <Combobox.ChipRemove
          aria-label={`Remove ${entity.label}`}
          className="ml-0.5 shrink-0 cursor-pointer rounded-full p-0.5 hover:bg-twblue-4 hover:text-twblue-9"
        >
          <X className="size-2.5" />
        </Combobox.ChipRemove>
      )}
    </Combobox.Chip>
  );
}

/** Below-the-input chip. Sits outside the combobox, so it uses a plain Button. */
function BelowChip({
  entity,
  extra,
  removable,
  highlighted,
  onRemove,
  onChipClick,
}: {
  entity: SelectedEntity;
  extra?: React.ReactNode;
  removable: boolean;
  highlighted: boolean;
  onRemove: () => void;
  onChipClick?: () => void;
}) {
  return (
    <span
      title={chipTooltip(entity)}
      role={onChipClick ? 'button' : undefined}
      tabIndex={onChipClick ? 0 : undefined}
      onMouseDown={onChipClick ? (e) => e.preventDefault() : undefined}
      onClick={onChipClick}
      onKeyDown={
        onChipClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChipClick();
              }
            }
          : undefined
      }
      className={chipClasses(true, highlighted, extra != null, onChipClick != null)}
    >
      {chipBody(entity, extra, true)}
      {removable && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`Remove ${entity.label}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 size-auto shrink-0 rounded-full p-0.5 text-slate-9 hover:bg-slate-4 hover:text-slate-12"
        >
          <X className="size-3" />
        </Button>
      )}
    </span>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function EntitySelector({
  value,
  onChange,
  scopes,
  searchFn,
  multiSelect = true,
  placeholder = 'Search…',
  noResultsText = 'No results found',
  emptyTabText = 'No items in this category',
  maxScrollHeight = '240px',
  maxVisibleTokens,
  renderChipExtra,
  chipsBelow = false,
  hideChips = false,
  openOnFocus = true,
  autoOpen = false,
  nonRemovableIds,
  highlightedIds,
  hideClearAll = false,
}: EntitySelectorProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [query, setQuery] = useState('');
  const [activeScope, setActiveScope] = useState(scopes?.[0]?.id ?? '');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupExclusions, setGroupExclusions] = useState<Map<string, Set<string>>>(new Map());
  const [chipsExpanded, setChipsExpanded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-collapse when enough chips have been removed
  useEffect(() => {
    if (maxVisibleTokens != null && value.length <= maxVisibleTokens) {
      setChipsExpanded(false);
    }
  }, [value.length, maxVisibleTokens]);

  // Sync activeScope when scopes change
  useEffect(() => {
    if (scopes && scopes.length > 0 && !scopes.find((s) => s.id === activeScope)) {
      setActiveScope(scopes[0].id);
    }
  }, [scopes, activeScope]);

  // Collapse expanded group when query changes (group may disappear from results)
  useEffect(() => {
    setExpandedGroupId(null);
  }, [query]);

  /**
   * Base UI hands back the whole next selection. Reconcile it against the
   * current one so locked entities can't be dropped and per-group member
   * exclusions survive a re-render.
   */
  function handleSelectionChange(next: SelectedEntity[]) {
    const nextIds = new Set(next.map((e) => e.id));

    // A locked entity must never leave the selection, however it was deselected.
    const rescued = value.filter((e) => nonRemovableIds?.has(e.id) && !nextIds.has(e.id));

    let merged = [...rescued, ...next].map((entity) => {
      const excl = groupExclusions.get(entity.id);
      return excl && excl.size > 0 ? { ...entity, excludedMemberNames: [...excl] } : entity;
    });

    // Single-select mode: keep only the most recent pick, then close.
    if (!multiSelect) {
      merged = merged.slice(-1);
      setIsOpen(false);
      setQuery('');
    }

    // Drop exclusions for groups that are no longer selected.
    const mergedIds = new Set(merged.map((e) => e.id));
    const staleGroups = [...groupExclusions.keys()].filter((id) => !mergedIds.has(id));
    if (staleGroups.length > 0) {
      const nextExcl = new Map(groupExclusions);
      for (const id of staleGroups) nextExcl.delete(id);
      setGroupExclusions(nextExcl);
    }

    onChange(merged);
  }

  function handleMemberToggle(item: EntityItem, memberName: string) {
    const groupId = item.id;
    const allNames = item.memberNames ?? [];
    const isGroupSelected = value.some((e) => e.id === groupId);

    if (!isGroupSelected) {
      // Group not yet selected: add it, excluding all members except the clicked one
      const exclusions = new Set(allNames.filter((n) => n !== memberName));
      const next = new Map(groupExclusions);
      if (exclusions.size > 0) next.set(groupId, exclusions);
      setGroupExclusions(next);
      const entity = toSelectedEntity(item);
      onChange([
        ...value,
        { ...entity, excludedMemberNames: exclusions.size > 0 ? [...exclusions] : undefined },
      ]);
      return;
    }

    // Group already selected: toggle this individual member
    const currentExcl = groupExclusions.get(groupId) ?? new Set<string>();
    const newExcl = new Set(currentExcl);
    if (newExcl.has(memberName)) {
      newExcl.delete(memberName); // re-include
    } else {
      newExcl.add(memberName); // exclude
    }

    // If all members are now excluded, remove the group entirely
    if (allNames.length > 0 && newExcl.size >= allNames.length) {
      if (nonRemovableIds?.has(groupId)) return;
      onChange(value.filter((e) => e.id !== groupId));
      const next = new Map(groupExclusions);
      next.delete(groupId);
      setGroupExclusions(next);
      return;
    }

    const next = new Map(groupExclusions);
    if (newExcl.size === 0) next.delete(groupId);
    else next.set(groupId, newExcl);
    setGroupExclusions(next);
    onChange(
      value.map((e) =>
        e.id === groupId
          ? { ...e, excludedMemberNames: newExcl.size > 0 ? [...newExcl] : undefined }
          : e,
      ),
    );
  }

  function handleRemove(entity: SelectedEntity) {
    onChange(value.filter((e) => e.id !== entity.id));
    if (groupExclusions.has(entity.id)) {
      const next = new Map(groupExclusions);
      next.delete(entity.id);
      setGroupExclusions(next);
    }
  }

  function handleClearAll() {
    onChange(value.filter((e) => nonRemovableIds?.has(e.id)));
    setGroupExclusions(new Map());
  }
  const hasRemovableValue = value.some((e) => !nonRemovableIds?.has(e.id));

  /** Open the dropdown and expand the given group so the user can (de)select members. */
  function openGroup(entity: SelectedEntity) {
    const owningScope = scopes?.find(
      (s) =>
        s.items.some((item) => item.id === entity.id) ||
        s.sections?.some((sec) => sec.items.some((item) => item.id === entity.id)),
    );
    if (owningScope) setActiveScope(owningScope.id);
    setExpandedGroupId(entity.id);
    setQuery(''); // switch to browse mode, not search
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // When no scopes (search-only mode): always call searchFn so the panel shows
  // all groups + individuals immediately on open (searchFn('') returns all).
  const searchResults = !scopes || query ? searchFn(query) : { groups: [], individuals: [] };

  const activeScopeDef = scopes?.find((s) => s.id === activeScope);

  // The flat list of rows currently on screen, in render order. Base UI builds
  // its keyboard-navigation collection from this, so it has to match what
  // `renderSearchResults` / `renderBrowseTab` actually paint.
  const visibleItems: EntityItem[] =
    !scopes || query
      ? [...searchResults.groups, ...searchResults.individuals]
      : activeScopeDef
        ? (activeScopeDef.sections?.flatMap((section) => section.items) ?? activeScopeDef.items)
        : [];

  const visibleValues = visibleItems.map(toSelectedEntity);

  function renderSectionHeader(title: string) {
    return <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">{title}</div>;
  }

  const renderRow = (item: EntityItem) => (
    <ResultRow
      key={item.id}
      item={item}
      isSelected={value.some((e) => e.id === item.id)}
      locked={nonRemovableIds?.has(item.id) && value.some((e) => e.id === item.id)}
      isExpanded={expandedGroupId === item.id}
      onToggleExpand={() => setExpandedGroupId((prev) => (prev === item.id ? null : item.id))}
      excludedMemberNames={groupExclusions.get(item.id)}
      onMemberToggle={(name) => handleMemberToggle(item, name)}
    />
  );

  function renderBrowseTab() {
    const scope = activeScopeDef;
    if (!scope) return null;

    if (!scope.sections && scope.items.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">{emptyTabText}</p>;
    }

    return scope.sections
      ? scope.sections.map((section) => (
          <div key={section.label}>
            <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {section.label}
            </div>
            {section.items.map(renderRow)}
          </div>
        ))
      : scope.items.map(renderRow);
  }

  function renderSearchResults() {
    const { groups, individuals } = searchResults;
    if (groups.length === 0 && individuals.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">{noResultsText}</p>;
    }
    return (
      <>
        {groups.length > 0 && (
          <>
            {renderSectionHeader('Groups')}
            {groups.map(renderRow)}
          </>
        )}
        {groups.length > 0 && individuals.length > 0 && <div className="mx-3 my-0.5 border-t" />}
        {individuals.length > 0 && (
          <>
            {renderSectionHeader('Individuals')}
            {individuals.map(renderRow)}
          </>
        )}
      </>
    );
  }

  // Scope tab bar — top of the dropdown panel
  const scopeTabs = scopes && scopes.length > 0 && (
    <ToggleGroup
      value={activeScope ? [activeScope] : []}
      onValueChange={(next) => {
        const picked = next[next.length - 1];
        if (!picked) return;
        setActiveScope(picked);
        setQuery('');
        setIsOpen(true);
        inputRef.current?.focus();
      }}
      className="gap-1 overflow-x-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      {scopes.map((scope) => (
        <ToggleGroupItem
          key={scope.id}
          value={scope.id}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            'h-auto min-w-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap',
            activeScope === scope.id
              ? 'bg-twblue-2 text-twblue-9 data-pressed:bg-twblue-2 data-pressed:text-twblue-9'
              : 'text-muted-foreground hover:bg-slate-4 hover:text-foreground',
          )}
        >
          {scope.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  const inlineChips =
    maxVisibleTokens != null && !chipsExpanded && value.length > maxVisibleTokens
      ? value.slice(0, maxVisibleTokens)
      : value;

  return (
    <>
      <Combobox.Root<SelectedEntity, true>
        multiple
        // We do our own filtering through `searchFn` / the browse tabs, so Base
        // UI must not filter again — but it still needs the visible rows as its
        // collection, or the list reports itself empty and arrow-key traversal
        // and `aria-activedescendant` never engage.
        filter={null}
        items={visibleValues}
        value={value}
        onValueChange={handleSelectionChange}
        open={isOpen}
        onOpenChange={setIsOpen}
        inputValue={query}
        onInputValueChange={(next) => {
          setQuery(next);
          // Typing always reveals the results, even where a bare click does
          // not open the panel (`openOnFocus={false}`).
          if (next && !isOpen) setIsOpen(true);
        }}
        openOnInputClick={openOnFocus}
        itemToStringLabel={(entity) => entity.label}
        itemToStringValue={(entity) => entity.id}
        isItemEqualToValue={(a, b) => a.id === b.id}
      >
        {/* Token input container — selected chips + inline search input */}
        <Combobox.Chips
          className={cn(
            'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-[14px] border border-input bg-background px-2.5 py-1.5 transition-colors',
            'cursor-text hover:border-ring',
            'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          )}
        >
          {!chipsBelow &&
            !hideChips &&
            inlineChips.map((entity) => (
              <InlineChip
                key={entity.id}
                entity={entity}
                extra={renderChipExtra?.(entity)}
                removable={!nonRemovableIds?.has(entity.id)}
                highlighted={highlightedIds?.has(entity.id) ?? false}
              />
            ))}

          {/* "+N more" overflow badge (inline mode only) */}
          {!chipsBelow && !hideChips && inlineChips.length < value.length && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setChipsExpanded(true);
              }}
              className="h-auto shrink-0 rounded-md border border-dashed border-slate-6 px-2 py-0.5 text-xs font-normal text-slate-11 hover:bg-slate-3"
            >
              +{value.length - inlineChips.length} more
            </Button>
          )}

          <Combobox.Input
            ref={inputRef}
            placeholder={value.length === 0 || chipsBelow ? placeholder : undefined}
            className="min-w-[100px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />

          {/* Clear all — visible when ≥1 removable chip is selected (inline mode only) */}
          {!chipsBelow && value.length > 0 && hasRemovableValue && !hideClearAll && (
            <Button
              type="button"
              variant="link"
              size="xs"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClearAll}
              className="ml-auto h-auto shrink-0 px-0 text-muted-foreground hover:text-destructive hover:no-underline"
            >
              Clear all
            </Button>
          )}
        </Combobox.Chips>

        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="z-50 w-(--anchor-width) outline-none">
            <Combobox.Popup className="w-full overflow-hidden rounded-lg border bg-popover shadow-md outline-none">
              {/* Browse tabs — visible when scopes exist and not searching */}
              {scopes && scopes.length > 0 && !query && (
                <div className="border-b px-2 py-1.5">{scopeTabs}</div>
              )}

              <Combobox.List style={{ maxHeight: maxScrollHeight, overflowY: 'auto' }}>
                {!scopes || query ? renderSearchResults() : renderBrowseTab()}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

      {/* Chips below area — rendered outside the combobox so it's never clipped */}
      {chipsBelow && !hideChips && value.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {value.map((entity) => (
            <BelowChip
              key={entity.id}
              entity={entity}
              extra={renderChipExtra?.(entity)}
              removable={!nonRemovableIds?.has(entity.id)}
              highlighted={highlightedIds?.has(entity.id) ?? false}
              onRemove={() => handleRemove(entity)}
              onChipClick={entity.type === 'group' ? () => openGroup(entity) : undefined}
            />
          ))}
          {hasRemovableValue && !hideClearAll && (
            <Button
              type="button"
              variant="link"
              size="xs"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClearAll}
              className="ml-auto h-auto shrink-0 px-0 text-muted-foreground hover:text-destructive hover:no-underline"
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </>
  );
}
