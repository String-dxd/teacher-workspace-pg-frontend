/** Types matching the actual PG API response shapes from the Go BFF. */

// ─── Shared sub-shapes ──────────────────────────────────────────────────────

export type ApiAnnouncementStatus = 'POSTED' | 'SCHEDULED' | 'DRAFT' | 'POSTING';
export type ApiConsentFormStatus = 'OPEN' | 'CLOSED' | 'DRAFT' | 'POSTING' | 'SCHEDULED';
export type ApiResponseType = 'VIEW_ONLY' | 'ACKNOWLEDGE' | 'YES_NO';

export interface ApiStaffOwner {
  staffID: number;
  staffName: string;
}

export interface ApiAnnouncementStudent {
  studentId: number;
  studentName: string;
  className: string;
  /** Older pgw-web shape (boolean). */
  isRead?: boolean;
  /** Current pgw-web shape — `'READ' | null` on each recipient. */
  readStatus?: 'READ' | null;
}

/**
 * Shape of a recipient entry under `consentFormRecipients[]` on the
 * consent-form detail response. Student identity lives on a nested `student`
 * object; reply + respond timestamp live at the recipient root.
 */
export interface ApiConsentFormStudent {
  studentId: number;
  reply: 'YES' | 'NO' | null;
  replyDate: string | null;
  replyByParent: string | null;
  /** Relationship of the responding parent/guardian to the student (e.g. "Mother", "Father", "Guardian"). */
  parentType?: string | null;
  /** Mobile number of the responding parent/guardian. */
  contactNumber?: string | null;
  remarks: string | null;
  isIndividual: boolean;
  onBoardedCategory?: string;
  student: {
    studentId: number;
    studentName: string;
    indexNumber?: string;
    className: string;
    studentSex?: string;
  };
}

export interface ApiImage {
  imageId: number;
  isCover: boolean;
  name: string;
  size: number;
  thumbnailUrl: string;
  url: string;
}

export interface ApiAttachment {
  attachmentId: number;
  name: string;
  size: number;
  url: string;
}

export interface ApiWebsiteLink {
  title: string;
  url: string;
}

export interface ApiShortcutLink {
  shortcutLinkId: number;
  title: string;
  url: string;
}

export interface ApiAnnouncementTarget {
  announcementId: number;
  announcementTargetId: number;
  createdAt: string;
  isDeleted: boolean;
  targetAcadYear: number;
  targetId: number;
  targetName: string;
  targetSchool: string;
  targetType: string;
  updatedAt: string;
}

export interface ApiCustomQuestion {
  questionId: number;
  type: 'FREE_TEXT' | 'MCQ';
  text: string;
  options?: string[];
}

export interface ApiConsentFormHistoryEntry {
  historyId: number;
  action: string;
  actionAt: string;
  actionBy: string;
}

// ─── Announcements ──────────────────────────────────────────────────────────

export type ApiAnnouncementList = ApiAnnouncementSummary[];

export interface ApiAnnouncementSummary {
  id: string;
  postId: number;
  title: string;
  date: string;
  status: ApiAnnouncementStatus;
  responseType?: ApiResponseType;
  toParentsOf: string[];
  readMetrics?: { readPerStudent: number; totalStudents: number };
  scheduledSendFailureCode: string | null;
  createdByName: string;
}

export interface ApiAnnouncementDetail {
  announcementId: number;
  title: string;
  content: string | null;
  richTextContent: Record<string, unknown> | string | null;
  responseType?: ApiResponseType | null;
  staffName: string;
  createdBy: number;
  createdAt: string | null;
  postedDate: string | null;
  enquiryEmailAddress: string;
  attachments?: ApiAttachment[];
  images?: ApiImage[];
  shortcutLink: ApiShortcutLink[];
  webLinkList?: ApiWebsiteLink[];
  websiteLinks?: ApiWebsiteLink[];
  target?: ApiAnnouncementTarget[];
  staffOwners?: ApiStaffOwner[];
  students?: ApiAnnouncementStudent[];
  status?: ApiAnnouncementStatus | null;
  scheduledSendAt?: string | null;
  scheduledSendFailureCode?: string | null;
}

export interface ApiAnnouncementDraft {
  announcementDraftId: number;
  status: 'DRAFT' | 'SCHEDULED';
  postedAnnouncementId: number | null;
  title: string;
  content: string | null;
  richTextContent: string | Record<string, unknown> | null;
  enquiryEmailAddress: string;
  staffGroups: unknown[];
  studentGroups: unknown[];
  images: { images: unknown[]; imagesOrigin: string };
  attachments: unknown[];
  urls: unknown[];
  shortcuts: unknown[];
  updatedAt: string;
  scheduledDateTime: string | null;
  scheduledSendFailureCode?: string | null;
}

export interface ApiConsentFormDraft {
  consentFormDraftId: number;
  status: 'DRAFT' | 'SCHEDULED';
  postedConsentFormId: number | null;
  title: string;
  content: string | null;
  richTextContent: string | Record<string, unknown> | null;
  venue: string;
  eventStartDate: { date: string; time: string } | null;
  eventEndDate: { date: string; time: string } | null;
  reminderDate: string;
  addReminderType: 'NONE' | 'ONE_TIME' | 'DAILY' | '';
  enquiryEmailAddress: string;
  consentByDate: string | null;
  responseType: 'ACKNOWLEDGEMENT' | 'YES_NO' | '';
  customQuestions?: unknown[];
  questions?: unknown[];
  staffGroups: unknown[];
  studentGroups: unknown[];
  staffOwners?: { staffID: number; staffName: string }[];
  targets?: ApiAnnouncementTarget[];
  images: { images: unknown[]; imagesOrigin: string } | unknown[];
  attachments: unknown[];
  urls: unknown[];
  shortcuts: unknown[];
  updatedAt: string;
  scheduledDateTime: string | null;
}

// ─── Announcement write payloads ────────────────────────────────────────────

export interface ApiGroupTarget {
  type: string;
  label: string;
  value: number;
}

export interface ApiCreateAnnouncementPayload {
  title: string;
  richTextContent: string;
  enquiryEmailAddress?: string;
  studentGroups: ApiGroupTarget[];
  staffGroups?: ApiGroupTarget[];
  shortcutLink?: string[];
  websiteLinks?: ApiWebsiteLink[];
  attachments?: ApiAttachment[];
  images?: ApiImage[];
}

export interface ApiCreateDraftPayload extends ApiCreateAnnouncementPayload {
  scheduledSendAt?: string | null;
}

export interface ApiScheduleDraftPayload {
  announcementDraftId: number;
  scheduledSendAt: string;
}

export interface ApiDuplicateAnnouncementResponse {
  announcementDraftId: number;
  updatedAt: string;
}

export interface ApiDuplicateConsentFormResponse {
  consentFormDraftId: number;
  updatedAt: string;
}

// ─── Consent Forms ──────────────────────────────────────────────────────────

export type ApiConsentFormList = ApiConsentFormSummary[];

export interface ApiConsentFormSummary {
  id: string;
  postId: number;
  title: string;
  date: string;
  status: ApiConsentFormStatus;
  toParentsOf: string[];
  respondedMetrics: { respondedPerStudent: number; totalStudents: number };
  scheduledSendFailureCode: string | null;
  createdByName: string;
  consentByDate: string | null;
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  eventReminderDate?: string | null;
}

export type ApiReminderType = 'NONE' | 'ONE_TIME' | 'DAILY';

export interface ApiConsentFormDetail {
  consentFormId: number;
  title: string;
  content: string | null;
  richTextContent: Record<string, unknown> | string | null;
  responseType: ApiResponseType;
  eventStartDate: string | null;
  eventEndDate: string | null;
  consentByDate: string | null;
  addReminderType: ApiReminderType;
  reminderDate: string | null;
  postedDate: string | null;
  venue: string | null;
  enquiryEmailAddress: string;
  staffName: string;
  createdBy: number;
  createdAt: string | null;
  images: ApiImage[];
  attachments?: ApiAttachment[];
  webLinkList: ApiWebsiteLink[];
  shortcutLinkList?: unknown[];
  customQuestions: ApiCustomQuestion[] | null;
  staffOwners: ApiStaffOwner[];
  consentFormRecipients: ApiConsentFormStudent[];
  consentFormHistory: ApiConsentFormHistoryEntry[];
  targets?: ApiAnnouncementTarget[];
}

// ─── Consent form write payloads ────────────────────────────────────────────

export interface ApiCreateConsentFormPayload {
  title: string;
  richTextContent: string;
  enquiryEmailAddress?: string;
  responseType: 'ACKNOWLEDGEMENT' | 'YES_NO';
  consentByDate: string;
  addReminderType: ApiReminderType;
  reminderDate?: string | null;
  eventStartDate?: { date: string; time: string } | null;
  eventEndDate?: { date: string; time: string } | null;
  venue?: string | null;
  studentGroups: ApiGroupTarget[];
  staffGroups?: ApiGroupTarget[];
  customQuestions?: ApiCustomQuestion[];
  shortcutLink?: string[];
  websiteLinks?: ApiWebsiteLink[];
  attachments?: ApiAttachment[];
  images?: ApiImage[];
}

export interface ApiCreateConsentFormDraftPayload extends ApiCreateConsentFormPayload {
  scheduledSendAt?: string | null;
}

// ─── School Data (for selectors) ────────────────────────────────────────────

export interface ApiSchoolStaff {
  staffId: number;
  name: string;
  email: string;
  className?: string | null;
}

export type ApiSchoolStaffList = ApiSchoolStaff[];

export interface ApiStaffGroupItem {
  id: string;
  label: string;
  count: number;
  memberNames?: string[];
}

export interface ApiStaffGroups {
  level: ApiStaffGroupItem[];
  school: ApiStaffGroupItem[];
}

export interface ApiSchoolClass {
  type: 'class';
  label: string;
  labelDescription: string;
  value: number;
  acadYear: string;
  schoolId: number;
}

export interface ApiSchoolStudent {
  studentId: number;
  studentName: string;
  uinFinNo: string;
  classSerialNo: string;
  classCode: string;
  className: string;
  levelCode: string;
  levelDescription: string;
  cca: string[];
}

export interface ApiGroupsAssignedClass {
  classId: number;
  className: string;
  level: string;
  year: number;
  role: string;
  studentCount?: number;
}

export interface ApiGroupsAssignedCcaGroup {
  ccaId: number;
  ccaDescription: string;
  studentCount?: number;
}

export interface ApiGroupsAssigned {
  classes: ApiGroupsAssignedClass[];
  ccaGroups: ApiGroupsAssignedCcaGroup[];
}

export interface ApiCustomGroupSummary {
  customGroupId: number;
  name: string;
  studentCount: number;
  createdBy: number;
  createdByName: string;
  isShared: boolean;
  createdAt: string;
}

export interface ApiCustomGroupsList {
  customGroups: ApiCustomGroupSummary[];
}

export interface ApiCustomGroupDetailStudent {
  studentId: number;
  studentName: string;
  className: string;
  indexNumber?: number;
  uinFinNo?: string;
  ccas?: string[];
}

export interface ApiCustomGroupSharedStaff {
  staffId: number;
  staffName: string;
}

export interface ApiCustomGroupDetail {
  customGroupId: number;
  name: string;
  createdBy: number;
  createdByName: string;
  isShared: boolean;
  sharedWith: ApiCustomGroupSharedStaff[];
  students: ApiCustomGroupDetailStudent[];
  createdAt: string;
}

export interface ApiCreateCustomGroupResponse {
  customGroupId: number;
}

export interface ApiClassDetail {
  classId: number;
  className: string;
  level: string;
  year: number;
  students: {
    studentId: number;
    studentName: string;
    admissionNumber: string;
  }[];
  formTeachers?: ApiStaffOwner[];
}

export interface ApiCcaDetail {
  ccaId: number;
  ccaDescription: string;
  students: {
    studentId: number;
    studentName: string;
    className: string;
  }[];
}

// ─── Session & Config ───────────────────────────────────────────────────────

export interface ApiSession {
  staffId: number;
  staffName: string;
  isA: boolean;
  staffSchoolId: number;
  staffEmailAdd: string;
  is2FAAuthorized: boolean;
  schoolEmailAddress: string;
  schoolName: string;
  sessionTimeLeft: number;
  displayName: string;
  displayEmail: string;
  displayUpdatedBy: string;
  displayUpdatedAt: string;
  isAdminUpdated: boolean;
  isIhl: boolean;
  heyTaliaAccess: boolean;
}

export interface ApiConfig {
  flags: Record<string, { enabled: boolean }>;
  configs: Record<string, unknown>;
}

// ─── User Account ───────────────────────────────────────────────────────────

export interface ApiUserProfile {
  staffId: number;
  staffName: string;
  staffSchoolId: number;
  email: string;
  schoolEmail: string;
  schoolName: string;
  displayName: string;
  displayEmail: string;
}
