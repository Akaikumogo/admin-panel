import axios from 'axios';
import { notification } from '@/lib/toast';

const API_BASE_STORAGE_KEY = 'elektrolearn_api_base_v2';

function isIpAddress(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (host.includes(':')) return true;
  const parts = host.split('.');
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
  );
}

function normalizeApiBase(url: string): string {
  let trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '/api';

  if (/^https?:\/\//i.test(trimmed)) {
    const parsed = new URL(trimmed);
    const isLocalhost =
      parsed.hostname === 'localhost' || parsed.hostname.endsWith('.localhost');
    parsed.protocol = isIpAddress(parsed.hostname)
      ? 'http:'
      : isLocalhost
        ? parsed.protocol
        : 'https:';
    trimmed = parsed.toString().replace(/\/+$/, '');
  }

  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
}

const PRIMARY_API_BASE_URL = normalizeApiBase(
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
    '/api',
);

/** Asosiy domen ishlamasa ishlatiladigan rezerv backend. */
const FALLBACK_API_BASE_URL = normalizeApiBase(
  (import.meta.env.VITE_API_FALLBACK_URL as string | undefined)?.trim() ||
    PRIMARY_API_BASE_URL,
);

function readStoredApiBase(): string | null {
  try {
    const raw = sessionStorage.getItem(API_BASE_STORAGE_KEY)?.trim();
    return raw ? normalizeApiBase(raw) : null;
  } catch {
    return null;
  }
}

function persistApiBase(url: string) {
  try {
    sessionStorage.setItem(API_BASE_STORAGE_KEY, url);
  } catch {
    /* ignore quota / private mode */
  }
}

function defaultApiBaseForCurrentHost(): string {
  return typeof window !== 'undefined' && isIpAddress(window.location.hostname)
    ? FALLBACK_API_BASE_URL
    : PRIMARY_API_BASE_URL;
}

function isStoredApiBaseCompatible(url: string): boolean {
  if (typeof window === 'undefined') return true;

  try {
    const parsed = new URL(url, window.location.origin);
    const pageUsesIp = isIpAddress(window.location.hostname);
    return pageUsesIp
      ? parsed.protocol === 'http:' && isIpAddress(parsed.hostname)
      : parsed.protocol === 'https:' && !isIpAddress(parsed.hostname);
  } catch {
    return false;
  }
}

const storedApiBaseUrl = readStoredApiBase();
let activeApiBaseUrl =
  storedApiBaseUrl && isStoredApiBaseCompatible(storedApiBaseUrl)
    ? storedApiBaseUrl
    : defaultApiBaseForCurrentHost();

/** Joriy backend origin (media, socket). Failoverda yangilanadi. */
export let BACKEND_ORIGIN = activeApiBaseUrl.replace(/\/api\/?$/, '');

function setActiveApiBaseUrl(url: string) {
  activeApiBaseUrl = normalizeApiBase(url);
  BACKEND_ORIGIN = activeApiBaseUrl.replace(/\/api\/?$/, '');
  persistApiBase(activeApiBaseUrl);
}

function otherApiBaseUrl(current: string): string | null {
  const cur = normalizeApiBase(current);
  if (cur === PRIMARY_API_BASE_URL && PRIMARY_API_BASE_URL !== FALLBACK_API_BASE_URL) {
    return FALLBACK_API_BASE_URL;
  }
  if (cur === FALLBACK_API_BASE_URL && PRIMARY_API_BASE_URL !== FALLBACK_API_BASE_URL) {
    return PRIMARY_API_BASE_URL;
  }
  if (cur !== FALLBACK_API_BASE_URL) return FALLBACK_API_BASE_URL;
  if (cur !== PRIMARY_API_BASE_URL) return PRIMARY_API_BASE_URL;
  return null;
}

function shouldFailoverToReserve(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.code === 'ERR_CANCELED') return false;
  if (error.config?.headers?.['X-Skip-Api-Failover'] === '1') return false;
  const status = error.response?.status;
  if (status === 502 || status === 503 || status === 504) return true;
  if (error.response) return false;
  const code = error.code;
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    !code
  );
}

/** WebSocket + Socket.IO base (global prefix `/api` is HTTP-only). */
export function getExamLiveSocketUrl(): string {
  return BACKEND_ORIGIN;
}

const ERROR_TITLES: Record<number, string> = {
  400: 'Xato so`rov',
  401: 'Avtorizatsiya xatosi',
  403: 'Ruxsat yo`q',
  404: 'Topilmadi',
  409: 'Konflikt',
  422: 'Validatsiya xatosi',
  429: 'Juda ko`p so`rov',
  500: 'Server xatosi'
};

function showErrorNotification(error: unknown) {
  if (!axios.isAxiosError(error)) {
    notification.error({
      message: 'Kutilmagan xato',
      description: String(error),
      placement: 'topRight',
      duration: 4
    });
    return;
  }

  const status = error.response?.status ?? 0;
  const data = error.response?.data;

  if (status === 401) return;

  const title = ERROR_TITLES[status] || `Xato (${status || 'Network'})`;
  const msg =
    data?.message ??
    (Array.isArray(data?.message) ? data.message.join(', ') : null) ??
    error.message ??
    'Noma`lum xato yuz berdi';

  notification.error({
    message: title,
    description: typeof msg === 'string' ? msg : JSON.stringify(msg),
    placement: 'topRight',
    duration: 5
  });
}

export type Role = 'SUPERADMIN' | 'MODERATOR' | 'USER';

export type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl?: string | null;
  organizationIds: string[];
  organizations: { id: string; name: string; isDefault?: boolean }[];
  energoId?: string | null;
};

export type LegacyModeratorMergePreview = {
  dryRun: boolean;
  source: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    energoId: string | null;
  };
  target: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    energoId: string | null;
  };
  sourceRowCounts: Array<{ table: string; count: number }>;
  conflicts: string[];
  plannedActions: string[];
  merged?: boolean;
  deletedSourceId?: string;
  targetUserId?: string;
};

export type MigrationSuggestion = {
  user: UserProfile;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  matchReasons: string[];
};

export type BulkModeratorMigrationPreview = {
  summary: {
    total: number;
    sourceFound: number;
    targetFound: number;
    readyToMerge: number;
  };
  items: Array<{
    row: {
      index: number;
      fullName: string;
      login: string;
      organizationName: string;
    };
    source: LegacyModeratorMergePreview['source'] | null;
    target: LegacyModeratorMergePreview['target'] | null;
    confidence: 'high' | 'medium' | 'low' | 'none';
    matchReasons: string[];
    canAutoMerge: boolean;
  }>;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
  };
};

export type AnalyticsSummary = {
  totalUsers: number;
  activeUsers7d: number;
  totalOrganizations: number;
  totalModerators: number;
  totalLevels: number;
  totalQuestions: number;
  orgId: string;
};

export type HomeBranchWeek = {
  weekStart: string;
  count: number;
};

export type HomeBranchHeatmapRow = {
  orgId: string;
  orgName: string;
  isDefault: boolean;
  weeks: HomeBranchWeek[];
  totalLogins: number;
};

export type HomeBranchRank = {
  orgId: string;
  orgName: string;
  isDefault: boolean;
  value: number;
  previousValue?: number | null;
};

export type HomeInsight = {
  loginsThisWeek: number;
  loginsPrevWeek: number;
  loginDeltaPercent: number | null;
  errors30d: number;
  errorsPrev30d: number;
  errorDeltaPercent: number | null;
  onlineHint: number;
};

export type HomeOverview = {
  scopeLabel: string;
  branchHeatmap: HomeBranchHeatmapRow[];
  mostActiveBranch: HomeBranchRank | null;
  topErrorBranches: HomeBranchRank[];
  insight?: HomeInsight;
};

export type BranchAnalyticsSummary = {
  orgId: string;
  range: { from: string; to: string };
  totalEmployees: number;
  firstLoginCount: number;
  quizTakersCount: number;
  activeTodayCount: number;
  offlineEmployeesCount: number;
  dailyPlanTarget: number;
  /** Kunlik maqsad: shu kunda nechta TO'G'RI javob kerak (10). */
  dailyGoalCorrect: number;
  /** Bugun kunlik planni bajargan xodimlar soni. */
  planCompletedTodayCount: number;
};

export type BranchActivityDay = {
  date: string;
  status: 'active' | 'offline' | 'never';
  attemptCount: number;
};

export type BranchActivityEmployee = {
  userId: string;
  fullName: string;
  email: string;
  hasEverLoggedIn: boolean;
  days: BranchActivityDay[];
};

export type BranchActivityMatrix = {
  orgId: string;
  days: string[];
  employees: BranchActivityEmployee[];
};

export type BranchDailyPlanResult = {
  orgId: string;
  planDate: string;
  questionCount: number;
  targetQuestions: number;
  dailyGoalCorrect: number;
  completedEmployees: number;
  totalEmployees: number;
  questions: Array<{
    id: string;
    orderIndex: number;
    prompt: string;
    levelTitle: string;
    theoryTitle: string;
  }>;
  userResults: Array<{
    userId: string;
    fullName: string;
    answeredCount: number;
    correctCount: number;
    planCorrectCount: number;
    extraCorrectCount: number;
    completed: boolean;
    completionPercent: number;
  }>;
};

export type BranchMonthlyProgressEmployee = {
  userId: string;
  fullName: string;
  email: string;
  daysCompleted: number;
  monthlyPercent: number;
  correctTotal: number;
  wrongTotal: number;
  extraCorrectTotal?: number;
  lastActiveAt: string | null;
};

export type BranchMonthlyProgress = {
  orgId: string;
  orgName: string;
  month: string;
  daysInMonth: number;
  dailyGoalCorrect: number;
  totalEmployees: number;
  averageMonthlyPercent: number;
  fullCompletedEmployees: number;
  employees: BranchMonthlyProgressEmployee[];
};

export type MonthlyPlanMatrixDayCell = {
  date: string;
  day: number;
  rawCorrect: number;
  planCorrect: number;
  extraCorrect?: number;
  attempts?: number;
  wrong?: number;
  completed: boolean;
  label: string;
};

export type MonthlyPlanMatrixEmployee = {
  userId: string;
  orgId?: string;
  orgName?: string;
  fullName: string;
  email: string;
  daysCompleted: number;
  monthlyPercent: number;
  extraCorrectTotal: number;
  attemptsTotal?: number;
  wrongTotal?: number;
  dayResults: MonthlyPlanMatrixDayCell[];
};

export type MonthlyPlanMatrix = {
  orgId: string;
  orgName: string;
  month: string;
  daysInMonth: number;
  dailyGoalCorrect: number;
  days: string[];
  totalEmployees: number;
  /** Pagination total (filtered) */
  total?: number;
  page?: number;
  limit?: number;
  sparse?: boolean;
  averageMonthlyPercent: number;
  fullCompletedEmployees: number;
  employees: MonthlyPlanMatrixEmployee[];
};

export type YearlyPlanMatrixMonthCell = {
  month: string;
  daysInMonth: number;
  daysCompleted: number;
  percent: number;
  attempts: number;
  wrong: number;
  extraCorrect: number;
  label: string;
  percentLabel: string;
};

export type YearlyPlanMatrixEmployee = {
  userId: string;
  orgId?: string;
  orgName?: string;
  fullName: string;
  email: string;
  daysCompleted: number;
  daysInYear: number;
  yearlyPercent: number;
  extraCorrectTotal: number;
  attemptsTotal: number;
  wrongTotal: number;
  monthResults: YearlyPlanMatrixMonthCell[];
};

export type YearlyPlanMatrix = {
  orgId: string;
  orgName: string;
  year: string;
  months: string[];
  dailyGoalCorrect: number;
  totalEmployees: number;
  averageYearlyPercent: number;
  employees: YearlyPlanMatrixEmployee[];
};

export type BranchComparisonRow = {
  orgId: string;
  orgName: string;
  isDefault: boolean;
  totalEmployees: number;
  completedDays: number;
  averageMonthlyPercent: number;
  rank: number;
};

export type BranchComparison = {
  month: string;
  daysInMonth: number;
  dailyGoalCorrect: number;
  branches: BranchComparisonRow[];
};

export type AnalyticsStatus = 'green' | 'yellow' | 'red';

export type ExecutiveDashboard = {
  planDate: string;
  dailyGoalCorrect: number;
  totalPlan: number;
  completedTotal: number;
  extraCorrectTotal: number;
  remaining: number;
  completionPercent: number;
  totalEmployees: number;
  activeEmployees: number;
  completedEmployees: number;
  branchCount: number;
};

export type BranchRankingRow = {
  orgId: string;
  orgName: string;
  isDefault: boolean;
  totalEmployees: number;
  plan: number;
  completed: number;
  extraCorrect?: number;
  percent: number;
  completedEmployees: number;
  status: AnalyticsStatus;
  rank: number;
};

export type BranchRanking = {
  planDate: string;
  dailyGoalCorrect: number;
  branches: BranchRankingRow[];
};

export type DivisionSummaryRow = {
  division: string;
  totalEmployees: number;
  plan: number;
  completed: number;
  percent: number;
  completedEmployees: number;
  status: AnalyticsStatus;
};

export type DivisionSummary = {
  orgId: string;
  orgName: string;
  planDate: string;
  dailyGoalCorrect: number;
  totalEmployees: number;
  plan: number;
  completed: number;
  percent: number;
  divisions: DivisionSummaryRow[];
};

export type DailyReport = ExecutiveDashboard & {
  branches: BranchRankingRow[];
  employees: Array<{
    orgId: string;
    orgName: string;
    userId: string;
    fullName: string;
    answeredCount: number;
    planCorrect: number;
    extraCorrect: number;
    percent: number;
    completed: boolean;
    status: AnalyticsStatus;
  }>;
};

export type MonthlyReport = {
  month: string;
  daysInMonth: number;
  dailyGoalCorrect: number;
  branches: Array<{
    orgId: string;
    orgName: string;
    totalEmployees: number;
    averageMonthlyPercent: number;
    extraCorrectTotal: number;
    rank: number;
  }>;
  trend: DailyTrend['points'];
  employees: Array<{
    orgId: string;
    orgName: string;
    userId: string;
    fullName: string;
    email: string;
    daysCompleted: number;
    monthlyPercent: number;
    extraCorrectTotal: number;
    correctTotal: number;
    wrongTotal: number;
  }>;
};

export type EmployeeRankingRow = {
  userId: string;
  fullName: string;
  correct: number;
  planCorrect?: number;
  extraCorrect?: number;
  goal: number;
  percent: number;
  completed: boolean;
  status: AnalyticsStatus;
  rank: number;
};

export type EmployeeRanking = {
  orgId: string;
  planDate: string;
  division: string | null;
  dailyGoalCorrect: number;
  employees: EmployeeRankingRow[];
};

export type HourlyProgress = {
  planDate: string;
  orgId: string | null;
  points: Array<{ hour: number; label: string; completedEmployees: number }>;
  maxCompleted: number;
};

export type DailyTrend = {
  dailyGoalCorrect: number;
  points: Array<{ date: string; percent: number; completed: number; plan: number }>;
};

export type WeekdayHeatmapCell = {
  dow: number;
  label: string;
  percent: number;
  sampleDays: number;
  totalEmployees: number;
  status: AnalyticsStatus;
};

export type WeekdayHeatmap = {
  weekdays: string[];
  branches: Array<{
    orgId: string;
    orgName: string;
    isDefault: boolean;
    totalEmployees: number;
    cells: WeekdayHeatmapCell[];
  }>;
  rangeFrom?: string;
  rangeTo?: string;
  dailyGoalCorrect?: number;
};

export type Underperformers = {
  planDate: string;
  threshold: number;
  branchCount: number;
  divisionCount: number;
  employeeCount: number;
  branches: Array<{
    orgId: string;
    orgName: string;
    percent: number;
    divisions: Array<{ division: string; percent: number; employees: number }>;
  }>;
};

export type EmployeeAttemptRow = {
  id: string;
  questionId: string;
  prompt: string;
  type: QuestionType;
  levelTitle: string;
  theoryTitle: string;
  selectedOptionText: string | null;
  correctOptionText: string | null;
  isCorrect: boolean;
  answeredAt: string;
};

export type EmployeeAttemptsResponse = {
  orgId: string;
  userId: string;
  fullName: string;
  range: { from: string; to: string };
  total: number;
  correctTotal: number;
  wrongTotal: number;
  page: number;
  limit: number;
  items: EmployeeAttemptRow[];
};

export type Level = {
  id: string;
  title: string;
  orderIndex: number;
  isActive: boolean;
  createdById: string | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  positionLinks?: {
    id: string;
    positionId: string;
    position?: { id: string; title: string };
  }[];
  theories?: Theory[];
  questions?: Question[];
  createdAt: string;
  updatedAt: string;
};

export type TheorySlide = {
  head: string;
  items: string[];
  warn?: boolean;
};

export type TheoryRole = 'lesson' | 'nazariya';

export type Theory = {
  id: string;
  levelId: string;
  parentTheoryId?: string | null;
  title: string;
  orderIndex: number;
  content: string;
  slides?: TheorySlide[] | null;
  theoryRole?: TheoryRole | null;
  createdById: string | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  level?: { id: string; title: string; orderIndex: number };
  questions?: Question[];
  children?: Theory[];
  createdAt: string;
  updatedAt: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export type QuestionType = 'SINGLE_CHOICE' | 'YES_NO' | 'MATCHING';

export type QuestionOption = {
  id: string;
  questionId: string;
  optionText: string;
  orderIndex: number;
  isCorrect: boolean;
  matchText?: string | null;
};

export type Question = {
  id: string;
  levelId: string;
  theoryId: string;
  type: QuestionType;
  prompt: string;
  orderIndex: number;
  isActive: boolean;
  createdById: string | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  level?: { id: string; title: string };
  theory?: { id: string; title: string };
  options: QuestionOption[];
  /** Lavozim bog'lamalari — bo'sh bo'lsa savol barcha xodimlarga tushadi. */
  positionLinks?: {
    id: string;
    positionId: string;
    position?: { id: string; title: string };
  }[];
  createdAt: string;
  updatedAt: string;
};

export type Organization = {
  id: string;
  name: string;
  parentOrganizationId?: string | null;
  isDefault?: boolean;
  energoBranchId?: string | null;
  energoExternalId?: string | null;
  branchCode?: string | null;
  archivedAt?: string | null;
  users?: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    };
  }[];
  createdAt: string;
  updatedAt: string;
};

export type LevelFunnelItem = {
  levelId: string;
  levelTitle: string;
  orderIndex: number;
  totalStarted: number;
  totalCompleted: number;
};

export type QuestionError = {
  questionId: string;
  prompt: string;
  levelTitle: string;
  theoryTitle: string;
  totalAttempts: number;
  wrongAttempts: number;
  errorRate: number;
};

export type StudentBadge = {
  label: string;
  bolts: number;
};

export type StudentSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  /** USER | MODERATOR — moderatorlar ham plan topshiradi */
  role?: string;
  personnelNumber: string | null;
  /** Energo ID bo‘lim (division) */
  division?: string | null;
  /** Energo ID lavozim (post) */
  post?: string | null;
  /** KPI/hisobot soft-exclusion (DELETE emas) */
  reportActive?: boolean;
  completedLevels: number;
  totalXp: number;
  currentLevelId: string | null;
  currentLevelTitle: string | null;
  badge: StudentBadge;
  organizations: { id: string; name: string; reportActive?: boolean }[];
};

export type LevelProgress = {
  levelId: string;
  title: string;
  orderIndex: number;
  completionPercent: number;
  completedAt: string | null;
};

export type StudentDetail = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
  organizations: { id: string; name: string }[];
  totalXp: number;
  /** To‘g‘ri javob urinishlari soni (XP = correctAnswers * 10) */
  correctAnswers: number;
  /** Noyob to‘g‘ri javob berilgan savollar */
  uniqueCorrectQuestions: number;
  completedLevels: number;
  totalErrors: number;
  badge: StudentBadge;
  levelProgress: LevelProgress[];
  createdAt: string;
};

export type StudentXpHistoryItem = {
  id: string;
  questionId: string;
  prompt: string;
  levelTitle: string;
  theoryTitle: string;
  isCorrect: boolean;
  countsForXp?: boolean;
  attemptSource?: string | null;
  xpEarned: number;
  answeredAt: string;
};

export type StudentXpHistoryResponse = {
  data: StudentXpHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalXp: number;
  correctAnswers: number;
};

export type XpAnomalyUserRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  storedXp: number;
  expectedXp: number;
  offPlanCorrect: number;
  planCorrect: number;
  storedPlanCorrect: number;
  offPlanXpInflated: number;
  mismatchCount: number;
};

export type XpAnomalySample = {
  attemptId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  questionId: string;
  prompt: string;
  questionType: string;
  selectedOptionId: string | null;
  storedCorrect: boolean;
  expectedCorrect: boolean | null;
  countsForXp: boolean;
  expectedCountsForXp: boolean;
  attemptSource: string | null;
  heartLost: boolean;
  reason: string;
  answeredAt: string;
};

export type XpAnomalyAudit = {
  scannedAttempts: number;
  gradeableAttempts: number;
  mismatchAttempts: number;
  heartLostOnlyMismatches: number;
  orphanAttempts: number;
  matchingSkipped: number;
  planFlagMismatches: number;
  affectedUsers: number;
  totalStoredXp: number;
  totalExpectedXp: number;
  xpDelta: number;
  totalOffPlanCorrect: number;
  totalPlanCorrect: number;
  totalOffPlanXpInflated: number;
  dailyGoalCorrect: number;
  users: XpAnomalyUserRow[];
  samples: XpAnomalySample[];
};

export type XpAnomalyReconcileResult = {
  fixedGradeAttempts: number;
  fixedHeartLostAttempts: number;
  fixedPlanFlags: number;
  affectedUsers: number;
  beforeStoredXp: number;
  afterExpectedXp: number;
  xpDelta: number;
  offPlanXpRemoved: number;
  users: XpAnomalyUserRow[];
};

export type BlockedEmailLoginRow = {
  userId: string;
  login: string;
  firstName: string;
  lastName: string;
  role: string;
  energoId: string | null;
  hasEnergoId: boolean;
  loginBlocked: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  sessionCount: number;
  everLoggedIn: boolean;
  lastIpAddress?: string | null;
  lastUserAgent?: string | null;
};

export type BlockedEmailLoginsResponse = {
  total: number;
  blocked: number;
  withLoginHistory: number;
  neverLoggedIn: number;
  withIp?: number;
  users: BlockedEmailLoginRow[];
};

export type ReportSubmissionListItem = {
  id: string;
  organizationId: string;
  orgName: string;
  month: string;
  fileName: string;
  employeeCount: number;
  createdAt: string;
  integrityStatus?: 'ok' | 'tampered' | 'unsigned';
  contentHash?: string | null;
  exportId?: string | null;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

export type ReportSubmissionDetail = ReportSubmissionListItem & {
  payload: {
    orgId: string;
    orgName: string;
    month: string;
    daysInMonth: number;
    dailyGoalCorrect: number;
    employees: Array<{
      email: string;
      fullName: string;
      daysCompleted: number;
      monthlyPercent: number;
      extraCorrectTotal: number;
      dayLabels: string[];
    }>;
  };
};

export type ReportSubmissionCompareResult = {
  submission: ReportSubmissionListItem;
  integrity?: {
    status: 'ok' | 'tampered' | 'unsigned';
    contentHash: string | null;
    exportId: string | null;
    message: string;
  };
  system: {
    orgId: string;
    orgName: string;
    month: string;
    totalEmployees: number;
    averageMonthlyPercent: number;
  };
  summary: {
    matched: number;
    mismatched: number;
    onlyInUpload: number;
    onlyInSystem: number;
    total: number;
  };
  rows: Array<{
    email: string;
    fullName: string;
    status: 'match' | 'mismatch' | 'only_upload' | 'only_system';
    uploaded: {
      email: string;
      fullName: string;
      daysCompleted: number;
      monthlyPercent: number;
      extraCorrectTotal: number;
      dayLabels: string[];
    } | null;
    system: {
      email: string;
      fullName: string;
      daysCompleted: number;
      monthlyPercent: number;
      extraCorrectTotal: number;
      dayLabels: string[];
    } | null;
    diffs: string[];
  }>;
};

export type LostQuestion = {
  questionId: string;
  prompt: string;
  levelTitle: string;
  theoryTitle: string;
  wrongCount: number;
  totalAttempts: number;
};

export type ActivityDay = {
  date: string;
  count: number;
};

// ─── Audio Library (Admin) ────────────────────────────────────────────────
export type AdminAudioBookRow = {
  id: string;
  title: string;
  coverUrl: string | null;
  audioUrl: string | null;
  description: string | null;
  isActive: boolean;
  chaptersCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminAudioParagraph = {
  id: string;
  text: string;
  order: number;
  chapterId: string;
  audioUrl: string;
};

export type AdminAudioChapter = {
  id: string;
  title: string;
  order: number;
  bookId: string;
  paragraphs: AdminAudioParagraph[];
};

export type AdminAudioBookDetail = {
  id: string;
  title: string;
  coverUrl: string | null;
  audioUrl: string | null;
  description: string | null;
  isActive: boolean;
  chapters: AdminAudioChapter[];
};

export type CrudPermissions = {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
};

export type ModeratorPermissions = {
  contentLevels: CrudPermissions;
  contentTheories: CrudPermissions;
  contentQuestions: CrudPermissions;
  organizations: CrudPermissions;
  students: CrudPermissions;
  users: CrudPermissions;
  moderators: CrudPermissions;
  profile: CrudPermissions;
  exams: CrudPermissions;
  audioLibrary: CrudPermissions;
  analytics: CrudPermissions;
  permissions: CrudPermissions;
  violations: CrudPermissions;
  logs: CrudPermissions;
  nesSync: CrudPermissions;
  aiAssistant: CrudPermissions;
};

export type ModeratorPermissionRecord = {
  id: string;
  moderatorUserId: string;
  permissions: ModeratorPermissions;
  createdAt: string;
  updatedAt: string;
};

export type ModeratorViolationRow = {
  id: string;
  moderatorUserId: string;
  moderator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  organizationId: string | null;
  actionKey: string;
  method: string;
  path: string;
  ip: string | null;
  userAgent: string | null;
  requestBodyPreview: string | null;
  createdAt: string;
};

export type ModeratorViolationsResponse = {
  data: ModeratorViolationRow[];
  total: number;
  page: number;
  limit: number;
  from: string;
  to: string;
};

export type AdminAuditLogRow = {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  actorOrganizationIds: string[];
  method: string;
  path: string;
  statusCode: number;
  errorMessage: string | null;
  requestBodyPreview: string | null;
  ip: string | null;
  userAgent: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type AdminAuditLogsResponse = {
  data: AdminAuditLogRow[];
  total: number;
  page: number;
  limit: number;
  from: string;
  to: string;
};

export type Position = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type NesDepartment = {
  id: string;
  name: string;
  employeeCount: number;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TerminatedEmployee = {
  id: string;
  userId: string;
  energoId: string | null;
  personnelNumber: string | null;
  login: string;
  firstName: string;
  lastName: string;
  organizationName: string | null;
  division: string;
  post: string;
  terminatedAt: string;
  createdAt: string;
};

export type ExamType = 'SCHEDULED' | 'EXTRA';

export type Exam = {
  id: string;
  title: string;
  description: string | null;
  examType: ExamType;
  isActive: boolean;
  includesPt?: boolean;
  includesTb?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExamQuestionOption = {
  id: string;
  optionText: string;
  orderIndex: number;
  matchText: string | null;
};

export type ExamQuestionSection = 'PT' | 'TB';
export type ExamQuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type ExamQuestionCatalog = {
  id: string;
  title: string;
  section: ExamQuestionSection;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ExamQuestion = {
  id: string;
  prompt: string;
  type: QuestionType;
  isActive: boolean;
  tags: string[] | null;
  section?: ExamQuestionSection;
  difficulty?: ExamQuestionDifficulty;
  catalogId?: string | null;
  catalog?: ExamQuestionCatalog | null;
  options: ExamQuestionOption[];
  createdAt: string;
  updatedAt: string;
};

export type UpcomingExamAssignment = {
  id: string;
  examId: string;
  organizationId: string;
  userId: string;
  suggestedAt: string;
  windowStart: string;
  windowEnd: string;
  scheduledAt: string | null;
  status: string;
  includesPt?: boolean;
  includesTb?: boolean;
  qrToken?: string | null;
  qrExpiresAt?: string | null;
  extraReason?: string | null;
  exam?: { id: string; title: string; examType: ExamType };
  user?: { id: string; firstName: string; lastName: string; email: string };
};

export type ExamLivePendingSession = {
  sessionId: string;
  assignmentId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  organizationName: string | null;
  examTitle: string | null;
  includesPt: boolean;
  includesTb: boolean;
  suggestedAt: string;
  createdAt: string;
};

export type ExamLiveAwaitingOralRow = {
  sessionId: string;
  attemptId: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  organizationName: string | null;
  examTitle: string | null;
  scorePercent: number | null;
  ptScorePercent: number | null;
  tbScorePercent: number | null;
};

export type OralResult = 'SATISFACTORY' | 'UNSATISFACTORY';

export type SuperadminAttemptSummary = {
  id: string;
  createdAt: string;
  userName: string | null;
  examTitle: string | null;
  ptScorePercent: number | null;
  tbScorePercent: number | null;
  finalizedAt: string | null;
};

export type SuperadminAttemptDetailResponse = {
  attempt: {
    id: string;
    ptScorePercent: number | null;
    tbScorePercent: number | null;
    scorePercent: number | null;
    user: { id: string; name: string; email: string } | null;
  };
  answers: Array<{
    orderIndex: number;
    section: string;
    prompt: string | undefined;
    selectedOptionId: string;
    selectedText: string | undefined;
    isCorrect: boolean;
  }>;
};

export type HeartsLostAnalyticsResponse = {
  orgId: string;
  range: { from: string; to: string };
  byUser: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    lostHearts: number;
  }>;
  byQuestion: Array<{
    questionId: string;
    prompt: string;
    levelTitle: string;
    theoryTitle: string;
    lostHearts: number;
  }>;
};

export type LeaderboardRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  xp: number;
  correctAnswers?: number;
  rank: number;
};

export type LeaderboardResponse = {
  scope: 'global' | 'organization';
  orgId: string | null;
  me: LeaderboardRow | null;
  top: LeaderboardRow[];
};

export type NesEmployee = {
  id: string;
  personnelNumber: string;
  organizationName: string;
  division: string;
  post: string;
  fullName: string;
  login: string;
  initialPassword: string | null;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type NesEmployeeSyncResponse = {
  started?: boolean;
  running?: boolean;
  skipped?: boolean;
  reason?: string;
  success?: boolean;
  sync?: NesEmployeesSyncStatus;
};

export type NesEmployeesSyncStatus = {
  running: boolean;
  phase?: 'UPSERT' | 'FINALIZING';
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  processed: number;
  current: number;
  total: number;
  upserted: number;
  hidden: number;
  progressPercent: number;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
};

export type NesEmployeesSyncHealth = {
  runningSync: NesEmployeesSyncStatus | null;
  latestSync: NesEmployeesSyncStatus | null;
};

class ApiService {
  public api: ReturnType<typeof axios.create>;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: activeApiBaseUrl,
      // 60s — odatdagi data so'rovlar uchun. Fayl yuklash uchun
      // call-site da timeout override qilinishi kerak (uploadFile).
      timeout: 60_000,
      headers: {
        'Content-Type': 'application/json',
        // Admin API: brauzer HTTP 304 keshini ishlatmasin (firewall/tunnel/localhost bir xil)
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      }
    });

    // Request interceptor - Add token to headers
    this.api.interceptors.request.use(
      (config) => {
        config.baseURL = activeApiBaseUrl;
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        // GET larda har doim yangi javob so‘rash (304 + eski body muammosi)
        if ((config.method ?? 'get').toLowerCase() === 'get') {
          config.headers['Cache-Control'] = 'no-cache';
          config.headers.Pragma = 'no-cache';
          config.headers['If-None-Match'] = undefined;
          config.headers['If-Modified-Since'] = undefined;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors + global notifications
    this.api.interceptors.response.use(
      (response) => response,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (error: any) => {
        const originalRequest = error.config as
          | (typeof error.config & { _retry?: boolean; _apiFailover?: boolean })
          | undefined;
        const status = error.response?.status;

        // Asosiy domen ishlamasa — rezerv IP ga o‘tish
        if (originalRequest && !originalRequest._apiFailover && shouldFailoverToReserve(error)) {
          const nextBase = otherApiBaseUrl(originalRequest.baseURL || activeApiBaseUrl);
          if (nextBase) {
            originalRequest._apiFailover = true;
            setActiveApiBaseUrl(nextBase);
            this.api.defaults.baseURL = nextBase;
            originalRequest.baseURL = nextBase;
            return this.api(originalRequest);
          }
        }

        // 401 — try refresh token first
        if (status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const accessToken = await this.refreshAccessToken();
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            this.clearSession();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Global error notification for all non-success responses
        showErrorNotification(error);

        return Promise.reject(error);
      }
    );
  }

  // ===== Auth (ElektroLearn backend) =====
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>('/auth/admin/login', {
      email,
      password
    });

    const payload = response.data;
    localStorage.setItem('accessToken', payload.data.accessToken);
    localStorage.setItem('refreshToken', payload.data.refreshToken);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(payload.data.user));

    return payload;
  }

  async getEnergoIdAuthorizeUrl(client: 'mobile' | 'web' = 'web') {
    const callbackOrigin =
      typeof window !== 'undefined' ? window.location.origin : undefined;
    const response = await this.api.get<{
      authorizeUrl: string;
      redirectUri: string;
      state: string;
      codeVerifier?: string;
      client: 'mobile' | 'web';
    }>('/auth/energo-id/authorize-url', {
      params: {
        client,
        ...(callbackOrigin ? { callback_origin: callbackOrigin } : {}),
      },
    });
    return response.data;
  }

  async exchangeAdminEnergoIdCode(
    code: string,
    redirectUri?: string,
    state?: string,
    client?: 'mobile' | 'web',
    codeVerifier?: string,
  ): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>(
      '/auth/admin/energo-id/exchange',
      {
        onetime: code,
        code,
        redirect_uri: redirectUri,
        state,
        client,
        code_verifier: codeVerifier,
      },
    );
    const payload = response.data;
    localStorage.setItem('accessToken', payload.data.accessToken);
    localStorage.setItem('refreshToken', payload.data.refreshToken);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(payload.data.user));
    return payload;
  }

  async startEnergoIdLogin() {
    const { authorizeUrl, redirectUri, state, codeVerifier, client } =
      await this.getEnergoIdAuthorizeUrl('web');
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_redirect_uri', redirectUri);
    localStorage.setItem('oauth_client', client);
    if (codeVerifier) {
      localStorage.setItem('oauth_code_verifier', codeVerifier);
    } else {
      localStorage.removeItem('oauth_code_verifier');
    }
    window.location.href = authorizeUrl;
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      this.clearSession();
      return;
    }

    await this.api.post('/auth/logout', { refreshToken });
    this.clearSession();
  }

  async me(): Promise<UserProfile> {
    const response = await this.api.get<UserProfile>('/auth/me');
    return response.data;
  }

  async adminPing() {
    const response = await this.api.get('/admin/ping');
    return response.data;
  }

  async uploadMyAvatar(
    file: File
  ): Promise<{ success: boolean; avatarUrl: string }> {
    const form = new FormData();
    form.append('file', file);
    form.append('hasFace', 'true');
    const response = await this.api.post<{
      success: boolean;
      avatarUrl: string;
    }>('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 5 * 60 * 1000,
    });
    return response.data;
  }

  async uploadUserAvatar(
    userId: string,
    file: File,
    meta?: { hasFace?: boolean; faceConfidence?: number },
  ): Promise<{ success: boolean; avatarUrl: string; userId: string }> {
    const form = new FormData();
    form.append('file', file);
    if (meta?.hasFace != null) {
      form.append('hasFace', meta.hasFace ? 'true' : 'false');
    }
    if (meta?.faceConfidence != null) {
      form.append('faceConfidence', String(meta.faceConfidence));
    }
    const response = await this.api.post<{
      success: boolean;
      avatarUrl: string;
      userId: string;
    }>(`/users/${userId}/avatar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 5 * 60 * 1000,
    });
    return response.data;
  }

  // ─── Generic media uploads (audio/video/image) ─────────────────────────
  async adminUploadAudio(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{
    success: boolean;
    url: string;
    size: number;
    mimeType: string;
    originalName: string;
  }> {
    const form = new FormData();
    form.append('file', file);
    const response = await this.api.post<{
      success: boolean;
      url: string;
      size: number;
      mimeType: string;
      originalName: string;
    }>('/admin/upload/audio', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 15 * 60 * 1000,
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return;
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    return response.data;
  }

  async adminUploadVideo(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{
    success: boolean;
    url: string;
    size: number;
    mimeType: string;
    originalName: string;
  }> {
    const form = new FormData();
    form.append('file', file);
    const response = await this.api.post<{
      success: boolean;
      url: string;
      size: number;
      mimeType: string;
      originalName: string;
    }>('/admin/upload/video', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 15 * 60 * 1000,
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return;
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    return response.data;
  }

  async adminUploadImage(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{
    success: boolean;
    url: string;
    size: number;
    mimeType: string;
    originalName: string;
  }> {
    const form = new FormData();
    form.append('file', file);
    const response = await this.api.post<{
      success: boolean;
      url: string;
      size: number;
      mimeType: string;
      originalName: string;
    }>('/admin/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 15 * 60 * 1000,
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return;
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    return response.data;
  }

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
  }): Promise<UserProfile> {
    const response = await this.api.patch<UserProfile>('/auth/me', data);
    return response.data;
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post<{ success: boolean; message: string }>(
      '/auth/change-password',
      data
    );
    return response.data;
  }

  async getAnalyticsSummary(orgId: string): Promise<AnalyticsSummary> {
    const response = await this.api.get<AnalyticsSummary>(
      `/admin/analytics/summary`,
      { params: { orgId } }
    );
    return response.data;
  }

  async getHomeOverview(): Promise<HomeOverview> {
    const response = await this.api.get<HomeOverview>('/admin/analytics/home-overview');
    const data = response.data;
    return {
      scopeLabel: data?.scopeLabel ?? '',
      branchHeatmap: data?.branchHeatmap ?? [],
      mostActiveBranch: data?.mostActiveBranch ?? null,
      topErrorBranches: data?.topErrorBranches ?? [],
      insight: data?.insight,
    };
  }

  async getLevelFunnel(orgId: string): Promise<LevelFunnelItem[]> {
    const response = await this.api.get<LevelFunnelItem[]>(
      '/admin/analytics/level-funnel',
      { params: { orgId } }
    );
    return Array.isArray(response.data) ? response.data : [];
  }

  async getQuestionErrors(orgId: string): Promise<QuestionError[]> {
    const response = await this.api.get<QuestionError[]>(
      '/admin/analytics/questions',
      { params: { orgId } }
    );
    return Array.isArray(response.data) ? response.data : [];
  }

  async getHeartsLostAnalytics(params: {
    range: 'today' | 'month' | 'year';
    orgId?: string;
  }): Promise<HeartsLostAnalyticsResponse> {
    const response = await this.api.get<HeartsLostAnalyticsResponse>(
      '/admin/analytics/hearts-lost',
      { params }
    );
    return response.data;
  }

  async getBranchAnalyticsSummary(params: {
    orgId: string;
    from?: string;
    to?: string;
  }): Promise<BranchAnalyticsSummary> {
    const response = await this.api.get<BranchAnalyticsSummary>(
      '/admin/branch-analytics/summary',
      { params },
    );
    return response.data;
  }

  async getBranchActivityMatrix(params: {
    orgId: string;
    from?: string;
    to?: string;
  }): Promise<BranchActivityMatrix> {
    const response = await this.api.get<BranchActivityMatrix>(
      '/admin/branch-analytics/activity-matrix',
      { params },
    );
    return response.data;
  }

  async getBranchDailyPlanResult(params: {
    orgId: string;
    date?: string;
  }): Promise<BranchDailyPlanResult> {
    const response = await this.api.get<BranchDailyPlanResult>(
      '/admin/branch-analytics/daily-plan-result',
      { params },
    );
    return response.data;
  }

  async getBranchEmployeeAttempts(params: {
    orgId: string;
    userId: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<EmployeeAttemptsResponse> {
    const response = await this.api.get<EmployeeAttemptsResponse>(
      '/admin/branch-analytics/employee-attempts',
      { params },
    );
    return response.data;
  }

  async getBranchMonthlyProgress(params: {
    orgId: string;
    month?: string;
  }): Promise<BranchMonthlyProgress> {
    const response = await this.api.get<BranchMonthlyProgress>(
      '/admin/branch-analytics/monthly-progress',
      { params },
    );
    return response.data;
  }

  async getMonthlyPlanMatrix(params: {
    orgId?: string;
    month?: string;
    userId?: string;
    page?: number;
    limit?: number;
    search?: string;
    date?: string;
  }): Promise<MonthlyPlanMatrix> {
    const response = await this.api.get<MonthlyPlanMatrix>(
      '/admin/branch-analytics/monthly-plan-matrix',
      { params },
    );
    return response.data;
  }

  async getYearlyPlanMatrix(params: {
    orgId?: string;
    year?: string;
  }): Promise<YearlyPlanMatrix> {
    const response = await this.api.get<YearlyPlanMatrix>(
      '/admin/branch-analytics/yearly-plan-matrix',
      { params },
    );
    return response.data;
  }

  async getBranchComparison(params: {
    month?: string;
  }): Promise<BranchComparison> {
    const response = await this.api.get<BranchComparison>(
      '/admin/branch-analytics/branch-comparison',
      { params },
    );
    return response.data;
  }

  async getExecutiveDashboard(params?: { date?: string }): Promise<ExecutiveDashboard> {
    const response = await this.api.get<ExecutiveDashboard>(
      '/admin/branch-analytics/executive-dashboard',
      { params },
    );
    return response.data;
  }

  async getBranchRanking(params?: { date?: string }): Promise<BranchRanking> {
    const response = await this.api.get<BranchRanking>(
      '/admin/branch-analytics/branch-ranking',
      { params },
    );
    return response.data;
  }

  async getDivisionSummary(params: {
    orgId: string;
    date?: string;
  }): Promise<DivisionSummary> {
    const response = await this.api.get<DivisionSummary>(
      '/admin/branch-analytics/division-summary',
      { params },
    );
    return response.data;
  }

  async getEmployeeRanking(params: {
    orgId: string;
    date?: string;
    division?: string;
  }): Promise<EmployeeRanking> {
    const response = await this.api.get<EmployeeRanking>(
      '/admin/branch-analytics/employee-ranking',
      { params },
    );
    return response.data;
  }

  async getHourlyProgress(params?: {
    date?: string;
    orgId?: string;
  }): Promise<HourlyProgress> {
    const response = await this.api.get<HourlyProgress>(
      '/admin/branch-analytics/hourly-progress',
      { params },
    );
    return response.data;
  }

  async getDailyTrend(params?: {
    from?: string;
    to?: string;
    orgId?: string;
  }): Promise<DailyTrend> {
    const { orgId, ...rest } = params ?? {};
    const response = await this.api.get<DailyTrend>(
      '/admin/branch-analytics/daily-trend',
      {
        params: {
          ...rest,
          ...(orgId && orgId !== 'all' ? { orgId } : {}),
        },
      },
    );
    return response.data;
  }

  async getWeekdayHeatmap(params?: {
    from?: string;
    to?: string;
    orgId?: string;
  }): Promise<WeekdayHeatmap> {
    const response = await this.api.get<WeekdayHeatmap>(
      '/admin/branch-analytics/weekday-heatmap',
      { params },
    );
    return response.data;
  }

  async getUnderperformers(params?: {
    date?: string;
    threshold?: number;
  }): Promise<Underperformers> {
    const response = await this.api.get<Underperformers>(
      '/admin/branch-analytics/underperformers',
      { params },
    );
    return response.data;
  }

  async getDailyReport(params?: {
    date?: string;
    orgId?: string;
  }): Promise<DailyReport> {
    const response = await this.api.get<DailyReport>(
      '/admin/branch-analytics/daily-report',
      { params },
    );
    return response.data;
  }

  async getMonthlyReport(params?: {
    month?: string;
    orgId?: string;
  }): Promise<MonthlyReport> {
    const response = await this.api.get<MonthlyReport>(
      '/admin/branch-analytics/monthly-report',
      { params },
    );
    return response.data;
  }

  async downloadDailyReportExcel(params: {
    date?: string;
    orgId?: string;
    filename?: string;
  }) {
    const response = await this.api.get(
      '/admin/branch-analytics/export/daily-report',
      {
        params: { date: params.date, orgId: params.orgId },
        responseType: 'blob',
      },
    );
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = params.filename ?? `kunlik-${params.date ?? 'report'}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async downloadMonthlyReportExcel(params: {
    month?: string;
    orgId?: string;
    filename?: string;
  }) {
    const response = await this.api.get(
      '/admin/branch-analytics/export/monthly-report',
      {
        params: { month: params.month, orgId: params.orgId },
        responseType: 'blob',
      },
    );
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = params.filename ?? `oylik-${params.month ?? 'report'}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async downloadBranchMonthlyProgressExcel(params: {
    orgId: string;
    month?: string;
    filename?: string;
  }) {
    const response = await this.api.get(
      '/admin/branch-analytics/export/monthly-progress',
      {
        params: { orgId: params.orgId, month: params.month },
        responseType: 'blob',
      },
    );
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = params.filename ?? `${params.month ?? 'monthly'}-progress.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async downloadMonthlyPlanMatrixExcel(params: {
    orgId?: string;
    month?: string;
    period?: 'daily' | 'monthly';
    date?: string;
    userId?: string;
    showFilial?: boolean;
    filename?: string;
  }) {
    const response = await this.api.get(
      '/admin/branch-analytics/export/monthly-plan-matrix',
      {
        params: {
          orgId: params.orgId,
          month: params.month,
          period: params.period,
          date: params.date,
          userId: params.userId,
          showFilial: params.showFilial ? 'true' : 'false',
        },
        responseType: 'blob',
      },
    );
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      params.filename ??
      (params.period === 'daily'
        ? `${params.date ?? 'day'}-kunlik-reja.xlsx`
        : `${params.month ?? 'month'}-oylik-reja.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async downloadYearlyPlanMatrixExcel(params: {
    orgId?: string;
    year?: string;
    userId?: string;
    showFilial?: boolean;
    filename?: string;
  }) {
    const response = await this.api.get(
      '/admin/branch-analytics/export/yearly-plan-matrix',
      {
        params: {
          orgId: params.orgId,
          year: params.year,
          userId: params.userId,
          showFilial: params.showFilial ? 'true' : 'false',
        },
        responseType: 'blob',
      },
    );
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      params.filename ?? `${params.year ?? 'year'}-yillik-reja.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private async downloadJson(path: string, filename: string) {
    const response = await this.api.get(path, { responseType: 'blob' });
    const blob = new Blob([response.data], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async exportContentBundle() {
    await this.downloadJson(
      '/admin/import-export/content/export',
      'elektrolearn-kontent.json',
    );
  }

  async importContentBundle(file: File, replace = false) {
    const form = new FormData();
    form.append('file', file);
    const response = await this.api.post(
      `/admin/import-export/content/import?replace=${replace ? 'true' : 'false'}`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      },
    );
    return response.data as {
      success: boolean;
      levels: { created: number; updated: number };
      theories: { created: number; updated: number };
      questions: { created: number; updated: number };
      options: { created: number; updated: number };
      errors: string[];
    };
  }

  async exportModeratorsBundle() {
    await this.downloadJson(
      '/admin/import-export/moderators/export',
      'elektrolearn-moderatorlar.json',
    );
  }

  async importModeratorsBundle(file: File) {
    const form = new FormData();
    form.append('file', file);
    const response = await this.api.post(
      '/admin/import-export/moderators/import',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      },
    );
    return response.data as {
      success: boolean;
      created: number;
      updated: number;
      skipped: number;
      errors: string[];
    };
  }

  async getOAuthIntegration() {
    const response = await this.api.get('/admin/import-export/oauth/integration');
    return response.data as {
      mobileRedirectUri: string;
      webRedirectUri: string;
      callbackPath: string;
      scopes: string;
      templates: {
        authorizeUrl: string;
        callbackMobile: string;
        callbackWeb: string;
      };
      endpoints: {
        authorizeUrl: string;
        exchange: string;
      };
      energoIdHealth: { configured: boolean; reachable: boolean };
      deployChecklist: {
        message: string;
        requiredRedirectUrls: string[];
      };
    };
  }

  async updateOAuthIntegration(data: {
    mobileRedirectUri?: string;
    webRedirectUri?: string;
    oauthScopes?: string;
  }) {
    const response = await this.api.patch(
      '/admin/import-export/oauth/integration',
      data,
    );
    return response.data;
  }

  async exportOAuthEnvBundle() {
    const response = await this.api.get(
      '/admin/import-export/oauth/integration/env-export',
      { responseType: 'blob' },
    );
    const blob = new Blob([response.data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'elektrolearn-energo-id-oauth.env';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async getAiChatStatus(): Promise<{
    provider: string;
    openRouterConfigured: boolean;
    ollamaConfigured: boolean;
    openRouterModel: string;
    ollamaModel: string;
    ollamaBaseUrl: string;
    ready: boolean;
  }> {
    const response = await this.api.get('/ai-chat/status');
    return response.data;
  }

  async getMyModeratorPermissions(): Promise<{
    permissions: ModeratorPermissions | null;
  }> {
    const response = await this.api.get<{
      permissions: ModeratorPermissions | null;
    }>('/admin/my-permissions');
    return response.data;
  }

  async getModeratorPermissions(
    moderatorId: string
  ): Promise<ModeratorPermissionRecord> {
    const response = await this.api.get<ModeratorPermissionRecord>(
      `/admin/moderator-permissions/${moderatorId}`
    );
    return response.data;
  }

  async updateModeratorPermissions(
    moderatorId: string,
    permissions: ModeratorPermissions
  ): Promise<ModeratorPermissionRecord> {
    const response = await this.api.put<ModeratorPermissionRecord>(
      `/admin/moderator-permissions/${moderatorId}`,
      { permissions }
    );
    return response.data;
  }

  async getModeratorViolations(params: {
    range: 'today' | 'month' | 'year';
    moderatorId?: string;
    page?: number;
    limit?: number;
  }): Promise<ModeratorViolationsResponse> {
    const response = await this.api.get<ModeratorViolationsResponse>(
      '/admin/moderator-violations',
      { params }
    );
    return response.data;
  }

  async getAdminAuditLogs(params: {
    range: 'today' | 'month' | 'year';
    actorId?: string;
    orgId?: string;
    statusCode?: number;
    page?: number;
    limit?: number;
  }): Promise<AdminAuditLogsResponse> {
    const response = await this.api.get<AdminAuditLogsResponse>(
      '/admin/audit-logs',
      { params }
    );
    return response.data;
  }

  // ===== Exams / Positions =====
  async getPositions(): Promise<Position[]> {
    const response = await this.api.get<Position[]>('/admin/positions');
    return response.data;
  }

  async createPosition(data: { title: string }): Promise<Position> {
    const response = await this.api.post<Position>('/admin/positions', data);
    return response.data;
  }

  async updatePosition(
    id: string,
    data: { title?: string }
  ): Promise<Position> {
    const response = await this.api.put<Position>(
      `/admin/positions/${id}`,
      data
    );
    return response.data;
  }

  async deletePosition(id: string): Promise<void> {
    await this.api.delete(`/admin/positions/${id}`);
  }

  async getExams(): Promise<Exam[]> {
    const response = await this.api.get<Exam[]>('/admin/exams');
    return response.data;
  }

  async createExam(data: {
    title: string;
    description?: string;
    examType: ExamType;
    isActive?: boolean;
    includesPt?: boolean;
    includesTb?: boolean;
    assigneeUserId?: string;
    assigneeOrganizationId?: string;
  }): Promise<Exam> {
    const response = await this.api.post<Exam>('/admin/exams', data);
    return response.data;
  }

  async updateExam(
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      examType: ExamType;
      isActive: boolean;
      includesPt: boolean;
      includesTb: boolean;
    }>
  ): Promise<Exam> {
    const response = await this.api.put<Exam>(`/admin/exams/${id}`, data);
    return response.data;
  }

  async deleteExam(id: string): Promise<void> {
    await this.api.delete(`/admin/exams/${id}`);
  }

  async getExamQuestionCatalogs(): Promise<ExamQuestionCatalog[]> {
    const response = await this.api.get<ExamQuestionCatalog[]>(
      '/admin/exam-question-catalogs'
    );
    return response.data;
  }

  async createExamQuestionCatalog(data: {
    title: string;
    section: ExamQuestionSection;
    sortOrder?: number;
  }): Promise<ExamQuestionCatalog> {
    const response = await this.api.post<ExamQuestionCatalog>(
      '/admin/exam-question-catalogs',
      data
    );
    return response.data;
  }

  async updateExamQuestionCatalog(
    id: string,
    data: Partial<{
      title: string;
      section: ExamQuestionSection;
      sortOrder: number;
    }>
  ): Promise<ExamQuestionCatalog> {
    const response = await this.api.put<ExamQuestionCatalog>(
      `/admin/exam-question-catalogs/${id}`,
      data
    );
    return response.data;
  }

  async deleteExamQuestionCatalog(id: string): Promise<void> {
    await this.api.delete(`/admin/exam-question-catalogs/${id}`);
  }

  async getExamQuestions(catalogId?: string): Promise<ExamQuestion[]> {
    const response = await this.api.get<ExamQuestion[]>(
      '/admin/exam-questions',
      {
        params: catalogId ? { catalogId } : undefined
      }
    );
    return response.data;
  }

  async createExamQuestion(data: {
    prompt: string;
    type: QuestionType;
    isActive?: boolean;
    tags?: string[] | null;
    positionIds?: string[];
    section?: ExamQuestionSection;
    difficulty?: ExamQuestionDifficulty;
    catalogId?: string;
    options: Array<{
      optionText: string;
      matchText?: string | null;
      isCorrect?: boolean;
      orderIndex?: number;
    }>;
  }): Promise<ExamQuestion> {
    const response = await this.api.post<ExamQuestion>(
      '/admin/exam-questions',
      data
    );
    return response.data;
  }

  async deleteExamQuestion(id: string): Promise<void> {
    await this.api.delete(`/admin/exam-questions/${id}`);
  }

  async getUpcomingExams(params?: {
    orgId?: string;
  }): Promise<UpcomingExamAssignment[]> {
    const response = await this.api.get<UpcomingExamAssignment[]>(
      '/admin/exams/upcoming',
      { params }
    );
    return response.data;
  }

  async scheduleExamAssignment(
    id: string,
    scheduledAt: string
  ): Promise<UpcomingExamAssignment> {
    const response = await this.api.post<UpcomingExamAssignment>(
      `/admin/exam-assignments/${id}/schedule`,
      { scheduledAt }
    );
    return response.data;
  }

  async getExamLivePending(): Promise<ExamLivePendingSession[]> {
    const response = await this.api.get<ExamLivePendingSession[]>(
      '/exams/live/moderator/pending'
    );
    return response.data;
  }

  async getExamLiveAwaitingOral(): Promise<ExamLiveAwaitingOralRow[]> {
    const response = await this.api.get<ExamLiveAwaitingOralRow[]>(
      '/exams/live/moderator/awaiting-oral'
    );
    return response.data;
  }

  async approveExamSession(
    sessionId: string
  ): Promise<{ ok: boolean; expiresAt: string; code: string }> {
    const response = await this.api.post<{
      ok: boolean;
      expiresAt: string;
      code: string;
    }>(`/exams/live/moderator/sessions/${sessionId}/approve`);
    return response.data;
  }

  async rejectExamSession(
    sessionId: string,
    reason: string
  ): Promise<{ ok: boolean }> {
    const response = await this.api.post<{ ok: boolean }>(
      `/exams/live/moderator/sessions/${sessionId}/reject`,
      { reason }
    );
    return response.data;
  }

  async finalizeExamOral(
    attemptId: string,
    body: {
      oralResult: OralResult;
      oralFeedback: string;
      nextExamMonths: number;
    }
  ): Promise<{ ok: boolean; nextSuggestedAt: string }> {
    const response = await this.api.post<{
      ok: boolean;
      nextSuggestedAt: string;
    }>(`/exams/live/moderator/attempts/${attemptId}/finalize-oral`, body);
    return response.data;
  }

  async createExtraExamAssignment(body: {
    userId: string;
    organizationId: string;
    includesPt: boolean;
    includesTb: boolean;
    reason: string;
  }): Promise<UpcomingExamAssignment> {
    const response = await this.api.post<UpcomingExamAssignment>(
      '/exams/live/admin/extra-assignment',
      body
    );
    return response.data;
  }

  async getSuperadminRecentAttempts(): Promise<SuperadminAttemptSummary[]> {
    const response = await this.api.get<SuperadminAttemptSummary[]>(
      '/exams/live/superadmin/recent-attempts'
    );
    return response.data;
  }

  async getSuperadminAttemptDetail(
    attemptId: string
  ): Promise<SuperadminAttemptDetailResponse> {
    const response = await this.api.get<SuperadminAttemptDetailResponse>(
      `/exams/live/superadmin/attempts/${attemptId}/detail`
    );
    return response.data;
  }

  async getBasket(): Promise<{
    positions: Position[];
    exams: Exam[];
    examQuestions: ExamQuestion[];
  }> {
    const response = await this.api.get<{
      positions: Position[];
      exams: Exam[];
      examQuestions: ExamQuestion[];
    }>('/admin/basket');
    return response.data;
  }

  async restoreBasketItem(
    type: 'positions' | 'exams' | 'exam-questions',
    id: string
  ): Promise<void> {
    await this.api.post(`/admin/basket/${type}/${id}/restore`);
  }

  async purgeBasketItem(
    type: 'positions' | 'exams' | 'exam-questions',
    id: string
  ): Promise<void> {
    await this.api.delete(`/admin/basket/${type}/${id}/purge`);
  }

  async getAdminGlobalLeaderboard(limit = 50): Promise<LeaderboardResponse> {
    const response = await this.api.get<LeaderboardResponse>(
      '/admin/leaderboard/global',
      { params: { limit } }
    );
    return response.data;
  }

  async getAdminOrganizationLeaderboard(params: {
    orgId?: string;
    limit?: number;
  }): Promise<LeaderboardResponse> {
    const response = await this.api.get<LeaderboardResponse>(
      '/admin/leaderboard/organization',
      { params }
    );
    return response.data;
  }

  // ===== Levels =====
  async getLevels(filters?: { search?: string }): Promise<Level[]> {
    const response = await this.api.get<Level[]>('/admin/levels', {
      params: filters
    });
    return response.data;
  }

  async getLevelById(id: string): Promise<Level> {
    const response = await this.api.get<Level>(`/admin/levels/${id}`);
    return response.data;
  }

  async createLevel(data: {
    title: string;
    orderIndex?: number;
    isActive?: boolean;
    positionIds?: string[];
  }): Promise<Level> {
    const response = await this.api.post<Level>('/admin/levels', data);
    return response.data;
  }

  async updateLevel(
    id: string,
    data: {
      title?: string;
      orderIndex?: number;
      isActive?: boolean;
      positionIds?: string[];
    }
  ): Promise<Level> {
    const response = await this.api.put<Level>(`/admin/levels/${id}`, data);
    return response.data;
  }

  async deleteLevel(id: string): Promise<void> {
    await this.api.delete(`/admin/levels/${id}`);
  }

  // ===== Theories =====
  async getTheories(filters?: {
    levelId?: string;
    /** Dars (lesson) theory UUID — faqat shu darsga bog'langan nazariyalar */
    parentTheoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Theory>> {
    const response = await this.api.get<PaginatedResponse<Theory>>(
      '/admin/theories',
      { params: filters }
    );
    return response.data;
  }

  async getTheoriesByLevel(levelId: string): Promise<Theory[]> {
    const response = await this.api.get<Theory[]>(
      `/admin/levels/${levelId}/theories`
    );
    return response.data;
  }

  async getTheoryTreeByLevel(levelId: string): Promise<Theory[]> {
    const response = await this.api.get<Theory[]>(
      `/admin/levels/${levelId}/theories-tree`
    );
    return response.data;
  }

  async getTheoryById(id: string): Promise<Theory> {
    const response = await this.api.get<Theory>(`/admin/theories/${id}`);
    return response.data;
  }

  async createTheory(data: {
    levelId: string;
    parentTheoryId?: string | null;
    title: string;
    orderIndex?: number;
    content?: string;
    slides?: TheorySlide[] | null;
    theoryRole?: TheoryRole | null;
  }): Promise<Theory> {
    const response = await this.api.post<Theory>('/admin/theories', data);
    return response.data;
  }

  async updateTheory(
    id: string,
    data: {
      parentTheoryId?: string | null;
      title?: string;
      orderIndex?: number;
      content?: string;
      slides?: TheorySlide[] | null;
      theoryRole?: TheoryRole | null;
    }
  ): Promise<Theory> {
    const response = await this.api.put<Theory>(`/admin/theories/${id}`, data);
    return response.data;
  }

  async deleteTheory(id: string): Promise<void> {
    await this.api.delete(`/admin/theories/${id}`);
  }

  // ===== Questions =====
  async getQuestions(filters?: {
    levelId?: string;
    theoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Question>> {
    const response = await this.api.get<PaginatedResponse<Question>>(
      '/admin/questions',
      { params: filters }
    );
    return response.data;
  }

  async getQuestionById(id: string): Promise<Question> {
    const response = await this.api.get<Question>(`/admin/questions/${id}`);
    return response.data;
  }

  async createQuestion(data: {
    levelId: string;
    theoryId: string;
    prompt: string;
    type?: QuestionType;
    orderIndex?: number;
    isActive?: boolean;
    options: {
      optionText: string;
      orderIndex?: number;
      isCorrect: boolean;
      matchText?: string;
    }[];
    positionIds?: string[];
  }): Promise<Question> {
    const response = await this.api.post<Question>('/admin/questions', data);
    return response.data;
  }

  async updateQuestion(
    id: string,
    data: {
      prompt?: string;
      type?: QuestionType;
      orderIndex?: number;
      isActive?: boolean;
      options?: {
        id?: string;
        optionText?: string;
        orderIndex?: number;
        isCorrect?: boolean;
        matchText?: string;
      }[];
      positionIds?: string[];
    }
  ): Promise<Question> {
    const response = await this.api.put<Question>(
      `/admin/questions/${id}`,
      data
    );
    return response.data;
  }

  async deleteQuestion(id: string): Promise<void> {
    await this.api.delete(`/admin/questions/${id}`);
  }

  async deleteQuestionOption(id: string): Promise<void> {
    await this.api.delete(`/admin/question-options/${id}`);
  }

  /** DOCX dan darsga savol import (dryRun=true → preview). */
  async importQuestionsDocx(
    file: File,
    opts: {
      levelId: string;
      theoryId: string;
      dryRun?: boolean;
      latinize?: boolean;
    },
  ): Promise<{
    success: boolean;
    dryRun: boolean;
    levelId: string;
    theoryId: string;
    parsed: number;
    created: number;
    skipped: number;
    warnings: number;
    questions: Array<{
      sourceIndex: number;
      prompt: string;
      optionsCount: number;
      correctCount: number;
      warnings: string[];
    }>;
    skippedDetails: string[];
  }> {
    const form = new FormData();
    form.append('file', file);
    form.append('levelId', opts.levelId);
    form.append('theoryId', opts.theoryId);
    form.append('dryRun', opts.dryRun ? 'true' : 'false');
    form.append('latinize', opts.latinize === false ? 'false' : 'true');
    const response = await this.api.post('/admin/questions/import-docx', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    });
    return response.data;
  }

  /** Savolga biriktirish uchun lavozimlar (barcha moderatorlarga ochiq). */
  async getContentPositions(): Promise<Position[]> {
    const response = await this.api.get<Position[]>('/admin/content-positions');
    return response.data;
  }

  // ===== Organizations =====
  async getOrganizations(filters?: {
    search?: string;
  }): Promise<Organization[]> {
    const response = await this.api.get<Organization[]>(
      '/admin/organizations',
      { params: filters }
    );
    return response.data;
  }

  async getOrganizationById(id: string): Promise<Organization> {
    const response = await this.api.get<Organization>(
      `/admin/organizations/${id}`
    );
    return response.data;
  }

  async createOrganization(data: {
    name: string;
    parentOrganizationId?: string | null;
    isDefault?: boolean;
  }): Promise<Organization> {
    const response = await this.api.post<Organization>(
      '/admin/organizations',
      data
    );
    return response.data;
  }

  async updateOrganization(
    id: string,
    data: {
      name?: string;
      parentOrganizationId?: string | null;
      isDefault?: boolean;
    }
  ): Promise<Organization> {
    const response = await this.api.put<Organization>(
      `/admin/organizations/${id}`,
      data
    );
    return response.data;
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.api.delete(`/admin/organizations/${id}`);
  }

  async assignUserToOrg(orgId: string, userId: string): Promise<void> {
    await this.api.post(`/admin/organizations/${orgId}/users`, { userId });
  }

  async removeUserFromOrg(orgId: string, userId: string): Promise<void> {
    await this.api.delete(`/admin/organizations/${orgId}/users/${userId}`);
  }

  // ===== Reporting activation (soft exclusion from KPI) =====
  async getReportingActivation(orgId?: string): Promise<{
    organizations: Array<{ id: string; reportActive: boolean }>;
    divisions: Array<{
      organizationId: string;
      division: string;
      isActive: boolean;
    }>;
  }> {
    const response = await this.api.get('/admin/reporting-activation', {
      params: orgId ? { orgId } : undefined,
    });
    return response.data;
  }

  async setOrganizationReportActive(
    orgId: string,
    isActive: boolean,
  ): Promise<{ id: string; reportActive: boolean }> {
    const response = await this.api.patch(
      `/admin/reporting-activation/organizations/${orgId}`,
      { isActive },
    );
    return response.data;
  }

  async setDivisionReportActive(
    organizationId: string,
    division: string,
    isActive: boolean,
  ): Promise<{
    organizationId: string;
    division: string;
    isActive: boolean;
  }> {
    const response = await this.api.patch(
      '/admin/reporting-activation/divisions',
      { organizationId, division, isActive },
    );
    return response.data;
  }

  async setEmployeeReportActive(
    userId: string,
    isActive: boolean,
  ): Promise<{ id: string; reportActive: boolean }> {
    const response = await this.api.patch(
      `/admin/reporting-activation/employees/${userId}`,
      { isActive },
    );
    return response.data;
  }

  // ===== Users / Moderators =====
  async getUsers(filters?: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<UserProfile>> {
    const response = await this.api.get<PaginatedResponse<UserProfile>>(
      '/admin/users',
      { params: filters }
    );
    return response.data;
  }

  async getModerators(filters?: {
    search?: string;
    organizationId?: string;
    organizationMode?: 'include' | 'exclude';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<UserProfile>> {
    const response = await this.api.get<PaginatedResponse<UserProfile>>(
      '/admin/users/moderators',
      {
        params: {
          search: filters?.search,
          orgId: filters?.organizationId,
          orgMode: filters?.organizationMode,
          page: filters?.page,
          limit: filters?.limit,
        },
      }
    );
    return response.data;
  }

  async getUserById(id: string): Promise<UserProfile> {
    const response = await this.api.get<UserProfile>(`/admin/users/${id}`);
    return response.data;
  }

  async promoteModerator(data: {
    userId: string;
    organizationId?: string;
  }): Promise<UserProfile> {
    const response = await this.api.post<UserProfile>(
      '/admin/users/moderators/promote',
      data,
    );
    return response.data;
  }

  async demoteModerator(id: string): Promise<UserProfile> {
    const response = await this.api.post<UserProfile>(
      `/admin/users/moderators/${id}/demote`,
    );
    return response.data;
  }

  async promoteSuperAdmin(userId: string): Promise<UserProfile> {
    const response = await this.api.post<UserProfile>(
      '/admin/users/superadmins/promote',
      { userId },
    );
    return response.data;
  }

  async demoteSuperAdmin(id: string): Promise<UserProfile> {
    const response = await this.api.post<UserProfile>(
      `/admin/users/superadmins/${id}/demote`,
    );
    return response.data;
  }

  async listLegacyModerators(): Promise<UserProfile[]> {
    const response = await this.api.get<UserProfile[]>(
      '/admin/migrations/legacy-moderators',
    );
    return response.data;
  }

  async searchMigrationTargets(search: string): Promise<UserProfile[]> {
    const q = search.trim();
    if (q.length < 2) return [];
    const response = await this.api.get<UserProfile[]>(
      '/admin/migrations/legacy-moderators/targets',
      { params: { search: q, limit: 50 } },
    );
    return response.data;
  }

  async suggestMigrationTargets(
    sourceUserId: string,
    limit = 5,
  ): Promise<MigrationSuggestion[]> {
    const response = await this.api.get<MigrationSuggestion[]>(
      `/admin/migrations/legacy-moderators/${sourceUserId}/suggestions`,
      { params: { limit } },
    );
    return response.data;
  }

  async mergeLegacyModerator(payload: {
    sourceUserId: string;
    targetUserId: string;
    permissionMerge?: 'prefer-source' | 'prefer-target' | 'union';
    dryRun?: boolean;
  }): Promise<LegacyModeratorMergePreview> {
    const response = await this.api.post<LegacyModeratorMergePreview>(
      '/admin/migrations/legacy-moderators/merge',
      payload,
    );
    return response.data;
  }

  async previewBulkModeratorMigration(fileBase64: string) {
    const response = await this.api.post<BulkModeratorMigrationPreview>(
      '/admin/migrations/legacy-moderators/bulk/preview',
      { fileBase64 },
    );
    return response.data;
  }

  async applyBulkModeratorMigration(payload: {
    fileBase64: string;
    dryRun?: boolean;
    permissionMerge?: 'prefer-source' | 'prefer-target' | 'union';
    onlyReady?: boolean;
  }) {
    const response = await this.api.post<{
      dryRun: boolean;
      merged: number;
      failed: number;
      results: Array<{
        row: { index: number; fullName: string; login: string };
        success: boolean;
        message: string;
      }>;
    }>('/admin/migrations/legacy-moderators/bulk/apply', payload);
    return response.data;
  }

  async updateModerator(
    id: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      password?: string;
      organizationId?: string | null;
    },
  ): Promise<UserProfile> {
    const response = await this.api.put<UserProfile>(
      `/admin/users/moderators/${id}`,
      data,
    );
    return response.data;
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationId?: string;
  }): Promise<UserProfile> {
    const response = await this.api.post<UserProfile>('/admin/users', data);
    return response.data;
  }

  async updateUser(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      organizationId?: string;
    }
  ): Promise<UserProfile> {
    const response = await this.api.put<UserProfile>(
      `/admin/users/${id}`,
      data
    );
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.api.delete(`/admin/users/${id}`);
  }

  // ===== Employees =====
  async getStudents(filters?: {
    orgId?: string;
    levelId?: string;
    search?: string;
    page?: number;
    limit?: number;
    light?: boolean;
  }): Promise<PaginatedResponse<StudentSummary>> {
    const response = await this.api.get<PaginatedResponse<StudentSummary>>(
      '/admin/employees',
      {
        params: {
          ...filters,
          light: filters?.light ? '1' : undefined,
        },
      },
    );
    return response.data;
  }

  async getStudent(id: string): Promise<StudentDetail> {
    const response = await this.api.get<StudentDetail>(
      `/admin/employees/${id}`
    );
    return response.data;
  }

  async getStudentLostQuestions(id: string): Promise<LostQuestion[]> {
    const response = await this.api.get<LostQuestion[]>(
      `/admin/employees/${id}/lost-questions`
    );
    return response.data;
  }

  async getStudentXpHistory(
    id: string,
    filters?: { page?: number; limit?: number },
  ): Promise<StudentXpHistoryResponse> {
    const response = await this.api.get<StudentXpHistoryResponse>(
      `/admin/employees/${id}/xp-history`,
      { params: filters },
    );
    return response.data;
  }

  async getXpAnomalyAudit(limit = 50): Promise<XpAnomalyAudit> {
    const response = await this.api.get<XpAnomalyAudit>('/admin/xp-anomalies/audit', {
      params: { limit },
    });
    return response.data;
  }

  async reconcileXpAnomalies(): Promise<XpAnomalyReconcileResult> {
    const response = await this.api.post<XpAnomalyReconcileResult>(
      '/admin/xp-anomalies/reconcile',
    );
    return response.data;
  }

  async getBlockedEmailLogins(): Promise<BlockedEmailLoginsResponse> {
    const response = await this.api.get<BlockedEmailLoginsResponse>(
      '/admin/blocked-email-logins',
    );
    return response.data;
  }

  async deleteBlockedEmailLogin(userId: string): Promise<{ deleted: number; userId: string }> {
    const response = await this.api.delete<{ deleted: number; userId: string }>(
      `/admin/blocked-email-logins/${userId}`,
    );
    return response.data;
  }

  async bulkDeleteBlockedEmailLogins(userIds: string[]): Promise<{
    deleted: number;
    deletedIds: string[];
    skipped: Array<{ userId: string; reason: string }>;
  }> {
    const response = await this.api.post('/admin/blocked-email-logins/bulk-delete', {
      userIds,
    });
    return response.data;
  }

  async uploadReportSubmission(file: File): Promise<ReportSubmissionListItem> {
    const form = new FormData();
    form.append('file', file);
    const response = await this.api.post<ReportSubmissionListItem>(
      '/admin/report-submissions/upload',
      form,
    );
    return response.data;
  }

  async listReportSubmissions(params?: {
    month?: string;
    orgId?: string;
  }): Promise<ReportSubmissionListItem[]> {
    const response = await this.api.get<ReportSubmissionListItem[]>(
      '/admin/report-submissions',
      { params },
    );
    return response.data;
  }

  async getReportSubmission(id: string): Promise<ReportSubmissionDetail> {
    const response = await this.api.get<ReportSubmissionDetail>(
      `/admin/report-submissions/${id}`,
    );
    return response.data;
  }

  async compareReportSubmission(id: string): Promise<ReportSubmissionCompareResult> {
    const response = await this.api.get<ReportSubmissionCompareResult>(
      `/admin/report-submissions/${id}/compare`,
    );
    return response.data;
  }

  async getStudentActivity(id: string): Promise<ActivityDay[]> {
    const response = await this.api.get<ActivityDay[]>(
      `/admin/employees/${id}/activity`
    );
    return response.data;
  }

  // ─── Audio Library (Admin CRUD) ─────────────────────────────────────────
  async adminListAudioBooks(params?: {
    search?: string;
  }): Promise<AdminAudioBookRow[]> {
    const response = await this.api.get<AdminAudioBookRow[]>(
      '/admin/audio-books',
      { params }
    );
    return response.data;
  }

  async adminGetAudioBook(bookId: string): Promise<AdminAudioBookDetail> {
    const response = await this.api.get<AdminAudioBookDetail>(
      `/admin/audio-books/${bookId}`
    );
    return response.data;
  }

  async adminCreateAudioBook(data: {
    title: string;
    description?: string | null;
    coverUrl?: string | null;
    audioUrl?: string | null;
    isActive?: boolean;
  }): Promise<AdminAudioBookDetail> {
    const response = await this.api.post<AdminAudioBookDetail>(
      '/admin/audio-books',
      data
    );
    return response.data;
  }

  async adminUpdateAudioBook(
    bookId: string,
    data: {
      title?: string;
      description?: string | null;
      coverUrl?: string | null;
      audioUrl?: string | null;
      isActive?: boolean;
    }
  ): Promise<AdminAudioBookDetail> {
    const response = await this.api.put<AdminAudioBookDetail>(
      `/admin/audio-books/${bookId}`,
      data
    );
    return response.data;
  }

  async adminDeleteAudioBook(bookId: string): Promise<{ ok: boolean }> {
    const response = await this.api.delete<{ ok: boolean }>(
      `/admin/audio-books/${bookId}`
    );
    return response.data;
  }

  async adminCreateAudioChapter(
    bookId: string,
    data: { title: string; orderIndex: number }
  ) {
    const response = await this.api.post<{ ok: boolean; id: string }>(
      `/admin/audio-books/${bookId}/chapters`,
      data
    );
    return response.data;
  }

  async adminUpdateAudioChapter(
    chapterId: string,
    data: { title?: string; orderIndex?: number }
  ) {
    const response = await this.api.put<{ ok: boolean }>(
      `/admin/audio-chapters/${chapterId}`,
      data
    );
    return response.data;
  }

  async adminDeleteAudioChapter(chapterId: string) {
    const response = await this.api.delete<{ ok: boolean }>(
      `/admin/audio-chapters/${chapterId}`
    );
    return response.data;
  }

  async adminCreateAudioParagraph(
    chapterId: string,
    data: { text: string; orderIndex: number; audioUrl: string }
  ) {
    const response = await this.api.post<{ ok: boolean; id: string }>(
      `/admin/audio-chapters/${chapterId}/paragraphs`,
      data
    );
    return response.data;
  }

  async adminUpdateAudioParagraph(
    paragraphId: string,
    data: { text?: string; orderIndex?: number; audioUrl?: string }
  ) {
    const response = await this.api.put<{ ok: boolean }>(
      `/admin/audio-paragraphs/${paragraphId}`,
      data
    );
    return response.data;
  }

  async adminDeleteAudioParagraph(paragraphId: string) {
    const response = await this.api.delete<{ ok: boolean }>(
      `/admin/audio-paragraphs/${paragraphId}`
    );
    return response.data;
  }

  // ===== NES / 1C Sync =====
  async getNesEmployees(filters?: {
    search?: string;
    organizationName?: string;
    division?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<NesEmployee>> {
    const response = await this.api.get<PaginatedResponse<NesEmployee>>(
      '/admin/nes-employees',
      { params: filters }
    );
    return response.data;
  }

  async getNesEmployeesFilterOptions(): Promise<{
    organizations: string[];
    divisions: string[];
  }> {
    const response = await this.api.get<{
      organizations: string[];
      divisions: string[];
    }>('/admin/nes-employees/filter-options');
    return response.data;
  }

  async getNesDepartments(filters?: {
    search?: string;
  }): Promise<{ data: NesDepartment[]; total: number }> {
    const response = await this.api.get<{ data: NesDepartment[]; total: number }>(
      '/admin/nes-employees/departments',
      { params: filters },
    );
    return response.data;
  }

  async getArchiveSummary(): Promise<{
    employees: number;
    questions: number;
    modules: number;
    theories: number;
  }> {
    const response = await this.api.get<{
      employees: number;
      questions: number;
      modules: number;
      theories: number;
    }>('/admin/nes-employees/archive-summary');
    return response.data;
  }

  async getTerminatedEmployees(filters?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: TerminatedEmployee[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await this.api.get<{
      data: TerminatedEmployee[];
      total: number;
      page: number;
      limit: number;
    }>('/admin/nes-employees/terminated', { params: filters });
    return response.data;
  }

  async deleteAllNesEmployees(): Promise<{
    success: boolean;
    deleted: number;
  }> {
    const response = await this.api.delete<{
      success: boolean;
      deleted: number;
    }>('/admin/nes-employees');
    return response.data;
  }

  async syncNesEmployees(_date?: string): Promise<NesEmployeeSyncResponse> {
    const response = await this.api.post<NesEmployeeSyncResponse>(
      '/admin/nes-employees/sync',
      {},
    );
    return response.data;
  }

  async getNesEmployeesSyncStatus(): Promise<NesEmployeesSyncStatus> {
    const response = await this.api.get<NesEmployeesSyncStatus>(
      '/admin/nes-employees/sync-status',
    );
    return response.data;
  }

  async getNesEmployeesSyncHealth(): Promise<NesEmployeesSyncHealth> {
    const response = await this.api.get<NesEmployeesSyncHealth>(
      '/admin/nes-employees/sync-health',
    );
    return response.data;
  }

  // ===== Seed =====
  async seedContent(): Promise<{
    success: boolean;
    message: string;
    stats?: { modules: number; theories: number; questions: number };
  }> {
    const response = await this.api.post('/seed/content');
    return response.data;
  }

  // ===== Internals =====
  private clearSession() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.api
      .post<{ accessToken: string }>('/auth/refresh', { refreshToken })
      .then((res) => {
        const newAccessToken = res.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        return newAccessToken;
      })
      .finally(() => {
        this.isRefreshing = false;
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }
}

// ============== USER ACTIVITY ==============

export type ActivityRange = 'day' | 'week' | 'month' | 'year';
export type ActivityGroup = 'employees' | 'moderators';

export type OnlineUserRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  organizationId: string | null;
  organizationName: string | null;
  loginAt: string;
  lastSeenAt: string;
  durationSeconds: number;
};

export type ActivityUserRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  organizationId: string | null;
  organizationName: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  loginAt: string | null;
  todayOnlineSeconds: number;
  rangeOnlineSeconds: number;
  lastEventType: string | null;
  lastEventAt: string | null;
};

export type EmployeeOnlineSummary = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  todaySeconds: number;
  yesterdaySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
};

export type ActivityStats = {
  onlineNow: number;
  loginsToday: number;
  avgOnlineMinutes: number;
  topBranch: { id: string; name: string; loginCount: number } | null;
  topUser: { userId: string; name: string; onlineSeconds: number } | null;
  leastActiveUser: {
    userId: string;
    name: string;
    onlineSeconds: number;
  } | null;
};

export type QuestionStatsRow = {
  questionId: string;
  questionText: string;
  attempts: number;
  wrong: number;
  correct: number;
  wrongRate: number;
  lastAttemptAt: string | null;
};

export type ActivityTimelineEvent = {
  id: string;
  userId: string;
  organizationId: string | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ActivitySession = {
  id: string;
  userId: string;
  organizationId: string | null;
  loginAt: string;
  logoutAt: string | null;
  lastSeenAt: string;
  isOnline: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  durationSeconds: number;
};

export const apiService = new ApiService();
export default apiService;

export const userActivityApi = {
  async listOnline(params: { group?: ActivityGroup; organizationId?: string }) {
    const { data } = await apiService.api.get<OnlineUserRow[]>(
      '/user-activity/online',
      { params },
    );
    return data;
  },
  async listUsers(params: {
    group?: ActivityGroup;
    organizationId?: string;
    range?: ActivityRange;
  }) {
    const { data } = await apiService.api.get<ActivityUserRow[]>(
      '/user-activity/users',
      { params },
    );
    return data;
  },
  async stats(params: {
    group?: ActivityGroup;
    organizationId?: string;
    range?: ActivityRange;
  }) {
    const { data } = await apiService.api.get<ActivityStats>(
      '/user-activity/stats',
      { params },
    );
    return data;
  },
  async onlineSummary(params: { organizationId: string }) {
    const { data } = await apiService.api.get<EmployeeOnlineSummary[]>(
      '/user-activity/online-summary',
      { params },
    );
    return data;
  },
  async timeline(userId: string) {
    const { data } = await apiService.api.get<ActivityTimelineEvent[]>(
      `/user-activity/timeline/${userId}`,
    );
    return data;
  },
  async sessions(userId: string, range?: ActivityRange) {
    const { data } = await apiService.api.get<ActivitySession[]>(
      `/user-activity/sessions/${userId}`,
      { params: { range } },
    );
    return data;
  },
  async questionStats(params: { userId?: string; organizationId?: string }) {
    const { data } = await apiService.api.get<QuestionStatsRow[]>(
      '/user-activity/question-stats',
      { params },
    );
    return data;
  },
  async heartbeat() {
    await apiService.api.post('/user-activity/heartbeat');
  },
};
