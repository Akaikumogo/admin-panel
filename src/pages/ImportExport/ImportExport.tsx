import { useEffect, useState } from 'react';
import { Button, Card, Checkbox, Input, Modal, Tag, Upload, message } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { Download, UploadCloud, Layers, Shield, FileJson, KeyRound, Copy, Check } from 'lucide-react';
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

type OAuthIntegrationView = {
  mobileRedirectUri: string;
  webRedirectUri: string;
  callbackPath: string;
  scopes: string;
  templates: {
    authorizeUrl: string;
    callbackMobile: string;
    callbackWeb: string;
  };
  endpoints: {
    authorizeUrl: string;
    exchange: string;
  };
  energoIdHealth: { configured: boolean; reachable: boolean };
  deployChecklist: {
    message: string;
    requiredRedirectUrls: string[];
  };
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

  const [oauthData, setOAuthData] = useState<OAuthIntegrationView | null>(null);
  const [oauthLoading, setOAuthLoading] = useState(true);
  const [oauthSaving, setOAuthSaving] = useState(false);
  const [oauthExporting, setOAuthExporting] = useState(false);
  const [mobileRedirectUri, setMobileRedirectUri] = useState('');
  const [webRedirectUri, setWebRedirectUri] = useState('');
  const [oauthScopes, setOAuthScopes] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin()) {
      navigate('/dashboard/home');
      return;
    }
    void loadOAuthIntegration();
  }, [navigate]);

  const loadOAuthIntegration = async () => {
    try {
      setOAuthLoading(true);
      const data = await apiService.getOAuthIntegration();
      setOAuthData(data);
      setMobileRedirectUri(data.mobileRedirectUri);
      setWebRedirectUri(data.webRedirectUri);
      setOAuthScopes(data.scopes);
    } catch {
      message.error('OAuth sozlamalarini yuklab bo‘lmadi');
    } finally {
      setOAuthLoading(false);
    }
  };

  const copyTemplate = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    message.success('Nusxalandi');
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const saveOAuthIntegration = async () => {
    try {
      setOAuthSaving(true);
      const data = await apiService.updateOAuthIntegration({
        mobileRedirectUri,
        webRedirectUri,
        oauthScopes,
      });
      setOAuthData(data);
      message.success('OAuth sozlamalari saqlandi');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Saqlash xatosi';
      message.error(msg);
    } finally {
      setOAuthSaving(false);
    }
  };

  const exportOAuthEnv = async () => {
    try {
      setOAuthExporting(true);
      await apiService.exportOAuthEnvBundle();
      message.success('.env namunasi yuklab olindi');
    } catch {
      message.error('Export xatosi');
    } finally {
      setOAuthExporting(false);
    }
  };

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

      <Card
        title={
          <span className="flex items-center gap-2">
            <KeyRound size={18} />
            Energo ID OAuth
          </span>
        }
        className="!border-slate-200 dark:!border-slate-700/60"
        loading={oauthLoading}
      >
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Redirect URI va scope DB da saqlanadi. Mobil/web ilovalar authorize-url
          orqali shu URI larni oladi. Energo ID platformasida ham xuddi shu URL lar
          ro‘yxatga qo‘shilganini tekshiring.
        </p>

        {oauthData?.deployChecklist ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-900 dark:text-blue-200 mb-4">
            <strong>Deploy checklist:</strong> {oauthData.deployChecklist.message}
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {oauthData.deployChecklist.requiredRedirectUrls.map((url) => (
                <li key={url} className="font-mono text-xs break-all">
                  {url}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div>
            <label className="block text-sm mb-1">Mobile redirect URI</label>
            <Input
              value={mobileRedirectUri}
              onChange={(e) => setMobileRedirectUri(e.target.value)}
              placeholder="uz.elektroxavfsizlik.app://oauth/callback"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Web redirect URI</label>
            <Input
              value={webRedirectUri}
              onChange={(e) => setWebRedirectUri(e.target.value)}
              placeholder="https://.../oauth/callback"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">OAuth scope</label>
            <Input
              value={oauthScopes}
              onChange={(e) => setOAuthScopes(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Callback path (readonly)</label>
            <Input value={oauthData?.callbackPath ?? '/oauth/callback'} disabled />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button type="primary" loading={oauthSaving} onClick={saveOAuthIntegration}>
            Saqlash
          </Button>
          <Button
            icon={<Download size={16} />}
            loading={oauthExporting}
            onClick={exportOAuthEnv}
          >
            .env export (secretsiz)
          </Button>
          <Tag color={oauthData?.energoIdHealth.configured ? 'green' : 'default'}>
            {oauthData?.energoIdHealth.configured ? 'Energo ID sozlangan' : 'Sozlanmagan'}
          </Tag>
          <Tag color={oauthData?.energoIdHealth.reachable ? 'green' : 'orange'}>
            {oauthData?.energoIdHealth.reachable ? 'Ulanish OK' : 'Ulanish yo‘q'}
          </Tag>
        </div>

        {oauthData?.templates ? (
          <div className="space-y-3">
            {[
              ['authorize', 'Authorize URL', oauthData.templates.authorizeUrl],
              ['callbackMobile', 'Callback (mobile)', oauthData.templates.callbackMobile],
              ['callbackWeb', 'Callback (web)', oauthData.templates.callbackWeb],
            ].map(([key, label, value]) => (
              <div key={key} className="rounded border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium">{label}</span>
                  <Button
                    size="small"
                    icon={
                      copiedKey === key ? <Check size={14} /> : <Copy size={14} />
                    }
                    onClick={() => void copyTemplate(key, value)}
                  >
                    {copiedKey === key ? 'Nusxalandi' : 'Nusxalash'}
                  </Button>
                </div>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                  {value}
                </pre>
              </div>
            ))}
            <p className="text-xs text-slate-500">
              Exchange: <code>POST {oauthData.endpoints.exchange}</code> — mobil
              callback dan keyin <code>code</code> yuboriladi.
            </p>
          </div>
        ) : null}
      </Card>

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
