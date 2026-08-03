import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { GitCompareArrows, Upload as UploadIcon } from 'lucide-react';
import {
  Button,
  Card,
  DatePicker,
  Select,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from '@/components/ui';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import type {
  ReportSubmissionCompareResult,
  ReportSubmissionListItem,
} from '@/services/api';

const { Text, Title } = Typography;

const STATUS_COLOR: Record<string, string> = {
  match: 'green',
  mismatch: 'red',
  only_upload: 'orange',
  only_system: 'blue',
};

const STATUS_LABEL: Record<string, { uz: string; en: string; ru: string }> = {
  match: { uz: 'Mos', en: 'Match', ru: 'Совпадает' },
  mismatch: { uz: 'Farq', en: 'Diff', ru: 'Отличие' },
  only_upload: { uz: 'Faqat Excel', en: 'Excel only', ru: 'Только Excel' },
  only_system: { uz: 'Faqat tizim', en: 'System only', ru: 'Только система' },
};

type Props = {
  organizations: Array<{ id: string; name: string }>;
  month: string;
  orgId?: string;
  onMonthChange: (month: string) => void;
  onOrgChange?: (orgId: string) => void;
};

export function ReportCompareSection({
  organizations,
  month,
  orgId = '',
  onMonthChange,
  onOrgChange,
}: Props) {
  const { t } = useTranslation();
  const orgFilter = orgId;
  const setOrgFilter = (v: string) => onOrgChange?.(v);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [comparingId, setComparingId] = useState<string | null>(null);
  const [compareResult, setCompareResult] =
    useState<ReportSubmissionCompareResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const { data: submissions, loading } = useFetch<ReportSubmissionListItem[]>(
    ['report-submissions', month, orgFilter, refreshKey],
    () =>
      apiService.listReportSubmissions({
        month,
        orgId: orgFilter || undefined,
      }),
    [],
  );

  const orgOptions = useMemo(
    () => organizations.map((o) => ({ value: o.id, label: o.name })),
    [organizations],
  );

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const created = await apiService.uploadReportSubmission(file);
      if (created.integrityStatus === 'tampered') {
        const who = created.uploadedBy
          ? `${created.uploadedBy.lastName} ${created.uploadedBy.firstName}`.trim() ||
            created.uploadedBy.email
          : 'noma’lum';
        message.warning(
          t({
            uz: `Yuklandi, lekin Excel qo‘lda o‘zgartirilgan. Yuklagan: ${who}. ID: ${created.id}`,
            en: `Uploaded, but Excel was altered. Uploader: ${who}. ID: ${created.id}`,
            ru: `Загружено, но Excel изменён. Загрузил: ${who}. ID: ${created.id}`,
          }),
        );
      } else {
        message.success(
          t({
            uz: `Yuklandi. ID: ${created.id}`,
            en: `Uploaded. ID: ${created.id}`,
            ru: `Загружено. ID: ${created.id}`,
          }),
        );
      }
      setRefreshKey((k) => k + 1);
      setComparingId(created.id);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Yuklashda xato');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const runCompare = async (id: string) => {
    setComparingId(id);
    setCompareLoading(true);
    try {
      const res = await apiService.compareReportSubmission(id);
      setCompareResult(res);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Solishtirishda xato');
      setCompareResult(null);
    } finally {
      setCompareLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 280,
      render: (v: string) => (
        <span className="font-mono text-xs break-all">{v}</span>
      ),
    },
    {
      title: t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' }),
      dataIndex: 'orgName',
      key: 'orgName',
    },
    {
      title: t({ uz: 'Oy', en: 'Month', ru: 'Месяц' }),
      dataIndex: 'month',
      key: 'month',
      width: 100,
    },
    {
      title: t({ uz: 'Fayl', en: 'File', ru: 'Файл' }),
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
    },
    {
      title: t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' }),
      dataIndex: 'employeeCount',
      key: 'employeeCount',
      width: 100,
    },
    {
      title: t({ uz: 'Yuklagan', en: 'Uploaded by', ru: 'Загрузил' }),
      key: 'uploader',
      render: (_: unknown, r: ReportSubmissionListItem) =>
        r.uploadedBy
          ? `${r.uploadedBy.lastName} ${r.uploadedBy.firstName}`.trim()
          : '—',
    },
    {
      title: t({ uz: 'Yaxlitlik', en: 'Integrity', ru: 'Целостность' }),
      key: 'integrity',
      width: 140,
      render: (_: unknown, r: ReportSubmissionListItem) => {
        const s = r.integrityStatus ?? 'unsigned';
        if (s === 'ok') {
          return (
            <Tag color="green">
              {t({ uz: 'Original', en: 'Original', ru: 'Оригинал' })}
            </Tag>
          );
        }
        if (s === 'tampered') {
          return (
            <Tag color="red">
              {t({ uz: 'O‘zgartirilgan', en: 'Altered', ru: 'Изменён' })}
            </Tag>
          );
        }
        return (
          <Tag color="default">
            {t({ uz: 'Imzosiz', en: 'Unsigned', ru: 'Без подписи' })}
          </Tag>
        );
      },
    },
    {
      title: t({ uz: 'Vaqt', en: 'Time', ru: 'Время' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) =>
        new Date(v).toLocaleString(undefined, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    {
      title: '',
      key: 'actions',
      width: 130,
      render: (_: unknown, r: ReportSubmissionListItem) => (
        <Button
          type="primary"
          size="small"
          icon={<GitCompareArrows className="h-3.5 w-3.5" />}
          loading={compareLoading && comparingId === r.id}
          onClick={() => void runCompare(r.id)}
        >
          {t({ uz: 'Solishtir', en: 'Compare', ru: 'Сравнить' })}
        </Button>
      ),
    },
  ];

  const diffColumns = [
    {
      title: t({ uz: 'Login', en: 'Login', ru: 'Логин' }),
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true,
    },
    {
      title: t({ uz: 'F.I.O', en: 'Name', ru: 'Ф.И.О' }),
      dataIndex: 'fullName',
      key: 'fullName',
      width: 180,
      ellipsis: true,
    },
    {
      title: t({ uz: 'Holat', en: 'Status', ru: 'Статус' }),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => (
        <Tag color={STATUS_COLOR[s] ?? 'default'}>
          {t(STATUS_LABEL[s] ?? { uz: s, en: s, ru: s })}
        </Tag>
      ),
    },
    {
      title: t({ uz: 'Excel %', en: 'Excel %', ru: 'Excel %' }),
      key: 'upPct',
      width: 90,
      render: (_: unknown, r: ReportSubmissionCompareResult['rows'][number]) =>
        r.uploaded?.monthlyPercent ?? '—',
    },
    {
      title: t({ uz: 'Tizim %', en: 'System %', ru: 'Система %' }),
      key: 'sysPct',
      width: 90,
      render: (_: unknown, r: ReportSubmissionCompareResult['rows'][number]) =>
        r.system?.monthlyPercent ?? '—',
    },
    {
      title: t({ uz: 'Farqlar', en: 'Diffs', ru: 'Отличия' }),
      dataIndex: 'diffs',
      key: 'diffs',
      render: (diffs: string[]) =>
        diffs.length ? (
          <ul className="m-0 list-disc pl-4 text-xs text-red-700 dark:text-red-300">
            {diffs.slice(0, 4).map((d) => (
              <li key={d}>{d}</li>
            ))}
            {diffs.length > 4 ? <li>+{diffs.length - 4}…</li> : null}
          </ul>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="!rounded-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Title level={4} className="!mb-1 flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5 text-sky-600" />
              {t({
                uz: 'Solishtirish',
                en: 'Compare',
                ru: 'Сравнение',
              })}
            </Title>
            <Text type="secondary" className="text-sm">
              {t({
                uz: 'Filial moderatori Excel yuklaydi — har bir faylga ID beriladi. Asosiy filial shu ID bo‘yicha tizim bilan solishtiradi.',
                en: 'Branch moderator uploads Excel — each file gets an ID. Main branch compares that ID to the live system.',
                ru: 'Модератор филиала загружает Excel — у файла появляется ID. Основной филиал сравнивает с системой.',
              })}
            </Text>
          </div>
          <Upload
            accept=".xlsx,.xls"
            beforeUpload={(file) => {
              void handleUpload(file);
              return false;
            }}
          >
            <Button icon={<UploadIcon className="h-4 w-4" />} loading={uploading}>
              {t({
                uz: 'Excel yuklash',
                en: 'Upload Excel',
                ru: 'Загрузить Excel',
              })}
            </Button>
          </Upload>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <DatePicker
            picker="month"
            value={dayjs(`${month}-01`)}
            onChange={(d) => d && onMonthChange(d.format('YYYY-MM'))}
            allowClear={false}
            className="w-[150px]"
          />
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
          <Button onClick={() => setRefreshKey((k) => k + 1)} loading={loading}>
            {t({ uz: 'Yangilash', en: 'Refresh', ru: 'Обновить' })}
          </Button>
        </div>
      </Card>

      <Card
        className="!rounded-xl"
        title={t({
          uz: 'Yuklangan hisobotlar',
          en: 'Uploaded reports',
          ru: 'Загруженные отчёты',
        })}
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={submissions}
          columns={columns}
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {compareResult ? (
        <Card
          className="!rounded-xl"
          title={
            <span>
              {t({ uz: 'Natija', en: 'Result', ru: 'Результат' })} ·{' '}
              <span className="font-mono text-xs">{compareResult.submission.id}</span>
            </span>
          }
        >
          <div className="mb-4 flex flex-wrap gap-2">
            <Tag color="green">
              Mos: {compareResult.summary.matched}
            </Tag>
            <Tag color="red">
              Farq: {compareResult.summary.mismatched}
            </Tag>
            <Tag color="orange">
              Faqat Excel: {compareResult.summary.onlyInUpload}
            </Tag>
            <Tag color="blue">
              Faqat tizim: {compareResult.summary.onlyInSystem}
            </Tag>
            <Tag>
              {compareResult.system.orgName} · {compareResult.system.month}
            </Tag>
          </div>
          {compareResult.integrity ? (
            <div
              className={`mb-4 rounded-lg px-3 py-2 text-sm ${
                compareResult.integrity.status === 'tampered'
                  ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
                  : compareResult.integrity.status === 'ok'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {compareResult.integrity.message}
            </div>
          ) : null}
          <Table
            rowKey={(r) => `${r.status}-${r.email}`}
            loading={compareLoading}
            dataSource={compareResult.rows.filter((r) => r.status !== 'match')}
            columns={diffColumns}
            size="small"
            pagination={{ pageSize: 20 }}
            locale={{
              emptyText: t({
                uz: 'Farq yo‘q — hammasi mos',
                en: 'No differences',
                ru: 'Расхождений нет',
              }),
            }}
          />
        </Card>
      ) : null}
    </div>
  );
}
