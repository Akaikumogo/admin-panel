import { useState, type ReactNode } from 'react';
import { Building2, Download, Upload as UploadIcon } from 'lucide-react';
import dayjs from 'dayjs';
import {
  Button,
  DatePicker,
  Segmented,
  Select,
  Upload,
  message,
} from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import apiService from '@/services/api';
import { todayStr } from '@/pages/Analytics/analytics-utils';
import { PLAN_QP_DEFAULTS, type PlanPeriod } from './planResultsQuery';

type OrgOption = { value: string; label: string };

type Props = {
  orgId?: string;
  userId?: string;
  showFilial?: boolean;
  /** Filial select ko‘rsatish */
  showOrgFilter?: boolean;
  orgOptions?: OrgOption[];
  onOrgChange?: (orgId: string) => void;
  /** Filial tanlanganda Excel taqdim etish */
  showUpload?: boolean;
  onUpload?: (file: File) => boolean | void | Promise<boolean | void>;
  uploading?: boolean;
  extraActions?: ReactNode;
  className?: string;
};

/**
 * Reja natijalari filterlari — bitta joyda:
 * filial + kunlik/oylik/yillik + sana + Excel.
 * URL query (`period`, `day`, `month`, `year`) bilan jadval sinxron.
 */
export function PlanResultsFilterBar({
  orgId,
  userId,
  showFilial = true,
  showOrgFilter = false,
  orgOptions = [],
  onOrgChange,
  showUpload = false,
  onUpload,
  uploading = false,
  extraActions,
  className,
}: Props) {
  const { t } = useTranslation();
  const today = todayStr();
  const { params: qp, setParams } = useQueryParams(PLAN_QP_DEFAULTS);
  const [exporting, setExporting] = useState(false);

  const period: PlanPeriod =
    (qp.period as PlanPeriod) || (PLAN_QP_DEFAULTS.period as PlanPeriod);
  const day = qp.day || today;
  const month = qp.month || today.slice(0, 7);
  const year = qp.year || today.slice(0, 4);
  const monthForFetch = period === 'daily' ? day.slice(0, 7) : month;

  const setPeriod = (value: PlanPeriod) => {
    setParams({ period: value, page: undefined });
  };
  const setDay = (value: string) => {
    setParams({
      day: value,
      month: value.slice(0, 7),
      page: undefined,
    });
  };
  const setMonth = (value: string) => {
    setParams({ month: value, page: undefined });
  };
  const setYear = (value: string) => {
    setParams({ year: value, page: undefined });
  };

  const onExport = async () => {
    setExporting(true);
    try {
      if (period === 'yearly') {
        await apiService.downloadYearlyPlanMatrixExcel({
          orgId: orgId || undefined,
          year,
          userId,
          showFilial,
        });
      } else {
        await apiService.downloadMonthlyPlanMatrixExcel({
          orgId: orgId || undefined,
          month: monthForFetch,
          period,
          date: period === 'daily' ? day : undefined,
          userId,
          showFilial,
        });
      }
      message.success(
        t({ uz: 'Excel yuklandi', en: 'Excel downloaded', ru: 'Excel скачан' }),
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Excel xato');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={className ?? 'flex flex-wrap items-center gap-3'}>
      {showOrgFilter ? (
        <>
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select
            allowClear
            showSearch
            placeholder={t({
              uz: 'Barcha filiallar',
              en: 'All branches',
              ru: 'Все филиалы',
            })}
            value={orgId || undefined}
            onChange={(v) => onOrgChange?.(v ?? '')}
            className="min-w-[220px]"
            options={orgOptions}
          />
        </>
      ) : null}

      <Segmented<PlanPeriod>
        value={period}
        onChange={(v) => setPeriod(v)}
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

      {period === 'yearly' ? (
        <DatePicker
          picker="year"
          value={dayjs(`${year}-01-01`)}
          onChange={(d) => d && setYear(d.format('YYYY'))}
          allowClear={false}
          className="w-[110px]"
        />
      ) : period === 'daily' ? (
        <DatePicker
          value={dayjs(day)}
          onChange={(d) => d && setDay(d.format('YYYY-MM-DD'))}
          allowClear={false}
          className="w-[150px]"
        />
      ) : (
        <DatePicker
          picker="month"
          value={dayjs(`${month}-01`)}
          onChange={(d) => d && setMonth(d.format('YYYY-MM'))}
          allowClear={false}
          className="w-[140px]"
        />
      )}

      <Button
        type="primary"
        icon={<Download className="h-4 w-4" />}
        loading={exporting}
        onClick={() => void onExport()}
      >
        {t({ uz: 'Excel', en: 'Excel', ru: 'Excel' })}
      </Button>

      {showUpload && orgId && onUpload ? (
        <Upload
          accept=".xlsx,.xls"
          beforeUpload={(file) => {
            void onUpload(file);
            return false;
          }}
        >
          <Button icon={<UploadIcon className="h-4 w-4" />} loading={uploading}>
            {t({
              uz: 'Excelni taqdim etish',
              en: 'Submit Excel',
              ru: 'Отправить Excel',
            })}
          </Button>
        </Upload>
      ) : null}

      {extraActions}
    </div>
  );
}
