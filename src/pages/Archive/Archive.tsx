import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  ArrowDownToLine,
  BookOpen,
  Calendar,
  CheckCircle2,
  Database,
  GraduationCap,
  Hash,
  HelpCircle,
  Layers,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Spin,
  Tag,
  message
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import { cn } from '@/lib/utils';

const nf = new Intl.NumberFormat('uz-UZ');

type ArchiveCard = {
  key: string;
  title: { uz: string; en: string; ru: string };
  description: { uz: string; en: string; ru: string };
  icon: typeof GraduationCap;
  path?: string;
  count: number;
  comingSoon?: boolean;
};

export default function ArchivePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [cutoverOpen, setCutoverOpen] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [cutoverLoading, setCutoverLoading] = useState(false);
  const [cutoverDone, setCutoverDone] = useState<{
    archiveId: string;
    checksum: string;
  } | null>(null);

  const [previewData, setPreviewData] = useState<{
    toArchive: {
      testUsers: number;
      examAttempts: number;
      certificates: number;
      progressRows: number;
    };
    preservedContent: {
      levels: number;
      theories: number;
      questions: number;
      examQuestions: number;
      admins: number;
    };
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [archivesList, setArchivesList] = useState<
    Array<{
      archiveId: string;
      createdAt: string;
      checksumSha256: string;
      tableCounts: Record<string, number>;
      status: string;
    }>
  >([]);
  const [archivesLoading, setArchivesLoading] = useState(false);

  const fetchArchives = async () => {
    setArchivesLoading(true);
    try {
      const data = await apiService.getElektroArchiveList();
      setArchivesList(data);
    } catch {
      // ignore
    } finally {
      setArchivesLoading(false);
    }
  };

  useEffect(() => {
    fetchArchives();
  }, []);

  const openCutoverModal = async () => {
    setCutoverOpen(true);
    setCutoverDone(null);
    setConfirmCode('');
    setPreviewLoading(true);
    try {
      const preview = await apiService.getElektroCutoverPreview();
      setPreviewData(preview);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Preview yuklab bo‘lmadi');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteCutover = async () => {
    if (confirmCode !== 'CONFIRM-CUTOVER') {
      message.error(
        'Tasdiqlash kodi noto‘g‘ri. "CONFIRM-CUTOVER" deb kiriting.'
      );
      return;
    }
    setCutoverLoading(true);
    try {
      const res = await apiService.executeElektroCutover('CONFIRM-CUTOVER');
      setCutoverDone({
        archiveId: res.archiveId,
        checksum: res.checksumSha256
      });
      message.success(
        'ElektroLearn test maʼlumotlari SQLite ga muvaffaqiyatli arxivlandi!'
      );
      fetchArchives();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Cutover xatolik bilan tugadi'
      );
    } finally {
      setCutoverLoading(false);
    }
  };

  const { data: summary, loading } = useFetch(
    ['archive-summary'],
    () => apiService.getArchiveSummary(),
    { employees: 0, questions: 0, modules: 0, theories: 0 }
  );

  const cards: ArchiveCard[] = [
    {
      key: 'employees',
      title: { uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' },
      description: {
        uz: 'Energo ID syncdan chiqarilgan / bo‘shagan xodimlar',
        en: 'Employees removed from Energo ID sync',
        ru: 'Сотрудники, исключённые из синхронизации'
      },
      icon: GraduationCap,
      path: '/dashboard/archive/employees',
      count: summary.employees
    },
    {
      key: 'questions',
      title: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' },
      description: {
        uz: 'Arxivlangan o‘quv savollari',
        en: 'Archived learning questions',
        ru: 'Архивные вопросы'
      },
      icon: HelpCircle,
      count: summary.questions,
      comingSoon: true
    },
    {
      key: 'modules',
      title: { uz: 'Modullar', en: 'Modules', ru: 'Модули' },
      description: {
        uz: 'Arxivlangan o‘quv modullari',
        en: 'Archived learning modules',
        ru: 'Архивные модули'
      },
      icon: Layers,
      count: summary.modules,
      comingSoon: true
    },
    {
      key: 'theories',
      title: { uz: 'Nazariyalar', en: 'Theories', ru: 'Теории' },
      description: {
        uz: 'Arxivlangan nazariy materiallar',
        en: 'Archived theory materials',
        ru: 'Архивные теории'
      },
      icon: BookOpen,
      count: summary.theories,
      comingSoon: true
    }
  ];

  return (
    <div className="space-y-6 overflow-y-auto p-6 h-[calc(100vh-100px)]">
      <PageHeader
        title={t({ uz: 'Arxiv', en: 'Archive', ru: 'Архив' })}
        description={t({
          uz: 'Asosiy ro‘yxatlardan chiqarilgan ma’lumotlar va SQLite arxivlari shu yerda saqlanadi',
          en: 'Items removed from main lists and SQLite archives are kept here',
          ru: 'Удалённые из основных списков данные и архивы SQLite хранятся здесь'
        })}
        icon={Archive}
        actions={
          <Button variant="destructive" onClick={openCutoverModal}>
            <ShieldAlert className="h-4 w-4 mr-1.5" />
            Prod Cutover & Arxivlash
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              const clickable = Boolean(card.path) && !card.comingSoon;
              return (
                <button
                  key={card.key}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (card.path && !card.comingSoon) navigate(card.path);
                  }}
                  className={cn(
                    'rounded-xl border border-border bg-card p-5 text-left transition-colors',
                    clickable &&
                      'cursor-pointer hover:border-primary/40 hover:bg-primary/[0.04]',
                    !clickable && 'cursor-default opacity-80'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon size={20} />
                    </div>
                    {card.comingSoon ? (
                      <Tag>Tez orada</Tag>
                    ) : (
                      <span className="text-2xl font-semibold tabular-nums text-foreground">
                        {nf.format(card.count)}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 text-base font-semibold text-foreground">
                    {t(card.title)}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(card.description)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* SQLite Immutable Arxivlar bo'limi */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  SQLite Zaxira Arxivlari (Immutable Backups)
                </h2>
                <p className="text-xs text-muted-foreground">
                  PostgreSQL tozalanishidan oldin yaratilgan to‘liq mustaqil
                  SQLite fayllar
                </p>
              </div>
            </div>

            {archivesLoading ? (
              <div className="flex justify-center p-8 text-xs text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Arxivlar yuklanmoqda…
              </div>
            ) : archivesList.length === 0 ? (
              <Card className="border-dashed p-6 text-center text-xs text-muted-foreground">
                Hozircha SQLite zaxira arxivi mavjud emas. Prod cutover amali
                bajarilganda bu yerda paydo bo‘ladi.
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {archivesList.map((a) => (
                  <Card key={a.archiveId} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-mono text-xs font-semibold text-foreground truncate">
                        {a.archiveId}
                      </div>
                      <Tag
                        variant="outline"
                        className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 border-emerald-200"
                      >
                        {a.status}
                      </Tag>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{new Date(a.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-mono text-[11px] truncate">
                          {a.checksumSha256?.slice(0, 20)}…
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] pt-2 border-t border-border text-foreground">
                      <div>
                        Xodimlar: <b>{a.tableCounts?.users_test_role ?? 0}</b>
                      </div>
                      <div>
                        Imtihonlar: <b>{a.tableCounts?.exam_attempts ?? 0}</b>
                      </div>
                      <div>
                        Sertifikatlar: <b>{a.tableCounts?.certificates ?? 0}</b>
                      </div>
                      <div>
                        Progress: <b>{a.tableCounts?.user_progress ?? 0}</b>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-1"
                      onClick={() =>
                        apiService.downloadElektroArchive(a.archiveId)
                      }
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
                      Yuklab olish (.sqlite)
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prod Cutover Modali */}
      <Dialog
        open={cutoverOpen}
        onOpenChange={cutoverLoading ? () => {} : setCutoverOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Production Cutover (ElektroLearn)
            </DialogTitle>
          </DialogHeader>

          {cutoverDone ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Cutover Muvaffaqiyatli Bajarildi!
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Test o‘quvchilar va ularning natijalari SQLite arxiviga
                o‘tkazildi. O‘quv kontenti (darslar, savollar, modullar) to‘liq
                saqlandi.
              </p>
              <div className="p-3 rounded-lg border bg-muted/30 text-left font-mono text-xs space-y-1">
                <div>
                  Arxiv ID:{' '}
                  <span className="font-semibold">{cutoverDone.archiveId}</span>
                </div>
                <div className="truncate">SHA-256: {cutoverDone.checksum}</div>
              </div>
              <Button onClick={() => setCutoverOpen(false)} className="w-full">
                Tushunarli
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 leading-relaxed">
                ⚠️ <strong>Diqqat:</strong> Ushbu amal test davri natijalarini
                tozalab, bazani haqiqiy production holatiga keltiradi. O‘quv
                kontentlari (savollar, teoriyalar, modullar){' '}
                <strong>mutlaqo o‘chirilmaydi</strong>.
              </div>

              {previewLoading ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Maʼlumotlar tahlil qilinmoqda…
                </div>
              ) : previewData ? (
                <div className="space-y-3">
                  <div className="rounded-lg border p-3 bg-muted/20 space-y-1.5 text-xs">
                    <div className="font-medium text-destructive uppercase tracking-wider text-[11px]">
                      Arxivlanadigan va o‘chiriladigan maʼlumotlar:
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        Test xodimlar:{' '}
                        <b>{previewData.toArchive.testUsers} ta</b>
                      </div>
                      <div>
                        Imtihon topshirishlar:{' '}
                        <b>{previewData.toArchive.examAttempts} ta</b>
                      </div>
                      <div>
                        Test sertifikatlar:{' '}
                        <b>{previewData.toArchive.certificates} ta</b>
                      </div>
                      <div>
                        Progress yozuvlari:{' '}
                        <b>{previewData.toArchive.progressRows} ta</b>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3 bg-emerald-50/50 border-emerald-200 space-y-1.5 text-xs">
                    <div className="font-medium text-emerald-800 uppercase tracking-wider text-[11px]">
                      Saqlanadigan o‘quv kontentlari:
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-emerald-950">
                      <div>
                        Bosqichlar (levels):{' '}
                        <b>{previewData.preservedContent.levels} ta</b>
                      </div>
                      <div>
                        Teoriyalar:{' '}
                        <b>{previewData.preservedContent.theories} ta</b>
                      </div>
                      <div>
                        O‘quv savollari:{' '}
                        <b>{previewData.preservedContent.questions} ta</b>
                      </div>
                      <div>
                        Imtihon savollari:{' '}
                        <b>{previewData.preservedContent.examQuestions} ta</b>
                      </div>
                      <div>
                        Admin va moderatorlar:{' '}
                        <b>{previewData.preservedContent.admins} ta</b>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-2.5 bg-muted/30 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Energo ID Server Holati:</span>
                    {previewData.energoIdStatus?.reachable ? (
                      <span className="font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                        ALOQA MAVJUD
                      </span>
                    ) : (
                      <span className="font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                        JAVOB BERMADI
                      </span>
                    )}
                  </div>

                  {previewData.energoIdStatus && !previewData.energoIdStatus.reachable && (
                    <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Energo ID serveriga ulanib bo‘lmadi!</strong>{' '}
                        Cutover amalga oshirilgandan so‘ng yangi xodimlarni Energo ID dan
                        yuklab olish uchun Energo ID ishlab turishi shart.
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-medium text-foreground">
                  Tasdiqlash uchun{' '}
                  <span className="font-mono text-destructive font-bold">
                    CONFIRM-CUTOVER
                  </span>{' '}
                  deb yozing:
                </label>
                <Input
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  placeholder="CONFIRM-CUTOVER"
                  disabled={cutoverLoading}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setCutoverOpen(false)}
                  disabled={cutoverLoading}
                >
                  Bekor qilish
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmCode !== 'CONFIRM-CUTOVER' || cutoverLoading}
                  onClick={handleExecuteCutover}
                >
                  {cutoverLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Arxivlanmoqda…
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-1.5" />
                      Arxivga Olish & Cutover
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
