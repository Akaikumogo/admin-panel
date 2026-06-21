import { useEffect, useState } from 'react';
import { Button, Card, Checkbox, Modal, Tag, Upload, message } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { Download, UploadCloud, Layers, Shield, FileJson } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '@/services/api';
import { isSuperAdmin } from '@/utils/isSuperAdmin';

type ContentImportResult = {
  success: boolean;
  levels: { created: number; updated: number };
  theories: { created: number; updated: number };
  questions: { created: number; updated: number };
  options: { created: number; updated: number };
  errors: string[];
};

type ModeratorsImportResult = {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export default function ImportExportPage() {
  const navigate = useNavigate();

  const [contentFile, setContentFile] = useState<File | null>(null);
  const [moderatorsFile, setModeratorsFile] = useState<File | null>(null);
  const [contentReplace, setContentReplace] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [moderatorsLoading, setModeratorsLoading] = useState(false);
  const [exportingContent, setExportingContent] = useState(false);
  const [exportingModerators, setExportingModerators] = useState(false);
  const [contentConfirmOpen, setContentConfirmOpen] = useState(false);
  const [moderatorsConfirmOpen, setModeratorsConfirmOpen] = useState(false);
  const [lastContentResult, setLastContentResult] =
    useState<ContentImportResult | null>(null);
  const [lastModeratorsResult, setLastModeratorsResult] =
    useState<ModeratorsImportResult | null>(null);

  useEffect(() => {
    if (!isSuperAdmin()) {
      navigate('/dashboard/home');
    }
  }, [navigate]);

  const handleExportContent = async () => {
    try {
      setExportingContent(true);
      await apiService.exportContentBundle();
      message.success('Kontent export yuklab olindi');
    } catch {
      message.error('Kontent export xatosi');
    } finally {
      setExportingContent(false);
    }
  };

  const handleExportModerators = async () => {
    try {
      setExportingModerators(true);
      await apiService.exportModeratorsBundle();
      message.success('Moderatorlar export yuklab olindi');
    } catch {
      message.error('Moderatorlar export xatosi');
    } finally {
      setExportingModerators(false);
    }
  };

  const runContentImport = async () => {
    if (!contentFile) {
      message.warning('Avval JSON fayl tanlang');
      return;
    }
    try {
      setContentLoading(true);
      const res = await apiService.importContentBundle(
        contentFile,
        contentReplace,
      );
      setLastContentResult(res);
      message.success(
        `Import: ${res.levels.created + res.levels.updated} modul, ${res.theories.created + res.theories.updated} nazariya, ${res.questions.created + res.questions.updated} savol`,
      );
      setContentFile(null);
      setContentConfirmOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Kontent import xatosi';
      message.error(msg);
    } finally {
      setContentLoading(false);
    }
  };

  const runModeratorsImport = async () => {
    if (!moderatorsFile) {
      message.warning('Avval JSON fayl tanlang');
      return;
    }
    try {
      setModeratorsLoading(true);
      const res = await apiService.importModeratorsBundle(moderatorsFile);
      setLastModeratorsResult(res);
      message.success(
        `Import: ${res.created} yangi, ${res.updated} yangilandi`,
      );
      setModeratorsFile(null);
      setModeratorsConfirmOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Moderatorlar import xatosi';
      message.error(msg);
    } finally {
      setModeratorsLoading(false);
    }
  };

  if (!isSuperAdmin()) return null;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
        Faqat SuperAdmin. Export qilgan JSON faylni o‘sha formatda import qiling.
        Modullarda barcha bog‘lanishlar (level → nazariya → savol → variant) saqlanadi.
        Moderatorlarda filial (organization) yuklanmaydi.
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title={
            <span className="flex items-center gap-2">
              <Layers size={18} />
              Modullar (kontent)
            </span>
          }
          className="!border-slate-200 dark:!border-slate-700/60"
        >
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Levels, nazariyalar (parent bilan), savollar va javob variantlari —
            bitta JSON fayl.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              icon={<Download size={16} />}
              loading={exportingContent}
              onClick={handleExportContent}
            >
              Export JSON
            </Button>
          </div>

          <Upload
            accept=".json,application/json"
            maxCount={1}
            beforeUpload={(file) => {
              setContentFile(file);
              return false;
            }}
            onRemove={() => setContentFile(null)}
            fileList={
              contentFile
                ? ([
                    {
                      uid: '-1',
                      name: contentFile.name,
                      status: 'done',
                    },
                  ] as UploadFile[])
                : []
            }
          >
            <Button icon={<FileJson size={16} />}>JSON fayl tanlash</Button>
          </Upload>

          <div className="mt-4">
            <Checkbox
              checked={contentReplace}
              onChange={(e) => setContentReplace(e.target.checked)}
            >
              Avval mavjud kontentni to‘liq o‘chirish (replace)
            </Checkbox>
          </div>

          <Button
            type="primary"
            className="mt-4"
            icon={<UploadCloud size={16} />}
            disabled={!contentFile}
            loading={contentLoading}
            onClick={() => setContentConfirmOpen(true)}
          >
            Import
          </Button>

          {lastContentResult ? (
            <div className="mt-4 space-y-1 text-sm">
              <Tag color="blue">
                Modullar: +{lastContentResult.levels.created} / ~
                {lastContentResult.levels.updated}
              </Tag>
              <Tag color="green">
                Nazariyalar: +{lastContentResult.theories.created} / ~
                {lastContentResult.theories.updated}
              </Tag>
              <Tag color="purple">
                Savollar: +{lastContentResult.questions.created} / ~
                {lastContentResult.questions.updated}
              </Tag>
              <Tag>
                Variantlar: {lastContentResult.options.created}
              </Tag>
            </div>
          ) : null}
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <Shield size={18} />
              Moderatorlar
            </span>
          }
          className="!border-slate-200 dark:!border-slate-700/60"
        >
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Email, ism, parol va ruxsatlar. Tashkilot (filial) import qilinmaydi —
            keyin qo‘lda biriktirasiz.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              icon={<Download size={16} />}
              loading={exportingModerators}
              onClick={handleExportModerators}
            >
              Export JSON
            </Button>
          </div>

          <Upload
            accept=".json,application/json"
            maxCount={1}
            beforeUpload={(file) => {
              setModeratorsFile(file);
              return false;
            }}
            onRemove={() => setModeratorsFile(null)}
            fileList={
              moderatorsFile
                ? ([
                    {
                      uid: '-2',
                      name: moderatorsFile.name,
                      status: 'done',
                    },
                  ] as UploadFile[])
                : []
            }
          >
            <Button icon={<FileJson size={16} />}>JSON fayl tanlash</Button>
          </Upload>

          <Button
            type="primary"
            className="mt-4"
            icon={<UploadCloud size={16} />}
            disabled={!moderatorsFile}
            loading={moderatorsLoading}
            onClick={() => setModeratorsConfirmOpen(true)}
          >
            Import
          </Button>

          {lastModeratorsResult ? (
            <div className="mt-4 space-y-1 text-sm">
              <Tag color="green">Yangi: {lastModeratorsResult.created}</Tag>
              <Tag color="blue">Yangilandi: {lastModeratorsResult.updated}</Tag>
              <Tag>O‘tkazildi: {lastModeratorsResult.skipped}</Tag>
            </div>
          ) : null}
        </Card>
      </div>

      <Modal
        open={contentConfirmOpen}
        title="Kontent import"
        okText="Import qilish"
        cancelText="Bekor"
        confirmLoading={contentLoading}
        onOk={runContentImport}
        onCancel={() => setContentConfirmOpen(false)}
      >
        <p>
          <strong>{contentFile?.name}</strong> fayli bazaga yuklanadi.
        </p>
        {contentReplace ? (
          <p className="text-red-600 dark:text-red-400 mt-2">
            Diqqat: mavjud barcha modul/nazariya/savollar o‘chiriladi!
          </p>
        ) : null}
      </Modal>

      <Modal
        open={moderatorsConfirmOpen}
        title="Moderatorlar import"
        okText="Import qilish"
        cancelText="Bekor"
        confirmLoading={moderatorsLoading}
        onOk={runModeratorsImport}
        onCancel={() => setModeratorsConfirmOpen(false)}
      >
        <p>
          <strong>{moderatorsFile?.name}</strong> — email bo‘yicha yangi yaratiladi
          yoki yangilanadi. Filial biriktirilmaydi.
        </p>
      </Modal>
    </div>
  );
}
