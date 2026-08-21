import { ChevronDown, Crown, Download } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { QueryError } from '~/components/QueryError';
import {
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Label,
  RadioGroup,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
} from '~/components/ui';
import { AppError } from '~/features/posts/api/errors';
import type { ApiSchoolClass } from '~/features/posts/api/types';
import {
  fetchOnboardingReport,
  fetchSchoolClasses,
  fetchSchoolStaff,
  fetchSession,
  fetchTravelDeclarationReport,
  type DeclarationStatus,
  type ReportTarget,
} from '~/features/reports/api/reports';
import { DateRangeFields } from '~/features/reports/components/DateRangeFields';
import { DeclarationStatusOption } from '~/features/reports/components/DeclarationStatusOption';
import { downloadBlob } from '~/helpers/downloadBlob';
import { useQuery } from '~/hooks/useQuery';
import { notify } from '~/lib/notify';

// Hardcoded pending real admin-role wiring — matches the same standing
// assumption Posts' admin banner makes.
const IS_ADMIN = true;

type ReportTab = 'onboarding' | 'travel';
type ReportScope = 'my' | 'school';

function findOwnClass(
  classes: ApiSchoolClass[],
  ownClassName: string | null | undefined,
): ApiSchoolClass | undefined {
  return classes.find((c) => c.label === ownClassName);
}

const ReportsListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as ReportTab | null) ?? 'onboarding';

  const [scope, setScope] = useState<ReportScope>('my');
  const [scopeOpen, setScopeOpen] = useState(false);

  const [declarationStatus, setDeclarationStatus] = useState<DeclarationStatus | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [downloadState, setDownloadState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery(
    () =>
      Promise.all([fetchSession(), fetchSchoolStaff(), fetchSchoolClasses()]).then(
        ([session, staff, classes]) => ({ session, staff, classes }),
      ),
    [],
  );

  if (error) return <QueryError onRetry={refetch} />;
  if (isLoading || !data) return null;

  const { session, staff, classes } = data;
  const ownStaff = staff.find((s) => s.staffId === session.staffId);
  const ownClass = findOwnClass(classes, ownStaff?.className);

  // School reports cover the whole school at once — there's no class to pick.
  const target: ReportTarget | null =
    scope === 'my'
      ? ownClass
        ? { kind: 'class', classId: ownClass.value }
        : null
      : { kind: 'school', schoolId: session.staffSchoolId };
  const targetLabel = scope === 'my' ? (ownClass?.label ?? null) : session.schoolName;

  const travelValid =
    target != null && declarationStatus != null && startDate !== '' && endDate !== '';
  const onboardingValid = target != null;

  async function handleDownload() {
    if (target == null || downloadState === 'loading') return;
    setDownloadState('loading');
    setDownloadError(null);
    try {
      const { blob, filename } =
        tab === 'onboarding'
          ? await fetchOnboardingReport(target)
          : await fetchTravelDeclarationReport(target, {
              status: declarationStatus!,
              startDate,
              endDate,
            });
      downloadBlob(blob, filename);
      notify.success('Report downloaded.');
      setDownloadState('idle');
    } catch (err) {
      setDownloadState('error');
      setDownloadError(
        err instanceof AppError ? err.message : 'The report could not be generated.',
      );
    }
  }

  function handleTabChange(next: string) {
    setSearchParams({ tab: next }, { replace: true });
    setDownloadState('idle');
    setDownloadError(null);
  }

  function handleScopeChange(next: ReportScope) {
    setScope(next);
    setScopeOpen(false);
    setDownloadState('idle');
    setDownloadError(null);
  }

  const eyebrow = tab === 'onboarding' ? 'Onboarding report for' : 'Travel declaration report for';

  const targetBlock = (
    <div className="space-y-1.5">
      {/* tfx-waive TYP-4 reason="matches the section-eyebrow-label convention used
          10+ times across Posts (PostCard, CreatePostPage, ConsentFormHistoryList,
          etc.) — an established house pattern, not a one-off; see docs/decisions/
          reports-my-reports-page.md" */}
      <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <p className="text-lg font-semibold">{targetLabel ?? 'No class assigned'}</p>
    </div>
  );

  const declarationFields = tab === 'travel' && (
    <>
      <div className="space-y-2">
        <Label>
          Declaration status <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          aria-label="Declaration status"
          className="space-y-2"
          value={declarationStatus ?? ''}
          onValueChange={(next) => setDeclarationStatus(next as typeof declarationStatus)}
        >
          <DeclarationStatusOption
            value="not_declared"
            label="Did not declare (no declarations made)"
            selected={declarationStatus === 'not_declared'}
          />
          <DeclarationStatusOption
            value="declared"
            label="Declared (include travelling and not travelling)"
            selected={declarationStatus === 'declared'}
          />
        </RadioGroup>
      </div>

      <div className="space-y-1.5">
        <Label>
          Date range <span className="text-destructive">*</span>
        </Label>
        <DateRangeFields
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>
    </>
  );

  const travelDivider = tab === 'travel' && <Separator />;

  const downloadAction = (
    <div className="space-y-2">
      <Button
        onClick={handleDownload}
        disabled={
          downloadState === 'loading' || !(tab === 'onboarding' ? onboardingValid : travelValid)
        }
      >
        <Download className="h-4 w-4" />
        {downloadState === 'loading' ? 'Generating…' : 'Download report'}
      </Button>
      {downloadState === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          {downloadError}
        </p>
      )}
    </div>
  );

  const onboardingFootnote = tab === 'onboarding' && (
    <>
      <Separator />
      <p className="text-xs text-muted-foreground">
        To allow or remove Parents Gateway access for custodians, please do so in School Cockpit.
      </p>
    </>
  );

  // Title tracks the selected scope, matching each dropdown option's own name
  // — "My Reports" / "School Reports" — so the trigger always names what's shown.
  const scopeTitle = scope === 'my' ? 'My Reports' : 'School Reports';
  const otherScopeDescription = scope === 'my' ? 'school reports' : 'your reports';

  const adminBanner = IS_ADMIN && (
    <div className="flex items-center justify-center gap-2 border-b border-amber-6 bg-amber-2 px-6 py-2 text-sm text-amber-11">
      <Crown className="h-3.5 w-3.5 shrink-0 text-amber-9" />
      <span>
        <span className="font-semibold">You have admin access.</span> To view{' '}
        {otherScopeDescription}, use the dropdown next to {scopeTitle}.
      </span>
    </div>
  );

  const scopeHeader = (
    <div className="px-6 pt-6">
      {IS_ADMIN ? (
        <DropdownMenu open={scopeOpen} onOpenChange={setScopeOpen}>
          {/* The switcher IS the page title, so it sits inside the h1 rather
              than replacing it — the admin branch previously rendered no h1 at
              all, leaving nothing to navigate by. */}
          <h1 className="text-2xl font-semibold tracking-tight">
            <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-transparent p-0 text-2xl font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              {scopeTitle}
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </DropdownMenuTrigger>
          </h1>
          <DropdownMenuContent align="start" className="w-64 min-w-64">
            <DropdownMenuRadioGroup
              value={scope}
              onValueChange={(value) => handleScopeChange(value as typeof scope)}
            >
              <DropdownMenuRadioItem value="my" className="flex-col items-start gap-0">
                <span className="text-sm font-medium">My reports</span>
                <span className="text-xs text-muted-foreground">
                  Reports for your class{ownClass ? ` (${ownClass.label})` : ''}
                </span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="school" className="flex-col items-start gap-0">
                <span className="text-sm font-medium">School reports</span>
                <span className="text-xs text-muted-foreground">Reports across your school</span>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <h1 className="text-2xl font-semibold tracking-tight">My Reports</h1>
      )}
      <p className="mt-1 text-sm text-muted-foreground">
        Download records from Parents Gateway. Choose between onboarding and travel declaration
        reports.
      </p>
    </div>
  );

  const reportTabs = (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        <TabsTrigger value="travel">Travel declaration</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <div className="flex flex-col">
      {adminBanner}
      {scopeHeader}
      <div className="mt-4 border-b px-6 pb-4">{reportTabs}</div>

      <div className="p-6">
        <Card className="max-w-2xl gap-4 p-6">
          {targetBlock}
          {declarationFields}
          {travelDivider}
          {downloadAction}
          {onboardingFootnote}
        </Card>
      </div>
    </div>
  );
};

export { ReportsListPage };
