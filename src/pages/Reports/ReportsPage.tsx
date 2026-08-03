import { Building2, Download, GitCompareArrows, Upload as UploadIcon } from 'lucide-react';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Select,
  Typography,
  Upload,
  message,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import type { UserProfile } from '@/services/api';
import { todayStr } from '@/pages/Analytics/analytics-utils';
import { ReportCompareSection } from './ReportCompareSection';
import { PlanResultsTable } from './PlanMatrixTable';
import { useState } from 'react';

const { Text } = Typography;

type PageTab = 'grid' | 'compare';
type DownloadKind = 'daily' | 'monthly' | null;

const REPORTS_QP_DEFAULTS = {
  tab: 'grid',
  orgId: undefined as string | undefined,
  date: undefined as string | undefined,
  day: undefined as string | undefined,
  month: undefined as string | undefined,
  page: undefined as string | undefined,
} as const;

export default function ReportsPage() {
  const { t } = useTranslation();
  const { params: qp, setParam, setParams } = useQueryParams(REPORTS_QP_DEFAULTS);
  const [downloading, setDownloading] = useState<DownloadKind>(null);
  const [uploadingReport, setUploadingReport] = useState(false);

  const tab = (qp.tab === 'compare' ? 'compare' : 'grid') as PageTab;
  const orgFilter = qp.orgId ?? '';
  const date = qp.date || todayStr();
  const month = date.slice(0, 7);

  const setTab = (next: PageTab) => {
    setParam('tab', next === 'grid' ? undefined : next);
  };

  const setOrg = (v: string) => {
    setParams({ orgId: v || undefined, page: undefined });
  };

  const setDate = (v: string) => {
    setParams({
      date: v === todayStr() ? undefined : v,
      day: v,
      month: v.slice(0, 7),
      page: undefined,
    });
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

  const orgOptions = organizations.map((o) => ({ value: o.id, label: o.name }));

  const runDownload = async (kind: Exclude<DownloadKind, null>) => {
    setDownloading(kind);
    try {
      if (kind === 'daily') {
        const scope = orgFilter ? 'filial' : 'barcha';
        await apiService.downloadDailyReportExcel({
          date,
          orgId: orgFilter || undefined,
          filename: `kunlik-${date}-${scope}.xlsx`,
        });
      } else {
        const scope = orgFilter ? 'filial' : 'barcha';
        await apiService.downloadMonthlyReportExcel({
          month,
          orgId: orgFilter || undefined,
          filename: `oylik-${month}-${scope}.xlsx`,
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
    <div className="min-w-0 max-w-full overflow-x-hidden">
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
            orgId={orgFilter}
            onMonthChange={(m) => setDate(`${m}-01`)}
            onOrgChange={setOrg}
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
              <DatePicker
                value={dayjs(date)}
                onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
                allowClear={false}
                className="w-[150px]"
              />
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
          </Card>

          <Card className="!rounded-xl min-w-0 max-w-full overflow-hidden">
            <PlanResultsTable
              showFilial={!orgFilter}
              orgId={orgFilter || undefined}
              pageSize={50}
              title={
                <span className="text-sm font-semibold">
                  {t({
                    uz: 'Xodimlar — reja natijalari',
                    en: 'Employees — plan results',
                    ru: 'Сотрудники — результаты плана',
                  })}
                </span>
              }
            />
          </Card>
        </>
      )}
    </div>
  );
}
