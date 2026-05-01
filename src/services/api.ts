import axios from 'axios';
import { notification } from 'antd';

const API_BASE_URL = 'https://elektrolearn-api.uzbekistonmet.uz/api';

export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

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
  organizations: { id: string; name: string }[];
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

export type Level = {
  id: string;
  title: string;
  orderIndex: number;
  isActive: boolean;
  createdById: string | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
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
  createdAt: string;
  updatedAt: string;
};

export type Organization = {
  id: string;
  name: string;
  parentOrganizationId?: string | null;
  isDefault?: boolean;
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
  completedLevels: number;
  totalXp: number;
  currentLevelId: string | null;
  currentLevelTitle: string | null;
  badge: StudentBadge;
  organizations: { id: string; name: string }[];
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
  completedLevels: number;
  totalErrors: number;
  badge: StudentBadge;
  levelProgress: LevelProgress[];
  createdAt: string;
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

export type EmployeeCertificate = {
  id: string;
  userId: string;
  organizationId: string;
  positionTitle: string;
  certificateNumber: string;
  presentedByFullName: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeCheckType =
  | 'GENERAL_KNOWLEDGE'
  | 'SAFETY_TECHNIQUE'
  | 'SPECIAL_WORK_PERMIT'
  | 'RESUSCITATION_TRAINING'
  | 'MEDICAL_EXAM';

export type EmployeeCheck = {
  id: string;
  userId: string;
  type: EmployeeCheckType;
  checkDate: string;
  reason: string | null;
  grade: string | null;
  nextCheckDate: string | null;
  commissionLeaderSignature: string | null;
  qualificationGroup: string | null;
  ruleName: string | null;
  conclusion: string | null;
  doctorConclusion: string | null;
  responsibleSignature: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Audio Library (Admin) ────────────────────────────────────────────────
export type AdminAudioBookRow = {
  id: string;
  title: string;
  coverUrl: string | null;
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
  description: string | null;
  isActive: boolean;
  chapters: AdminAudioChapter[];
};

export type CrudPermissions = {
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
  rank: number;
};

export type LeaderboardResponse = {
  scope: 'global' | 'organization';
  orgId: string | null;
  me: LeaderboardRow | null;
  top: LeaderboardRow[];
};

class ApiService {
  private api: ReturnType<typeof axios.create>;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor - Add token to headers
    this.api.interceptors.request.use(
      (config) => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
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
        const originalRequest = error.config;
        const status = error.response?.status;

        // 401 — try refresh token first
        if (status === 401 && !originalRequest?._retry) {
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
    const response = await this.api.post<LoginResponse>('/auth/login', {
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
    const response = await this.api.post<{
      success: boolean;
      avatarUrl: string;
    }>('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async uploadUserAvatar(
    userId: string,
    file: File
  ): Promise<{ success: boolean; avatarUrl: string; userId: string }> {
    const form = new FormData();
    form.append('file', file);
    const response = await this.api.post<{
      success: boolean;
      avatarUrl: string;
      userId: string;
    }>(`/users/${userId}/avatar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
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

  async getLevelFunnel(orgId: string): Promise<LevelFunnelItem[]> {
    const response = await this.api.get<LevelFunnelItem[]>(
      '/admin/analytics/level-funnel',
      { params: { orgId } }
    );
    return response.data;
  }

  async getQuestionErrors(orgId: string): Promise<QuestionError[]> {
    const response = await this.api.get<QuestionError[]>(
      '/admin/analytics/questions',
      { params: { orgId } }
    );
    return response.data;
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
    data: Partial<{ title: string; section: ExamQuestionSection; sortOrder: number }>
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
    const response = await this.api.get<ExamQuestion[]>('/admin/exam-questions', {
      params: catalogId ? { catalogId } : undefined
    });
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

  async rejectExamSession(sessionId: string, reason: string): Promise<{ ok: boolean }> {
    const response = await this.api.post<{ ok: boolean }>(
      `/exams/live/moderator/sessions/${sessionId}/reject`,
      { reason }
    );
    return response.data;
  }

  async finalizeExamOral(
    attemptId: string,
    body: { oralResult: OralResult; oralFeedback: string; nextExamMonths: number }
  ): Promise<{ ok: boolean; nextSuggestedAt: string }> {
    const response = await this.api.post<{ ok: boolean; nextSuggestedAt: string }>(
      `/exams/live/moderator/attempts/${attemptId}/finalize-oral`,
      body
    );
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
  }): Promise<Level> {
    const response = await this.api.post<Level>('/admin/levels', data);
    return response.data;
  }

  async updateLevel(
    id: string,
    data: { title?: string; orderIndex?: number; isActive?: boolean }
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
      `/admin/levels/${levelId}/theories-tree`,
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

  async createOrganization(data: { name: string }): Promise<Organization> {
    const response = await this.api.post<Organization>(
      '/admin/organizations',
      data
    );
    return response.data;
  }

  async updateOrganization(
    id: string,
    data: { name?: string }
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
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<UserProfile>> {
    const response = await this.api.get<PaginatedResponse<UserProfile>>(
      '/admin/users/moderators',
      { params: filters }
    );
    return response.data;
  }

  async getUserById(id: string): Promise<UserProfile> {
    const response = await this.api.get<UserProfile>(`/admin/users/${id}`);
    return response.data;
  }

  async createModerator(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationId?: string;
  }): Promise<UserProfile> {
    const response = await this.api.post<UserProfile>(
      '/admin/users/moderators',
      data
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
    },
  ): Promise<UserProfile> {
    const response = await this.api.put<UserProfile>(`/admin/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.api.delete(`/admin/users/${id}`);
  }

  // ===== Students =====
  async getStudents(filters?: {
    orgId?: string;
    levelId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<StudentSummary>> {
    const response = await this.api.get<PaginatedResponse<StudentSummary>>(
      '/admin/students',
      { params: filters }
    );
    return response.data;
  }

  async getStudent(id: string): Promise<StudentDetail> {
    const response = await this.api.get<StudentDetail>(`/admin/students/${id}`);
    return response.data;
  }

  async getStudentLostQuestions(id: string): Promise<LostQuestion[]> {
    const response = await this.api.get<LostQuestion[]>(
      `/admin/students/${id}/lost-questions`
    );
    return response.data;
  }

  async getStudentActivity(id: string): Promise<ActivityDay[]> {
    const response = await this.api.get<ActivityDay[]>(
      `/admin/students/${id}/activity`
    );
    return response.data;
  }

  async getEmployeeCertificate(studentId: string): Promise<EmployeeCertificate | null> {
    const response = await this.api.get<EmployeeCertificate | null>(
      `/admin/students/${studentId}/employee-certificate`
    );
    return response.data;
  }

  async upsertEmployeeCertificate(
    studentId: string,
    data: {
      organizationId: string;
      positionTitle: string;
      certificateNumber: string;
      presentedByFullName: string;
    }
  ): Promise<EmployeeCertificate> {
    const response = await this.api.put<EmployeeCertificate>(
      `/admin/students/${studentId}/employee-certificate`,
      data
    );
    return response.data;
  }

  async listEmployeeChecks(
    studentId: string,
    params?: { type?: EmployeeCheckType }
  ): Promise<EmployeeCheck[]> {
    const response = await this.api.get<EmployeeCheck[]>(
      `/admin/students/${studentId}/checks`,
      { params }
    );
    return response.data;
  }

  async createEmployeeCheck(
    studentId: string,
    data: Omit<EmployeeCheck, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'createdByUserId'>
  ): Promise<EmployeeCheck> {
    const response = await this.api.post<EmployeeCheck>(
      `/admin/students/${studentId}/checks`,
      data
    );
    return response.data;
  }

  async updateEmployeeCheck(
    studentId: string,
    checkId: string,
    data: Partial<
      Omit<EmployeeCheck, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'createdByUserId'>
    >
  ): Promise<EmployeeCheck> {
    const response = await this.api.put<EmployeeCheck>(
      `/admin/students/${studentId}/checks/${checkId}`,
      data
    );
    return response.data;
  }

  async deleteEmployeeCheck(studentId: string, checkId: string): Promise<void> {
    await this.api.delete(`/admin/students/${studentId}/checks/${checkId}`);
  }

  // ─── Audio Library (Admin CRUD) ─────────────────────────────────────────
  async adminListAudioBooks(params?: { search?: string }): Promise<AdminAudioBookRow[]> {
    const response = await this.api.get<AdminAudioBookRow[]>('/admin/audio-books', { params });
    return response.data;
  }

  async adminGetAudioBook(bookId: string): Promise<AdminAudioBookDetail> {
    const response = await this.api.get<AdminAudioBookDetail>(`/admin/audio-books/${bookId}`);
    return response.data;
  }

  async adminCreateAudioBook(data: {
    title: string;
    description?: string | null;
    coverUrl?: string | null;
    isActive?: boolean;
  }): Promise<AdminAudioBookDetail> {
    const response = await this.api.post<AdminAudioBookDetail>('/admin/audio-books', data);
    return response.data;
  }

  async adminUpdateAudioBook(
    bookId: string,
    data: {
      title?: string;
      description?: string | null;
      coverUrl?: string | null;
      isActive?: boolean;
    },
  ): Promise<AdminAudioBookDetail> {
    const response = await this.api.put<AdminAudioBookDetail>(`/admin/audio-books/${bookId}`, data);
    return response.data;
  }

  async adminDeleteAudioBook(bookId: string): Promise<{ ok: boolean }> {
    const response = await this.api.delete<{ ok: boolean }>(`/admin/audio-books/${bookId}`);
    return response.data;
  }

  async adminCreateAudioChapter(bookId: string, data: { title: string; orderIndex: number }) {
    const response = await this.api.post<{ ok: boolean; id: string }>(
      `/admin/audio-books/${bookId}/chapters`,
      data,
    );
    return response.data;
  }

  async adminUpdateAudioChapter(chapterId: string, data: { title?: string; orderIndex?: number }) {
    const response = await this.api.put<{ ok: boolean }>(`/admin/audio-chapters/${chapterId}`, data);
    return response.data;
  }

  async adminDeleteAudioChapter(chapterId: string) {
    const response = await this.api.delete<{ ok: boolean }>(`/admin/audio-chapters/${chapterId}`);
    return response.data;
  }

  async adminCreateAudioParagraph(
    chapterId: string,
    data: { text: string; orderIndex: number; audioUrl: string },
  ) {
    const response = await this.api.post<{ ok: boolean; id: string }>(
      `/admin/audio-chapters/${chapterId}/paragraphs`,
      data,
    );
    return response.data;
  }

  async adminUpdateAudioParagraph(
    paragraphId: string,
    data: { text?: string; orderIndex?: number; audioUrl?: string },
  ) {
    const response = await this.api.put<{ ok: boolean }>(`/admin/audio-paragraphs/${paragraphId}`, data);
    return response.data;
  }

  async adminDeleteAudioParagraph(paragraphId: string) {
    const response = await this.api.delete<{ ok: boolean }>(`/admin/audio-paragraphs/${paragraphId}`);
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

export const apiService = new ApiService();
export default apiService;
