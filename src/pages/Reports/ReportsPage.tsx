import { GitCompareArrows } from 'lucide-react';
import { Button, Card, Typography, message } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import type { UserProfile } from '@/services/api';
import { todayStr } from '@/pages/Analytics/analytics-utils';
import { ReportCompareSection } from './ReportCompareSection';
import { PlanResultsTable } from './PlanMatrixTable';
import { PlanResultsFilterBar } from './PlanResultsFilterBar';
import { PLAN_QP_DEFAULTS } from './planResultsQuery';
import { useState } from 'react';

const { Text } = Typography;

type PageTab = 'grid' | 'compare';

const REPORTS_QP_DEFAULTS = {
  tab: 'grid',
  orgId: undefined as string | undefined,
  page: undefined as string | undefined,
} as const;

export default function ReportsPage() {
  const { t } = useTranslation();
  const { params: qp, setParam, setParams } = useQueryParams(REPORTS_QP_DEFAULTS);
  const { params: planQp, setParams: setPlanParams } =
    useQueryParams(PLAN_QP_DEFAULTS);
  const [uploadingReport, setUploadingReport] = useState(false);

  const tab = (qp.tab === 'compare' ? 'compare' : 'grid') as PageTab;
  const orgFilter = qp.orgId ?? '';
  const today = todayStr();
  const month = planQp.month || today.slice(0, 7);

  const setTab = (next: PageTab) => {
    setParam('tab', next === 'grid' ? undefined : next);
  };

  const setOrg = (v: string) => {
    setParams({ orgId: v || undefined, page: undefined });
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
            onMonthChange={(m) => setPlanParams({ month: m, page: undefined })}
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
            <PlanResultsFilterBar
              showOrgFilter
              orgId={orgFilter || undefined}
              orgOptions={orgOptions}
              onOrgChange={setOrg}
              showFilial={!orgFilter}
              showUpload={me?.role !== 'ACCOUNTING'}
              onUpload={handleSubmitBranchExcel}
              uploading={uploadingReport}
            />
          </Card>

          <Card className="!rounded-xl min-w-0 max-w-full overflow-hidden">
            <PlanResultsTable
              showFilial={!orgFilter}
              orgId={orgFilter || undefined}
              pageSize={50}
              embeddedControls={false}
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
