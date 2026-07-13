import { Check, ChevronDown, Minus, User, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
  onToggle: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  excludedMemberNames?: Set<string>;
  onMemberToggle?: (name: string) => void;
}

function ResultRow({
  item,
  isSelected,
  onToggle,
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
      {/* Row: selection area + expand chevron as siblings inside a flex div */}
      <div
        className={cn(
          'flex w-full transition-colors',
          isSelected ? 'bg-twblue-1' : 'hover:bg-slate-4',
        )}
      >
        {/* Selection toggle — takes all available space */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggle}
          aria-pressed={isSelected}
          className="flex flex-1 items-center gap-3 px-3 py-2 text-left text-sm"
        >
          {/* Checkbox */}
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
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{item.label}</p>
            {item.sublabel && (
              <p className="truncate text-xs text-muted-foreground">{item.sublabel}</p>
            )}
          </div>
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
        </button>

        {/* Expand chevron — only for groups with member names */}
        {hasMembers && (
          <button
            type="button"
            aria-label={isExpanded ? 'Hide members' : 'Show members'}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onToggleExpand?.()}
            className={cn(
              'flex shrink-0 items-center px-2 transition-colors',
              isSelected ? 'hover:bg-twblue-3' : 'hover:bg-slate-4',
            )}
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-150',
                isExpanded && 'rotate-180',
              )}
            />
          </button>
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

          {/* Scrollable numbered list */}
          <div className="max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {(item.memberDetails ?? item.memberNames!.map((name): MemberDetail => ({ name }))).map(
              (detail, index) => {
                const isMemberIncluded = isSelected && !excludedMemberNames.has(detail.name);
                return (
                  <button
                    key={detail.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onMemberToggle?.(detail.name)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-twblue-3"
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
                  </button>
                );
              },
            )}
          </div>

          {/* Note when roster is incomplete */}
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

function EntityChip({
  entity,
  onRemove,
  extra,
  large = false,
  onChipClick,
}: {
  entity: SelectedEntity;
  onRemove: () => void;
  extra?: React.ReactNode;
  large?: boolean;
  onChipClick?: () => void;
}) {
  const names = entity.memberNames ?? [];
  const tooltipTitle =
    names.length > 0
      ? names.length > 12
        ? `${names.slice(0, 12).join(', ')} and ${names.length - 12} more`
        : names.join(', ')
      : undefined;

  return (
    <span
      title={tooltipTitle}
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
      className={cn(
        'inline-flex shrink-0 items-center rounded-md font-medium',
        large
          ? 'gap-2 border border-input bg-background px-3 py-1.5 text-sm text-slate-12'
          : cn(
              'gap-1 bg-twblue-2 px-2 py-0.5 text-xs text-twblue-9',
              extra ? 'max-w-[260px]' : 'max-w-[180px]',
            ),
        onChipClick && 'cursor-pointer hover:bg-slate-3',
      )}
    >
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
      <button
        type="button"
        aria-label={`Remove ${entity.label}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          'shrink-0 rounded-full',
          large
            ? 'ml-1 p-0.5 text-slate-9 hover:bg-slate-4 hover:text-slate-12'
            : 'ml-0.5 p-0.5 hover:bg-twblue-4 hover:text-twblue-9',
        )}
      >
        <X className={cn(large ? 'h-3 w-3' : 'h-2.5 w-2.5')} />
      </button>
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
}: EntitySelectorProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [query, setQuery] = useState('');
  const [activeScope, setActiveScope] = useState(scopes?.[0]?.id ?? '');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupExclusions, setGroupExclusions] = useState<Map<string, Set<string>>>(new Map());
  const [chipsExpanded, setChipsExpanded] = useState(false);

  // Auto-collapse when enough chips have been removed
  useEffect(() => {
    if (maxVisibleTokens != null && value.length <= maxVisibleTokens) {
      setChipsExpanded(false);
    }
  }, [value.length, maxVisibleTokens]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Outside-click to close
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  function handleToggle(item: EntityItem) {
    const isSelected = value.some((e) => e.id === item.id);
    if (isSelected) {
      onChange(value.filter((e) => e.id !== item.id));
      if (groupExclusions.has(item.id)) {
        const next = new Map(groupExclusions);
        next.delete(item.id);
        setGroupExclusions(next);
      }
    } else if (multiSelect) {
      onChange([...value, toSelectedEntity(item)]);
    } else {
      onChange([toSelectedEntity(item)]);
      setIsOpen(false);
      setQuery('');
    }
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

  function closePanel() {
    setIsOpen(false);
    setQuery('');
  }

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

  function renderSectionHeader(title: string) {
    return <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">{title}</div>;
  }

  const renderRow = (item: EntityItem) => (
    <ResultRow
      key={item.id}
      item={item}
      isSelected={value.some((e) => e.id === item.id)}
      onToggle={() => handleToggle(item)}
      isExpanded={expandedGroupId === item.id}
      onToggleExpand={() => setExpandedGroupId((prev) => (prev === item.id ? null : item.id))}
      excludedMemberNames={groupExclusions.get(item.id)}
      onMemberToggle={(name) => handleMemberToggle(item, name)}
    />
  );

  function renderBrowseTab() {
    const scope = scopes?.find((s) => s.id === activeScope);
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
    <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {scopes.map((scope) => (
        <button
          key={scope.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setActiveScope(scope.id);
            setQuery('');
            setIsOpen(true);
            inputRef.current?.focus();
          }}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
            activeScope === scope.id
              ? 'bg-twblue-2 text-twblue-9'
              : 'text-muted-foreground hover:bg-slate-4 hover:text-foreground',
          )}
        >
          {scope.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div ref={wrapperRef} className="relative">
        {/* Token input container — selected chips + inline search input */}
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => {
            setIsOpen(true);
            inputRef.current?.focus();
          }}
          className={cn(
            'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-[14px] border border-input bg-background px-2.5 py-1.5 transition-colors',
            'cursor-text hover:border-ring',
            isOpen && 'border-ring ring-[3px] ring-ring/50',
          )}
        >
          {/* Selected chips (inline mode only — skipped when chipsBelow) */}
          {!chipsBelow &&
            (maxVisibleTokens != null && !chipsExpanded && value.length > maxVisibleTokens
              ? value.slice(0, maxVisibleTokens)
              : value
            ).map((entity) => (
              <EntityChip
                key={entity.id}
                entity={entity}
                onRemove={() => handleRemove(entity)}
                extra={renderChipExtra?.(entity)}
              />
            ))}

          {/* "+N more" overflow badge (inline mode only) */}
          {!chipsBelow &&
            maxVisibleTokens != null &&
            !chipsExpanded &&
            value.length > maxVisibleTokens && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  setChipsExpanded(true);
                }}
                className="inline-flex shrink-0 cursor-pointer items-center rounded-md border border-dashed border-slate-6 px-2 py-0.5 text-xs text-slate-11 hover:bg-slate-3"
              >
                +{value.length - maxVisibleTokens} more
              </button>
            )}

          {/* Inline search input (always present, flex-1 expands to fill row) */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={value.length === 0 || chipsBelow ? placeholder : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (openOnFocus) setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (query) setQuery('');
                else closePanel();
              }
              // Backspace on empty input removes the last chip (inline mode only)
              if (!chipsBelow && e.key === 'Backspace' && !query && value.length > 0) {
                handleRemove(value[value.length - 1]);
              }
            }}
            className="min-w-[100px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />

          {/* Clear all — visible when ≥1 chip is selected (inline mode only) */}
          {!chipsBelow && value.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange([])}
              className="ml-auto shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Dropdown panel */}
        {isOpen && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
            {/* Browse tabs — visible when scopes exist and not searching */}
            {scopes && scopes.length > 0 && !query && (
              <div className="border-b px-2 py-1.5">{scopeTabs}</div>
            )}

            {/* Results */}
            <div style={{ maxHeight: maxScrollHeight, overflowY: 'auto' }}>
              {!scopes || query ? renderSearchResults() : renderBrowseTab()}
            </div>
          </div>
        )}
      </div>

      {/* Chips below area — rendered outside the relative wrapper so it's never clipped */}
      {chipsBelow && !hideChips && value.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {value.map((entity) => (
            <EntityChip
              key={entity.id}
              entity={entity}
              onRemove={() => handleRemove(entity)}
              extra={renderChipExtra?.(entity)}
              large
              onChipClick={entity.type === 'group' ? () => openGroup(entity) : undefined}
            />
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange([])}
            className="ml-auto shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            Clear all
          </button>
        </div>
      )}
    </>
  );
}
