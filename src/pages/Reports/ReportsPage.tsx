import { useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  Download,
  Upload as UploadIcon,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import type {
  DailyReport,
  MonthlyPlanMatrix,
  MonthlyPlanMatrixEmployee,
  UserProfile,
} from '@/services/api';
import { PercentBar } from '@/pages/Analytics/components/PercentBar';
import { formatNumber, todayStr } from '@/pages/Analytics/analytics-utils';
import { ReportCompareSection } from './ReportCompareSection';

const { Text, Title } = Typography;

type PlanMode = 'daily' | 'monthly' | 'branch' | 'compare';
type EmployeeFilter = 'all' | 'inactive' | 'completed' | 'extra';


const emptyDaily: DailyReport = {
  planDate: todayStr(),
  dailyGoalCorrect: 10,
  totalPlan: 0,
  completedTotal: 0,
  extraCorrectTotal: 0,
  remaining: 0,
  completionPercent: 0,
  totalEmployees: 0,
  activeEmployees: 0,
  completedEmployees: 0,
  branchCount: 0,
  branches: [],
  employees: [],
};

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

export default function ReportsPage() {
  const { t } = useTranslation();
  const [planMode, setPlanMode] = useState<PlanMode>('daily');
  const [date, setDate] = useState(todayStr());
  const [orgFilter, setOrgFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<EmployeeFilter>('all');
  const [downloading, setDownloading] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);

  const month = date.slice(0, 7);

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

  const { data: dailyReport, initialLoading: dailyLoading } = useFetch(
    ['daily-report', date, orgFilter],
    () =>
      apiService.getDailyReport({
        date,
        orgId: orgFilter || undefined,
      }),
    emptyDaily,
    { enabled: planMode === 'daily' },
  );

  const { data: planMatrix, initialLoading: matrixLoading } = useFetch(
    ['monthly-plan-matrix', orgFilter, month, planMode],
    () =>
      apiService.getMonthlyPlanMatrix({
        orgId: orgFilter || undefined,
        month,
      }),
    emptyMatrix,
    { enabled: planMode === 'daily' || planMode === 'monthly' || planMode === 'branch' },
  );

  const loading =
    planMode === 'compare'
      ? false
      : matrixLoading || (planMode === 'daily' && dailyLoading);

  const orgOptions = useMemo(
    () => organizations.map((o) => ({ value: o.id, label: o.name })),
    [organizations],
  );

  const matrixColumns = useMemo(() => {
    const showOrgCol = !orgFilter;
    const daysForCols = planMatrix.days ?? [];

    const dayCols = daysForCols.map((d, idx) => {
      return {
        title: `${d.slice(8, 10)}.${d.slice(5, 7)}`,
        key: d,
        width: 64,
        align: 'center' as const,
        onHeaderCell: () =>
          d === date ? { className: 'bg-sky-50 dark:bg-sky-950/30' } : {},
        render: (_: unknown, row: MonthlyPlanMatrixEmployee) => {
          const cell = row.dayResults[idx];
          if (!cell) return '—';
          const cls = cell.completed
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
            : cell.planCorrect > 0
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
          return (
            <span
              className={`inline-block min-w-[2.5rem] rounded px-1 py-0.5 text-[11px] font-semibold tabular-nums ${cls}`}
            >
              {cell.label}
            </span>
          );
        },
      };
    });

    return [
      {
        title: '№',
        key: 'idx',
        width: 50,
        fixed: 'left' as const,
        render: (_: unknown, __: MonthlyPlanMatrixEmployee, i: number) => i + 1,
      },
      ...(showOrgCol
        ? [
            {
              title: t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' }),
              dataIndex: 'orgName',
              key: 'orgName',
              width: 160,
              fixed: 'left' as const,
              ellipsis: true,
            },
          ]
        : []),
      {
        title: t({ uz: 'F.I.O', en: 'Name', ru: 'Ф.И.О' }),
        dataIndex: 'fullName',
        key: 'fullName',
        width: 180,
        fixed: 'left' as const,
        ellipsis: true,
      },
      ...dayCols,
      {
        title: t({
          uz: `Bajarilgan / ${planMatrix.daysInMonth}`,
          en: `Done / ${planMatrix.daysInMonth}`,
          ru: `Выполнено / ${planMatrix.daysInMonth}`,
        }),
        dataIndex: 'daysCompleted',
        key: 'daysCompleted',
        width: 110,
        fixed: 'right' as const,
        render: (v: number) => (
          <span className="font-semibold tabular-nums">
            {v}/{planMatrix.daysInMonth}
          </span>
        ),
      },
      {
        title: t({ uz: 'Oylik %', en: 'Monthly %', ru: 'Мес. %' }),
        dataIndex: 'monthlyPercent',
        key: 'monthlyPercent',
        width: 140,
        fixed: 'right' as const,
        render: (p: number) => <PercentBar percent={p} />,
      },
    ];
  }, [planMatrix.days, planMatrix.daysInMonth, orgFilter, date, t]);

  const matrixEmployees = useMemo(() => {
    let list = planMatrix.employees ?? [];
    switch (employeeFilter) {
      case 'inactive':
        list = list.filter((e) => e.daysCompleted === 0);
        break;
      case 'completed':
        list = list.filter((e) => e.monthlyPercent >= 100);
        break;
      case 'extra':
        list = list.filter((e) => e.extraCorrectTotal > 0);
        break;
      default:
        break;
    }
    return list;
  }, [planMatrix.employees, employeeFilter]);

  return (
    <div>
      <PageHeader
        title={t({ uz: 'Hisobotlar', en: 'Reports', ru: 'Отчёты' })}
        description={t({
          uz: 'Umumiy va filial hisobotlari, Excel yuklab olish va solishtirish',
          en: 'Overall and branch reports, Excel download and comparison',
          ru: 'Общие и филиальные отчёты, Excel и сравнение',
        })}
      />

      {planMode === 'compare' ? (
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
      ) : null}

      {planMode !== 'compare' ? (
      <Card className="mb-6 !rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {planMode === 'daily' ? (
            <DatePicker
              value={dayjs(date)}
              onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
              allowClear={false}
              className="w-[150px]"
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
          <Select
            value={planMode}
            onChange={(v) => {
              const next = v as PlanMode;
              if (next === 'compare' && !canCompare) {
                message.warning(
                  t({
                    uz: 'Solishtirish faqat asosiy filial moderatorlariga ochiq',
                    en: 'Comparison is only for main-branch moderators',
                    ru: 'Сравнение только для основного филиала',
                  }),
                );
                return;
              }
              setPlanMode(next);
            }}
            className="min-w-[200px]"
            options={[
              {
                value: 'daily',
                label: t({ uz: 'Kunlik', en: 'Daily', ru: 'День' }),
              },
              {
                value: 'monthly',
                label: t({
                  uz: 'Umumiy hisobot',
                  en: 'Overall report',
                  ru: 'Общий отчёт',
                }),
              },
              {
                value: 'branch',
                label: t({
                  uz: 'Filial kesimida',
                  en: 'By branch',
                  ru: 'По филиалу',
                }),
              },
              ...(canCompare
                ? [
                    {
                      value: 'compare',
                      label: t({
                        uz: 'Solishtirish',
                        en: 'Compare',
                        ru: 'Сравнение',
                      }),
                    },
                  ]
                : []),
            ]}
          />
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
            onChange={(v) => setOrgFilter(v ?? '')}
            className="min-w-[220px]"
            options={orgOptions}
          />
          <Button
            type="primary"
            icon={<Download className="h-4 w-4" />}
            loading={downloading}
            disabled={planMode === 'branch' && !orgFilter}
            onClick={handleDownload}
          >
            {planMode === 'daily'
              ? orgFilter
                ? t({
                    uz: '1 filial · kunlik Excel',
                    en: '1 branch · daily Excel',
                    ru: '1 филиал · день Excel',
                  })
                : t({
                    uz: 'Barcha filial · kunlik Excel',
                    en: 'All branches · daily Excel',
                    ru: 'Все филиалы · день Excel',
                  })
              : planMode === 'monthly'
                ? orgFilter
                  ? t({
                      uz: '1 filial · oylik Excel',
                      en: '1 branch · monthly Excel',
                      ru: '1 филиал · месяц Excel',
                    })
                  : t({
                      uz: 'Barcha filial · oylik Excel',
                      en: 'All branches · monthly Excel',
                      ru: 'Все филиалы · месяц Excel',
                    })
                : t({
                    uz: 'Filial reja Excel (solishtirish uchun)',
                    en: 'Branch plan Excel (for compare)',
                    ru: 'Excel плана филиала',
                  })}
          </Button>
          {planMode === 'branch' ? (
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
        {planMode !== 'branch' ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {t({
              uz: 'Filial tanlanmasa — barcha filiallar: har biri alohida Excel sheet (turli rang). Bitta filial tanlansa — faqat shu filial.',
              en: 'No branch selected = all branches, each on its own colored Excel sheet. One branch = that branch only.',
              ru: 'Без филиала — все филиалы, каждый на отдельном цветном листе. Один филиал — только он.',
            })}
          </p>
        ) : null}
        {planMode === 'branch' && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t({
              uz: 'Filial Excel ni yuklab oling, keyin «Excelni taqdim etish» orqali yuboring — ID beriladi. Qo‘lda o‘zgartirilsa yuklagan ko‘rinadi. Asosiy filial Solishtirishda tekshiradi.',
              en: 'Download branch Excel, then submit — you get an ID. If altered, uploader is shown. Main branch checks under Compare.',
              ru: 'Скачайте Excel филиала и отправьте — появится ID. При правке видно кто загрузил. Сверка в разделе Сравнение.',
            })}
          </p>
        )}
      </Card>
      ) : (
      <Card className="mb-6 !rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={planMode}
            onChange={(v) => setPlanMode(v as PlanMode)}
            className="min-w-[200px]"
            options={[
              {
                value: 'daily',
                label: t({ uz: 'Kunlik', en: 'Daily', ru: 'День' }),
              },
              {
                value: 'monthly',
                label: t({
                  uz: 'Umumiy hisobot',
                  en: 'Overall report',
                  ru: 'Общий отчёт',
                }),
              },
              {
                value: 'branch',
                label: t({
                  uz: 'Filial kesimida',
                  en: 'By branch',
                  ru: 'По филиалу',
                }),
              },
              {
                value: 'compare',
                label: t({
                  uz: 'Solishtirish',
                  en: 'Compare',
                  ru: 'Сравнение',
                }),
              },
            ]}
          />
        </div>
      </Card>
      )}

      {planMode === 'compare' ? null : loading ? (
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
                  {planMode === 'daily'
                    ? t({ uz: 'Plan % (kun)', en: 'Plan % (day)', ru: 'План % (день)' })
                    : t({ uz: 'O‘rtacha oylik %', en: 'Avg monthly %', ru: 'Средний %' })}
                </Text>
                <Title level={3} className="!mb-0">
                  {planMode === 'daily'
                    ? `${dailyReport.completionPercent}%`
                    : `${planMatrix.averageMonthlyPercent}%`}
                </Title>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="!rounded-xl border-l-4 border-l-violet-500">
                <Text type="secondary" className="text-xs">
                  {orgFilter
                    ? planMatrix.orgName || '—'
                    : t({ uz: 'Barcha filiallar', en: 'All branches', ru: 'Все филиалы' })}
                </Text>
                <Title level={4} className="!mb-0 !mt-1">
                  {planMode === 'daily'
                    ? date
                    : `${planMatrix.month} · ${planMatrix.daysInMonth} ${t({ uz: 'kun', en: 'days', ru: 'дней' })}`}
                </Title>
              </Card>
            </Col>
          </Row>

          <Card
            title={
              planMode === 'daily'
                ? t({
                    uz: 'Xodimlar — kunlik reja',
                    en: 'Employees — daily plan',
                    ru: 'Сотрудники — дневной план',
                  })
                : t({
                    uz: 'Xodimlar — kunlik reja (oy)',
                    en: 'Employees — daily plan (month)',
                    ru: 'Сотрудники — дневной план (месяц)',
                  })
            }
            className="!rounded-xl"
            extra={
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex flex-wrap gap-2 text-xs">
                  <Tag color="success">10/10</Tag>
                  <Tag color="warning">1–9/10</Tag>
                  <Tag>0/10</Tag>
                </span>
                <Select
                  value={employeeFilter}
                  onChange={(v) => setEmployeeFilter(v as EmployeeFilter)}
                  className="min-w-[160px]"
                  options={[
                    { value: 'all', label: t({ uz: 'Barchasi', en: 'All', ru: 'Все' }) },
                    {
                      value: 'inactive',
                      label: t({
                        uz: 'Natija yo‘q',
                        en: 'No activity',
                        ru: 'Без активности',
                      }),
                    },
                    {
                      value: 'completed',
                      label: t({
                        uz: 'Plan bajarilgan',
                        en: 'Plan done',
                        ru: 'План выполнен',
                      }),
                    },
                    {
                      value: 'extra',
                      label: t({
                        uz: 'Plandan tashqari',
                        en: 'Beyond plan',
                        ru: 'Сверх плана',
                      }),
                    },
                  ]}
                />
              </div>
            }
          >
            <div className="overflow-x-auto">
              <Table
                rowKey={(r) => `${r.orgId ?? ''}-${r.userId}`}
                dataSource={matrixEmployees}
                columns={matrixColumns}
                pagination={{ pageSize: 50, showSizeChanger: true }}
                size="small"
                scroll={{
                  x: Math.max(
                    700,
                    280 + planMatrix.days.length * 64 + (!orgFilter ? 160 : 0),
                  ),
                }}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
