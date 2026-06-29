import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Upload,
  message,
} from 'antd';
import { ArrowRightLeft, Eye, FileSpreadsheet, Play, RefreshCw, Sparkles } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import apiService, {
  type BulkModeratorMigrationPreview,
  type LegacyModeratorMergePreview,
  type MigrationSuggestion,
  type UserProfile,
} from '@/services/api';
import { isSuperAdmin } from '@/utils/isSuperAdmin';

function formatEmployeeLabel(u: UserProfile) {
  const org = u.organizations?.map((o) => o.name).join(', ');
  const name = `${u.lastName} ${u.firstName}`.trim();
  return org ? `${name} — ${org} (${u.email})` : `${name} (${u.email})`;
}

const CONFIDENCE_META: Record<
  MigrationSuggestion['confidence'],
  { color: string; label: string }
> = {
  high: { color: 'green', label: 'Yuqori moslik' },
  medium: { color: 'orange', label: "O'rtacha moslik" },
  low: { color: 'default', label: 'Past moslik' },
};

const permissionOptions = [
  { value: 'prefer-source', label: 'Eski moderator ruxsatlari (tavsiya)' },
  { value: 'union', label: 'Birlashtirish (union — kengroq)' },
  { value: 'prefer-target', label: 'Xodimdagi ruxsatlar' },
] as const;

const ModeratorMigrationPage = () => {
  const [sourceId, setSourceId] = useState<string | undefined>();
  const [targetId, setTargetId] = useState<string | undefined>();
  const [permissionMerge, setPermissionMerge] =
    useState<'prefer-source' | 'prefer-target' | 'union'>('prefer-source');
  const [preview, setPreview] = useState<LegacyModeratorMergePreview | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    data: legacyModerators,
    loading: legacyLoading,
    refetch: refetchLegacy,
  } = useFetch(
    ['legacy-moderators'],
    () => apiService.listLegacyModerators(),
    [] as UserProfile[],
  );

  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const [suggestions, setSuggestions] = useState<MigrationSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<BulkModeratorMigrationPreview | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkFileBase64, setBulkFileBase64] = useState<string | null>(null);

  const readExcelBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('Fayl o‘qilmadi'));
          return;
        }
        const base64 = result.split(',')[1];
        if (!base64) {
          reject(new Error('Base64 xato'));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error ?? new Error('Fayl xato'));
      reader.readAsDataURL(file);
    });

  const runBulkPreview = async (file: File) => {
    setBulkLoading(true);
    try {
      const fileBase64 = await readExcelBase64(file);
      setBulkFileBase64(fileBase64);
      const res = await apiService.previewBulkModeratorMigration(fileBase64);
      setBulkPreview(res);
      message.success(
        `Preview: ${res.summary.readyToMerge}/${res.summary.total} ta tayyor`,
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Preview xatosi');
    } finally {
      setBulkLoading(false);
    }
  };

  const runBulkApply = async (dryRun: boolean) => {
    if (!bulkFileBase64) {
      message.warning('Avval Excel yuklang');
      return;
    }
    setBulkLoading(true);
    try {
      const res = await apiService.applyBulkModeratorMigration({
        fileBase64: bulkFileBase64,
        dryRun,
        permissionMerge,
        onlyReady: true,
      });
      if (dryRun) {
        message.info(`Dry run: ${res.merged} ta tayyor, ${res.failed} ta muammo`);
      } else {
        message.success(`Birlashtirildi: ${res.merged}, xato: ${res.failed}`);
        refetchLegacy();
        setBulkPreview(null);
        setBulkFileBase64(null);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const loadEmployees = async (search?: string) => {
    const q = search?.trim() ?? '';
    if (q.length < 2) {
      setEmployees([]);
      return;
    }
    setEmployeesLoading(true);
    try {
      const data = await apiService.searchMigrationTargets(q);
      setEmployees(data);
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadEmployees(employeeSearch);
    }, employeeSearch ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeSearch]);

  // Eski moderator tanlanganda mos Energo ID xodimlarini avtomatik tavsiya qilamiz
  useEffect(() => {
    if (!sourceId) {
      setSuggestions([]);
      return;
    }
    let active = true;
    setSuggestionsLoading(true);
    apiService
      .suggestMigrationTargets(sourceId)
      .then((res) => {
        if (active) setSuggestions(res);
      })
      .finally(() => {
        if (active) setSuggestionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sourceId]);

  const pickSuggestion = (suggestion: MigrationSuggestion) => {
    setEmployees((prev) =>
      prev.some((e) => e.id === suggestion.user.id)
        ? prev
        : [suggestion.user, ...prev],
    );
    setTargetId(suggestion.user.id);
  };

  const source = useMemo(
    () => legacyModerators.find((m) => m.id === sourceId),
    [legacyModerators, sourceId],
  );
  const target = useMemo(
    () => employees.find((e) => e.id === targetId),
    [employees, targetId],
  );

  if (!isSuperAdmin()) {
    return (
      <div className="p-6">
        <Alert type="error" message="Faqat SuperAdmin uchun" />
      </div>
    );
  }

  const runPreview = async () => {
    if (!sourceId || !targetId) {
      message.warning('Eski moderator va Energo ID xodimini tanlang');
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.mergeLegacyModerator({
        sourceUserId: sourceId,
        targetUserId: targetId,
        permissionMerge,
        dryRun: true,
      });
      setPreview(res);
      message.success('Ko‘rib chiqish tayyor');
    } finally {
      setLoading(false);
    }
  };

  const runMerge = async () => {
    if (!sourceId || !targetId) return;
    setLoading(true);
    try {
      const res = await apiService.mergeLegacyModerator({
        sourceUserId: sourceId,
        targetUserId: targetId,
        permissionMerge,
        dryRun: false,
      });
      setPreview(res);
      setConfirmOpen(false);
      setSourceId(undefined);
      setTargetId(undefined);
      message.success('Migratsiya muvaffaqiyatli — eski moderator o‘chirildi');
      refetchLegacy();
    } finally {
      setLoading(false);
    }
  };

  const legacyColumns = [
    {
      title: 'F.I.O',
      key: 'name',
      render: (_: unknown, row: UserProfile) =>
        `${row.lastName} ${row.firstName}`,
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Filial',
      key: 'org',
      render: (_: unknown, row: UserProfile) =>
        row.organizations?.map((o) => o.name).join(', ') || '—',
    },
    {
      title: '',
      key: 'pick',
      width: 120,
      render: (_: unknown, row: UserProfile) => (
        <Button
          size="small"
          type={sourceId === row.id ? 'primary' : 'default'}
          onClick={() => setSourceId(row.id)}
        >
          Tanlash
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft size={24} />
            Moderator migratsiyasi
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Eski local moderatorni Energo ID xodimiga birlashtiring. Ruxsatlar,
            filiallar, audit va boshqa yozuvlar xodimga ko‘chadi. Eski moderator
            hisobi o‘chiriladi — yangi user yaratilmaydi.
          </p>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={() => refetchLegacy()}>
          Yangilash
        </Button>
      </div>

      <Alert
        type="info"
        showIcon
        message="Bu DB migration emas — admin panel orqali bir martalik amal"
        description="Avval «Ko‘rib chiqish», keyin «Migratsiya qilish». Har bir eski moderator uchun alohida bajariladi."
      />

      <Card
        title={
          <span className="flex items-center gap-2">
            <FileSpreadsheet size={18} />
            Excel orqali bulk migratsiya
          </span>
        }
      >
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="Avval Energo ID da MODERATOR ruxsatini bering"
          description="Energo ID admin: POST /admin/migrations/elektrolearn-moderators/apply — shu Excel bilan. Keyin bu yerda 2-bosqichni bajaring."
        />
        <Space wrap className="mb-4">
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={(file) => {
              void runBulkPreview(file);
              return false;
            }}
          >
            <Button loading={bulkLoading}>Excel yuklash (preview)</Button>
          </Upload>
          <Button
            disabled={!bulkPreview}
            loading={bulkLoading}
            onClick={() => void runBulkApply(true)}
          >
            Dry run
          </Button>
          <Button
            type="primary"
            disabled={!bulkPreview || (bulkPreview.summary.readyToMerge ?? 0) === 0}
            loading={bulkLoading}
            onClick={() => void runBulkApply(false)}
          >
            {bulkPreview?.summary.readyToMerge ?? 0} tasini birlashtirish
          </Button>
        </Space>
        {bulkPreview ? (
          <Table
            size="small"
            pagination={{ pageSize: 10 }}
            rowKey={(r) => String(r.row.index)}
            dataSource={bulkPreview.items}
            columns={[
              { title: '№', dataIndex: ['row', 'index'], width: 48 },
              { title: 'F.I.O', dataIndex: ['row', 'fullName'] },
              { title: 'Login', dataIndex: ['row', 'login'] },
              {
                title: 'Eski mod.',
                render: (_, r) => (r.source ? '✓' : '—'),
              },
              {
                title: 'Energo xodim',
                render: (_, r) =>
                  r.target
                    ? `${r.target.lastName} ${r.target.firstName}`
                    : '—',
              },
              {
                title: 'Moslik',
                render: (_, r) => (
                  <Tag
                    color={
                      r.confidence === 'high'
                        ? 'green'
                        : r.confidence === 'medium'
                          ? 'orange'
                          : 'default'
                    }
                  >
                    {r.confidence}
                  </Tag>
                ),
              },
              {
                title: 'Auto',
                render: (_, r) => (r.canAutoMerge ? '✓' : '—'),
              },
            ]}
          />
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Eski moderatorlar (${legacyModerators.length})`}>
          <Table
            rowKey="id"
            size="small"
            loading={legacyLoading}
            dataSource={legacyModerators}
            columns={legacyColumns}
            pagination={false}
            locale={{ emptyText: 'Eski moderator qolmagan 🎉' }}
          />
        </Card>

        <Card title="Energo ID xodimi (maqsad)">
          <Select
            showSearch
            allowClear
            className="w-full"
            placeholder="Ism, login, tabel №, email yoki filial..."
            loading={employeesLoading}
            value={targetId}
            onChange={setTargetId}
            filterOption={false}
            onSearch={setEmployeeSearch}
            notFoundContent={
              employeeSearch.trim().length < 2
                ? 'Kamida 2 ta belgi yozing (login, tabel №, ism)'
                : employeesLoading
                  ? 'Qidirilmoqda...'
                  : 'Xodim topilmadi — ENERGO ID sinxronini tekshiring'
            }
            options={employees.map((e) => ({
              value: e.id,
              label: formatEmployeeLabel(e),
            }))}
          />

          {sourceId ? (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <Sparkles size={15} className="text-amber-500" />
                Avtomatik tavsiya
              </div>
              {suggestionsLoading ? (
                <div className="text-sm text-slate-400">Tavsiyalar qidirilmoqda...</div>
              ) : suggestions.length === 0 ? (
                <div className="text-sm text-slate-400">
                  Mos Energo ID xodimi topilmadi — qo‘lda qidiring
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => {
                    const meta = CONFIDENCE_META[s.confidence];
                    const isPicked = targetId === s.user.id;
                    return (
                      <div
                        key={s.user.id}
                        className={`flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors ${
                          isPicked
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-700/60'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900 dark:text-white truncate">
                              {s.user.lastName} {s.user.firstName}
                            </span>
                            <Tag color={meta.color} className="!m-0">
                              {meta.label}
                            </Tag>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">
                            {s.user.email}
                            {s.user.organizations?.length
                              ? ` · ${s.user.organizations.map((o) => o.name).join(', ')}`
                              : ''}
                          </div>
                          {s.matchReasons.length ? (
                            <div className="text-xs text-slate-400 mt-1">
                              {s.matchReasons.join(' · ')}
                            </div>
                          ) : null}
                        </div>
                        <Button
                          size="small"
                          type={isPicked ? 'primary' : 'default'}
                          onClick={() => pickSuggestion(s)}
                        >
                          {isPicked ? 'Tanlandi' : 'Tanlash'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {target ? (
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <div>
                <Tag color="blue">USER</Tag> {target.email}
              </div>
              <div>
                Filial:{' '}
                {target.organizations?.map((o) => o.name).join(', ') || '—'}
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <Card>
        <Space wrap className="w-full">
          <Select
            style={{ minWidth: 280 }}
            value={permissionMerge}
            onChange={setPermissionMerge}
            options={permissionOptions.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
          <Button
            icon={<Eye size={16} />}
            loading={loading}
            disabled={!sourceId || !targetId}
            onClick={() => void runPreview()}
          >
            Ko‘rib chiqish
          </Button>
          <Button
            type="primary"
            danger
            icon={<Play size={16} />}
            loading={loading}
            disabled={!sourceId || !targetId}
            onClick={() => setConfirmOpen(true)}
          >
            Migratsiya qilish
          </Button>
        </Space>

        {source && target ? (
          <p className="mt-4 text-sm text-slate-500">
            {source.lastName} {source.firstName} ({source.email}) →{' '}
            {target.lastName} {target.firstName} ({target.email})
          </p>
        ) : null}
      </Card>

      {preview ? (
        <Card title={preview.dryRun ? 'Ko‘rib chiqish natijasi' : 'Migratsiya natijasi'}>
          {preview.merged ? (
            <Alert
              type="success"
              className="mb-4"
              message="Bajarildi"
              description={`Eski hisob o‘chirildi. Xodim endi Energo ID orqali moderator sifatida kiradi.`}
            />
          ) : null}
          {preview.conflicts.length > 0 ? (
            <Alert
              type="warning"
              className="mb-4"
              message="Konfliktlar (avtomatik hal qilinadi)"
              description={
                <ul className="list-disc pl-4">
                  {preview.conflicts.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              }
            />
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Reja</h3>
              <ul className="text-sm list-disc pl-4 space-y-1">
                {preview.plannedActions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Eski moderator yozuvlari</h3>
              <ul className="text-sm space-y-1">
                {preview.sourceRowCounts
                  .filter((r) => r.count > 0)
                  .map((r) => (
                    <li key={r.table}>
                      {r.table}: <strong>{r.count}</strong>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      <Modal
        open={confirmOpen}
        title="Migratsiyani tasdiqlash"
        okText="Ha, birlashtirish"
        cancelText="Bekor"
        okButtonProps={{ danger: true, loading }}
        onCancel={() => setConfirmOpen(false)}
        onOk={() => void runMerge()}
      >
        <p>
          <strong>{source?.email}</strong> moderator hisobi o‘chiriladi. Barcha
          ma’lumotlar <strong>{target?.email}</strong> xodimiga yoziladi. Bu
          amalni qaytarib bo‘lmaydi.
        </p>
      </Modal>
    </div>
  );
};

export default ModeratorMigrationPage;
