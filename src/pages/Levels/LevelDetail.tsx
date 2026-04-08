import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Form, Input, InputNumber, Spin, Switch, message } from 'antd';
import { ArrowLeft, Pencil, Save, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService, { type Level, type Theory } from '@/services/api';
import { can } from '@/utils/can';

const T = {
  title: { uz: 'Modul', en: 'Module', ru: 'Модуль' },
  back: { uz: 'Orqaga', en: 'Back', ru: 'Назад' },
  levelName: { uz: 'Modul nomi', en: 'Module name', ru: 'Название модуля' },
  orderIndex: { uz: 'Tartib raqami', en: 'Order index', ru: 'Порядок' },
  active: { uz: 'Faol', en: 'Active', ru: 'Активный' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  theories: { uz: 'Nazariyalar', en: 'Theories', ru: 'Теории' },
  open: { uz: 'Ochish', en: 'Open', ru: 'Открыть' },
} as const;

export default function LevelDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();

  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const levelId = id || '';
  const {
    data: level,
    initialLoading: levelInitialLoading,
    refetch: refetchLevel,
  } = useFetch(
    ['level-by-id', levelId],
    async () => {
      if (!levelId) throw new Error('Missing id');
      const res = await apiService.getLevelById(levelId);
      return res;
    },
    null as unknown as Level,
  );

  useEffect(() => {
    if (!levelId) return;
    setEditMode(false);
  }, [levelId]);

  useEffect(() => {
    if (!level) return;
    form.setFieldsValue({
      title: level.title,
      orderIndex: level.orderIndex,
      isActive: level.isActive,
    });
  }, [level, form]);

  const {
    data: theories,
    initialLoading: theoriesInitialLoading,
  } = useFetch(
    ['theories-by-level', levelId],
    () => (levelId ? apiService.getTheoryTreeByLevel(levelId) : Promise.resolve([])),
    [] as Theory[],
  );

  const loading = levelInitialLoading || theoriesInitialLoading;

  const initials = useMemo(() => {
    const a = (level?.title || '').trim();
    return a ? a[0].toUpperCase() : 'M';
  }, [level?.title]);

  const handleSave = async () => {
    if (!levelId) return;
    if (!can('contentLevels', 'update')) return;
    if (!editMode) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      await apiService.updateLevel(levelId, {
        title: values.title,
        orderIndex: values.orderIndex,
        isActive: values.isActive,
      });
      message.success(t({ uz: 'Saqlandi', en: 'Saved', ru: 'Сохранено' }));
      refetchLevel();
      setEditMode(false);
    } catch {
      // validation / network
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (!level) return;
    form.setFieldsValue({
      title: level.title,
      orderIndex: level.orderIndex,
      isActive: level.isActive,
    });
    setEditMode(false);
  };

  if (!levelId) {
    return (
      <div className="p-6">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">ID topilmadi</span>
            <Button onClick={() => navigate(-1)}>{t(T.back)}</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          {t(T.back)}
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
            {t(T.title)} {level?.orderIndex !== undefined ? `#${level.orderIndex + 1}` : ''} — {level?.title || '...'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {level?.createdBy ? `${level.createdBy.firstName} ${level.createdBy.lastName}` : initials}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {editMode ? (
            <Button icon={<X size={16} />} onClick={cancelEdit}>
              {t({ uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' })}
            </Button>
          ) : (
            <Button
              icon={<Pencil size={16} />}
              onClick={() => setEditMode(true)}
              disabled={!can('contentLevels', 'update') || loading}
            >
              {t({ uz: 'Tahrirlash', en: 'Edit', ru: 'Редактировать' })}
            </Button>
          )}
          <Button
            type="primary"
            icon={<Save size={16} />}
            loading={saving}
            onClick={handleSave}
            disabled={!can('contentLevels', 'update') || !editMode}
          >
            {t(T.save)}
          </Button>
        </div>
      </div>

      <Card className="!border-slate-200 dark:!border-slate-700/60">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Spin />
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            initialValues={{ isActive: true }}
            disabled={!editMode}
          >
            <Form.Item name="title" label={t(T.levelName)} rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="orderIndex" label={t(T.orderIndex)} rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item name="isActive" label={t(T.active)} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        )}
      </Card>

      <Card
        title={<span className="font-semibold">{t(T.theories)}</span>}
        className="!border-slate-200 dark:!border-slate-700/60"
      >
        {theories.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t({ uz: 'Nazariya yo‘q', en: 'No theories', ru: 'Нет теорий' })}
          </p>
        ) : (
          <div className="space-y-2">
            {(() => {
              const renderNode = (th: Theory, depth: number) => (
                <div key={th.id}>
                  <div
                    className="flex items-center gap-3 rounded-lg border border-slate-200/70 dark:border-slate-700/60 px-3 py-2"
                    style={{ marginLeft: depth * 16 }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        #{th.orderIndex + 1} — {th.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {th.content || ''}
                      </p>
                    </div>
                    <Button onClick={() => navigate(`/dashboard/theories/${th.id}`)}>
                      {t(T.open)}
                    </Button>
                  </div>
                  {(th.children ?? [])
                    .slice()
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((c) => renderNode(c, depth + 1))}
                </div>
              );

              return theories
                .slice()
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((th) => renderNode(th, 0));
            })()}
          </div>
        )}
      </Card>
    </div>
  );
}

