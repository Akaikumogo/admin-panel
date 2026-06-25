import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { ArrowRightLeft, Eye, Play, RefreshCw } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import apiService, {
  type LegacyModeratorMergePreview,
  type UserProfile,
} from '@/services/api';
import { isSuperAdmin } from '@/utils/isSuperAdmin';

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

  const { data: employees, loading: employeesLoading } = useFetch(
    ['employees-for-migration'],
    async () => {
      const res = await apiService.getUsers({ role: 'USER', limit: 500 });
      return res.data.filter((u) => u.energoId);
    },
    [] as UserProfile[],
  );

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
            placeholder="Xodim qidirish..."
            loading={employeesLoading}
            value={targetId}
            onChange={setTargetId}
            optionFilterProp="label"
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.lastName} ${e.firstName} (${e.email})`,
            }))}
          />
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
