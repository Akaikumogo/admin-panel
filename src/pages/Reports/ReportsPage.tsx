import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  Download,
  GitCompareArrows,
  Upload as UploadIcon,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Segmented,
  Skeleton,
  Typography,
  Upload,
  message,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import type {
  MonthlyPlanMatrix,
  UserProfile,
  YearlyPlanMatrix,
} from '@/services/api';
import { formatNumber, todayStr } from '@/pages/Analytics/analytics-utils';
import { ReportCompareSection } from './ReportCompareSection';
import { PlanMatrixTable, type PlanPeriod } from './PlanMatrixTable';

const { Text, Title } = Typography;

type PageTab = 'grid' | 'compare';
type DownloadKind = 'daily' | 'monthly' | 'matrix' | null;
type EmployeeFilter = 'all' | 'inactive' | 'completed' | 'extra';

const emptyMatrix: MonthlyPlanMatrix = {
  orgId: '',
  orgName: '',
  month: '',
  daysInMonth: 30,
  dailyGoalCorrect: 10,
  days: [],
  totalEmployees: 0,
  averageMonthlyPercent: 0,
  fullCompletedEmployees: 0,
  employees: [],
};

const emptyYearMatrix: YearlyPlanMatrix = {
  orgId: '',
  orgName: '',
  year: '',
  months: [],
  dailyGoalCorrect: 10,
  totalEmployees: 0,
  averageYearlyPercent: 0,
  employees: [],
};

export default function ReportsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<PageTab>('grid');
  const [date, setDate] = useState(todayStr());
  const [year, setYear] = useState(todayStr().slice(0, 4));
  const [period, setPeriod] = useState<PlanPeriod>('monthly');
  const [orgFilter, setOrgFilter] = useState(searchParams.get('orgId') ?? '');
  const [employeeFilter, setEmployeeFilter] = useState<EmployeeFilter>('all');
  const [downloading, setDownloading] = useState<DownloadKind>(null);
  const [uploadingReport, setUploadingReport] = useState(false);

  const month = date.slice(0, 7);

  useEffect(() => {
    const fromUrl = searchParams.get('orgId') ?? '';
    setOrgFilter(fromUrl);
  }, [searchParams]);

  const setOrg = (v: string) => {
    setOrgFilter(v);
    const next = new URLSearchParams(searchParams);
    if (v) next.set('orgId', v);
    else next.delete('orgId');
    setSearchParams(next, { replace: true });
  };

  const { data: me } = useFetch<UserProfile | null>(
    ['me'],
    () => apiService.me(),
    null,
  );

  const { data: organizations } = useFetch(
    ['reports-orgs'],
    () => apiService.getOrganizations(),
    [],
  );

  const canCompare =
    me?.role === 'SUPERADMIN' ||
    Boolean(me?.organizations?.some((o) => o.isDefault));

  const { data: planMatrix, initialLoading: matrixLoading } = useFetch(
    ['monthly-plan-matrix', orgFilter, month],
    () =>
      apiService.getMonthlyPlanMatrix({
        orgId: orgFilter || undefined,
        month,
      }),
    emptyMatrix,
    { enabled: tab === 'grid' && period !== 'yearly' },
  );

  const { data: yearMatrix, initialLoading: yearLoading } = useFetch(
    ['yearly-plan-matrix', orgFilter, year],
    () =>
      apiService.getYearlyPlanMatrix({
        orgId: orgFilter || undefined,
        year,
      }),
    emptyYearMatrix,
    { enabled: tab === 'grid' && period === 'yearly' },
  );

  const orgOptions = useMemo(
    () => organizations.map((o) => ({ value: o.id, label: o.name })),
    [organizations],
  );

  const filteredMatrix = useMemo((): MonthlyPlanMatrix => {
    let employees = planMatrix.employees ?? [];
    switch (employeeFilter) {
      case 'inactive':
        employees = employees.filter((e) => e.daysCompleted === 0);
        break;
      case 'completed':
        employees = employees.filter((e) => e.monthlyPercent >= 100);
        break;
      case 'extra':
        employees = employees.filter((e) => e.extraCorrectTotal > 0);
        break;
      default:
        break;
    }
    return { ...planMatrix, employees };
  }, [planMatrix, employeeFilter]);

  const filteredYearMatrix = useMemo((): YearlyPlanMatrix => {
    let employees = yearMatrix.employees ?? [];
    switch (employeeFilter) {
      case 'inactive':
        employees = employees.filter((e) => e.daysCompleted === 0);
        break;
      case 'completed':
        employees = employees.filter((e) => e.yearlyPercent >= 100);
        break;
      case 'extra':
        employees = employees.filter((e) => e.extraCorrectTotal > 0);
        break;
      default:
        break;
    }
    return { ...yearMatrix, employees };
  }, [yearMatrix, employeeFilter]);

  const runDownload = async (kind: Exclude<DownloadKind, null>) => {
    if (kind === 'matrix' && !orgFilter) {
      message.warning(
        t({
          uz: 'Reja Excel uchun avval filialni tanlang',
          en: 'Select a branch first for plan Excel',
          ru: 'Сначала выберите филиал для Excel плана',
        }),
      );
      return;
    }
    setDownloading(kind);
    try {
      if (kind === 'daily') {
        const scope = orgFilter ? 'filial' : 'barcha';
        await apiService.downloadDailyReportExcel({
          date,
          orgId: orgFilter || undefined,
          filename: `kunlik-${date}-${scope}.xlsx`,
        });
      } else if (kind === 'monthly') {
        const scope = orgFilter ? 'filial' : 'barcha';
        await apiService.downloadMonthlyReportExcel({
          month,
          orgId: orgFilter || undefined,
          filename: `oylik-${month}-${scope}.xlsx`,
        });
      } else {
        const safe = (planMatrix.orgName || 'filial').replace(/[^\w\-]+/g, '_');
        await apiService.downloadMonthlyPlanMatrixExcel({
          orgId: orgFilter,
          month,
          filename: `${month}_${safe}_oylik_reja.xlsx`,
        });
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Yuklab olishda xato');
    } finally {
      setDownloading(null);
    }
  };

  const handleSubmitBranchExcel = async (file: File) => {
    setUploadingReport(true);
    try {
      const created = await apiService.uploadReportSubmission(file);
      if (created.integrityStatus === 'tampered') {
        const who = created.uploadedBy
          ? `${created.uploadedBy.lastName} ${created.uploadedBy.firstName}`.trim() ||
            created.uploadedBy.email
          : 'noma’lum';
        message.warning(
          t({
            uz: `Hisobot yuklandi, lekin Excel qo‘lda o‘zgartirilgan. Yuklagan: ${who}. ID: ${created.id}`,
            en: `Uploaded, but Excel was altered. Uploader: ${who}. ID: ${created.id}`,
            ru: `Загружено, но Excel изменён. Загрузил: ${who}. ID: ${created.id}`,
          }),
        );
      } else {
        message.success(
          t({
            uz: `Hisobot yuborildi. ID: ${created.id}`,
            en: `Report submitted. ID: ${created.id}`,
            ru: `Отчёт отправлен. ID: ${created.id}`,
          }),
        );
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Yuklashda xato');
    } finally {
      setUploadingReport(false);
    }
    return false;
  };

  const goCompare = () => {
    if (!canCompare) {
      message.warning(
        t({
          uz: 'Solishtirish faqat asosiy filial moderatorlariga ochiq',
          en: 'Comparison is only for main-branch moderators',
          ru: 'Сравнение только для основного филиала',
        }),
      );
      return;
    }
    setTab('compare');
  };

  return (
    <div>
      <PageHeader
        title={t({ uz: 'Hisobotlar', en: 'Reports', ru: 'Отчёты' })}
        description={t({
          uz: 'Oy jadvali, Excel yuklash va ID bo‘yicha solishtirish',
          en: 'Month grid, Excel download and ID comparison',
          ru: 'Таблица месяца, Excel и сверка по ID',
        })}
      />

      <Card className="mb-6 !rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type={tab === 'grid' ? 'primary' : 'default'}
            onClick={() => setTab('grid')}
          >
            {t({ uz: 'Jadval', en: 'Grid', ru: 'Таблица' })}
          </Button>
          {canCompare ? (
            <Button
              type={tab === 'compare' ? 'primary' : 'default'}
              icon={<GitCompareArrows className="h-4 w-4" />}
              onClick={goCompare}
            >
              {t({ uz: 'Solishtirish', en: 'Compare', ru: 'Сравнение' })}
            </Button>
          ) : null}
        </div>
      </Card>

      {tab === 'compare' ? (
        canCompare ? (
          <ReportCompareSection
            organizations={organizations}
            month={month}
            onMonthChange={(m) => setDate(`${m}-01`)}
          />
        ) : (
          <Card className="!rounded-xl">
            <Text type="secondary">
              {t({
                uz: 'Solishtirish faqat asosiy filial moderatorlariga ochiq.',
                en: 'Comparison is only for main-branch moderators.',
                ru: 'Сравнение доступно только модераторам основного филиала.',
              })}
            </Text>
          </Card>
        )
      ) : (
        <>
          <Card className="mb-6 !rounded-xl">
            <div className="flex flex-wrap items-center gap-3">
              <Segmented<PlanPeriod>
                value={period}
                onChange={setPeriod}
                options={[
                  {
                    value: 'daily',
                    label: t({ uz: 'Kunlik', en: 'Daily', ru: 'День' }),
                  },
                  {
                    value: 'monthly',
                    label: t({ uz: 'Oylik', en: 'Monthly', ru: 'Мес.' }),
                  },
                  {
                    value: 'yearly',
                    label: t({ uz: 'Yillik', en: 'Yearly', ru: 'Год' }),
                  },
                ]}
              />
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {period === 'yearly' ? (
                <DatePicker
                  picker="year"
                  value={dayjs(`${year}-01-01`)}
                  onChange={(d) => d && setYear(d.format('YYYY'))}
                  allowClear={false}
                  className="w-[120px]"
                />
              ) : (
                <DatePicker
                  picker="month"
                  value={dayjs(`${month}-01`)}
                  onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
                  allowClear={false}
                  className="w-[150px]"
                />
              )}
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select
                allowClear
                showSearch
                placeholder={t({
                  uz: 'Barcha filiallar',
                  en: 'All branches',
                  ru: 'Все филиалы',
                })}
                value={orgFilter || undefined}
                onChange={(v) => setOrg(v ?? '')}
                className="min-w-[220px]"
                options={orgOptions}
              />
              <Select
                value={employeeFilter}
                onChange={(v) => setEmployeeFilter(v as EmployeeFilter)}
                className="min-w-[150px]"
                options={[
                  { value: 'all', label: t({ uz: 'Barchasi', en: 'All', ru: 'Все' }) },
                  {
                    value: 'inactive',
                    label: t({ uz: 'Natija yo‘q', en: 'No activity', ru: 'Без акт.' }),
                  },
                  {
                    value: 'completed',
                    label: t({ uz: '100%', en: '100%', ru: '100%' }),
                  },
                  {
                    value: 'extra',
                    label: t({
                      uz: 'Plandan tashqari',
                      en: 'Beyond plan',
                      ru: 'Сверх',
                    }),
                  },
                ]}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="primary"
                icon={<Download className="h-4 w-4" />}
                loading={downloading === 'daily'}
                disabled={!!downloading && downloading !== 'daily'}
                onClick={() => void runDownload('daily')}
              >
                {t({
                  uz: 'Kunlik Excel',
                  en: 'Daily Excel',
                  ru: 'День Excel',
                })}
              </Button>
              <Button
                icon={<Download className="h-4 w-4" />}
                loading={downloading === 'monthly'}
                disabled={!!downloading && downloading !== 'monthly'}
                onClick={() => void runDownload('monthly')}
              >
                {t({
                  uz: 'Oylik Excel',
                  en: 'Monthly Excel',
                  ru: 'Месяц Excel',
                })}
              </Button>
              <Button
                icon={<Download className="h-4 w-4" />}
                loading={downloading === 'matrix'}
                disabled={
                  !orgFilter || (!!downloading && downloading !== 'matrix')
                }
                onClick={() => void runDownload('matrix')}
              >
                {t({
                  uz: 'Reja Excel (tekshiruv)',
                  en: 'Plan Excel (verify)',
                  ru: 'Excel плана (проверка)',
                })}
              </Button>
              {orgFilter ? (
                <Upload
                  accept=".xlsx,.xls"
                  beforeUpload={(file) => {
                    void handleSubmitBranchExcel(file);
                    return false;
                  }}
                >
                  <Button
                    icon={<UploadIcon className="h-4 w-4" />}
                    loading={uploadingReport}
                  >
                    {t({
                      uz: 'Excelni taqdim etish',
                      en: 'Submit Excel',
                      ru: 'Отправить Excel',
                    })}
                  </Button>
                </Upload>
              ) : null}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {t({
                uz: 'Jadval — tanlangan oy. Kunlik/Oylik Excel: filial bo‘lmasa har biri alohida rangli sheet. Reja Excel — bitta filial, Solishtirish uchun ID bilan yuboriladi.',
                en: 'Grid = selected month. Daily/Monthly Excel: without branch = colored sheets per branch. Plan Excel = one branch, submit for Compare by ID.',
                ru: 'Таблица — выбранный месяц. День/Месяц Excel: без филиала — цветные листы. Excel плана — один филиал, отправка для сверки по ID.',
              })}
            </p>
          </Card>

          {period === 'yearly' ? (
            yearLoading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
              <>
                <Row gutter={[16, 16]} className="mb-6">
                  <Col xs={24} sm={8}>
                    <Card className="!rounded-xl border-l-4 border-l-blue-500">
                      <Text type="secondary" className="text-xs">
                        {t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' })}
                      </Text>
                      <Title level={3} className="!mb-0">
                        {formatNumber(yearMatrix.totalEmployees)}
                      </Title>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card className="!rounded-xl border-l-4 border-l-emerald-500">
                      <Text type="secondary" className="text-xs">
                        {t({
                          uz: 'O‘rtacha yillik %',
                          en: 'Avg yearly %',
                          ru: 'Средний год %',
                        })}
                      </Text>
                      <Title level={3} className="!mb-0">
                        {yearMatrix.averageYearlyPercent}%
                      </Title>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card className="!rounded-xl border-l-4 border-l-violet-500">
                      <Text type="secondary" className="text-xs">
                        {orgFilter
                          ? yearMatrix.orgName || '—'
                          : t({
                              uz: 'Barcha filiallar',
                              en: 'All branches',
                              ru: 'Все филиалы',
                            })}
                      </Text>
                      <Title level={4} className="!mb-0 !mt-1">
                        {yearMatrix.year}
                      </Title>
                    </Card>
                  </Col>
                </Row>

                <Card
                  title={t({
                    uz: 'Xodimlar — yillik reja (oylik %)',
                    en: 'Employees — yearly plan (monthly %)',
                    ru: 'Сотрудники — годовой план',
                  })}
                  className="!rounded-xl"
                >
                  <PlanMatrixTable
                    data={filteredYearMatrix}
                    period="yearly"
                    hideOrgColumn={Boolean(orgFilter)}
                    pageSize={50}
                  />
                </Card>
              </>
            )
          ) : matrixLoading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <>
              <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} sm={8}>
                  <Card className="!rounded-xl border-l-4 border-l-blue-500">
                    <Text type="secondary" className="text-xs">
                      {t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' })}
                    </Text>
                    <Title level={3} className="!mb-0">
                      {formatNumber(planMatrix.totalEmployees)}
                    </Title>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card className="!rounded-xl border-l-4 border-l-emerald-500">
                    <Text type="secondary" className="text-xs">
                      {t({
                        uz: 'O‘rtacha oylik %',
                        en: 'Avg monthly %',
                        ru: 'Средний %',
                      })}
                    </Text>
                    <Title level={3} className="!mb-0">
                      {planMatrix.averageMonthlyPercent}%
                    </Title>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card className="!rounded-xl border-l-4 border-l-violet-500">
                    <Text type="secondary" className="text-xs">
                      {orgFilter
                        ? planMatrix.orgName || '—'
                        : t({
                            uz: 'Barcha filiallar',
                            en: 'All branches',
                            ru: 'Все филиалы',
                          })}
                    </Text>
                    <Title level={4} className="!mb-0 !mt-1">
                      {planMatrix.month} · {planMatrix.daysInMonth}{' '}
                      {t({ uz: 'kun', en: 'days', ru: 'дней' })}
                    </Title>
                  </Card>
                </Col>
              </Row>

              <Card
                title={t({
                  uz:
                    period === 'daily'
                      ? 'Xodimlar — kunlik reja'
                      : 'Xodimlar — oylik reja',
                  en:
                    period === 'daily'
                      ? 'Employees — daily plan'
                      : 'Employees — monthly plan',
                  ru:
                    period === 'daily'
                      ? 'Сотрудники — дневной план'
                      : 'Сотрудники — месячный план',
                })}
                className="!rounded-xl"
              >
                <PlanMatrixTable
                  data={filteredMatrix}
                  period={period}
                  highlightDate={date}
                  hideOrgColumn={Boolean(orgFilter)}
                  pageSize={50}
                />
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
