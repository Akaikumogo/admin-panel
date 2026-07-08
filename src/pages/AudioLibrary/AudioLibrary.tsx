import { useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Switch,
  Tag,
  Typography,
  message
} from '@/components/ui';
import { Plus, Trash2, Pencil, RefreshCcw, Headphones, Music2 } from 'lucide-react';
import apiService, { BACKEND_ORIGIN, type AdminAudioBookRow } from '@/services/api';
import { usePaginatedFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import { can } from '@/utils/can';
import MediaUploader from '@/components/MediaUploader';
import WaveformBars from '@/components/WaveformBars';

function AudioField({
  value,
  onChange,
}: {
  value?: string | null;
  onChange?: (v: string) => void;
}) {
  return (
    <MediaUploader
      kind="audio"
      value={value ?? ''}
      onChange={(v) => onChange?.(v)}
    />
  );
}

function CoverImageField({
  value,
  onChange,
}: {
  value?: string | null;
  onChange?: (v: string) => void;
}) {
  return (
    <MediaUploader
      kind="image"
      value={value ?? ''}
      onChange={(v) => onChange?.(v)}
    />
  );
}

function resolveUrl(url: string | null | undefined) {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${BACKEND_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function AudioLibraryPage() {
  const { t } = useTranslation();
  const {
    data: books,
    loading,
    initialLoading,
    refetch,
  } = usePaginatedFetch(['admin-audio-books'], async () => {
    const rows = await apiService.adminListAudioBooks();
    return { data: rows, total: rows.length, page: 1, limit: rows.length };
  });

  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookModalMode, setBookModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookForm] = Form.useForm();

  const openCreate = () => {
    setBookModalMode('create');
    setEditingId(null);
    bookForm.resetFields();
    bookForm.setFieldsValue({ isActive: true });
    setBookModalOpen(true);
  };

  const openEdit = (row: AdminAudioBookRow) => {
    setBookModalMode('edit');
    setEditingId(row.id);
    bookForm.setFieldsValue({
      title: row.title,
      description: row.description,
      coverUrl: row.coverUrl,
      audioUrl: row.audioUrl,
      isActive: row.isActive,
    });
    setBookModalOpen(true);
  };

  const bookList = (books ?? []) as AdminAudioBookRow[];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography.Title level={3} className="!mb-0">
            {t({ uz: 'Audio kutubxona', en: 'Audio library', ru: 'Аудиотека' })}
          </Typography.Title>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t({
              uz: "Har bir kitobga to'g'ridan-to'g'ri audio fayl yuklang.",
              en: 'Upload audio file directly to each book.',
              ru: 'Загружайте аудиофайл напрямую в книгу.',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            icon={<RefreshCcw size={16} />}
            onClick={() => void refetch()}
          >
            {t({ uz: 'Yangilash', en: 'Refresh', ru: 'Обновить' })}
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            disabled={!can('audioLibrary', 'create')}
            onClick={openCreate}
          >
            {t({ uz: "Kitob qo'shish", en: "Add book", ru: "Добавить" })}
          </Button>
        </div>
      </div>

      {/* Book cards grid */}
      {initialLoading || loading ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 py-4">
          {t({ uz: 'Yuklanyapti...', en: 'Loading...', ru: 'Загрузка...' })}
        </div>
      ) : bookList.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121314]/80 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {t({
            uz: 'Hozircha kitob yo\'q. "Kitob qo\'shish" bosing.',
            en: 'No books yet. Click "Add book".',
            ru: 'Книг пока нет.',
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bookList.map((book) => (
            <div
              key={book.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#121314]/80 overflow-hidden"
            >
              {/* Cover */}
              {book.coverUrl ? (
                <img
                  src={resolveUrl(book.coverUrl)}
                  alt={book.title}
                  className="w-full h-36 object-cover"
                />
              ) : (
                <div className="w-full h-36 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-[#2a2108] dark:to-[#1a1500] flex items-center justify-center">
                  <Headphones className="h-12 w-12 text-amber-400 dark:text-amber-600" />
                </div>
              )}

              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                      {book.title}
                    </div>
                    {book.description ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {book.description}
                      </div>
                    ) : null}
                  </div>
                  {book.isActive ? (
                    <Tag color="green" className="shrink-0">ACTIVE</Tag>
                  ) : (
                    <Tag color="default" className="shrink-0">HIDDEN</Tag>
                  )}
                </div>

                {/* Audio indicator */}
                {book.audioUrl ? (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-[#2a2108]/60 px-3 py-2 border border-amber-100 dark:border-amber-600/20">
                    <Music2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <WaveformBars isPlaying={false} color="#d97706" barCount={5} />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300 truncate min-w-0 flex-1">
                      Audio yuklangan
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 px-3 py-2 border border-slate-200 dark:border-slate-700/50">
                    <Music2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-400">Audio yuklanmagan</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="small"
                    icon={<Pencil size={14} />}
                    disabled={!can('audioLibrary', 'update')}
                    onClick={() => openEdit(book)}
                    className="flex-1"
                  >
                    {t({ uz: 'Tahrirlash', en: 'Edit', ru: 'Изменить' })}
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<Trash2 size={14} />}
                    disabled={!can('audioLibrary', 'delete')}
                    onClick={() => {
                      Modal.confirm({
                        title: t({
                          uz: "Kitobni o'chirish",
                          en: 'Delete book',
                          ru: 'Удалить книгу',
                        }),
                        content: t({
                          uz: "Kitob va uning audio fayli butunlay o'chiriladi. Davom etamizmi?",
                          en: 'Book and its audio file will be permanently deleted. Continue?',
                          ru: 'Книга и аудиофайл будут удалены навсегда. Продолжить?',
                        }),
                        okButtonProps: { danger: true },
                        onOk: async () => {
                          await apiService.adminDeleteAudioBook(book.id);
                          await refetch();
                          message.success(
                            t({ uz: "O'chirildi", en: 'Deleted', ru: 'Удалено' })
                          );
                        },
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Modal */}
      <Modal
        title={
          bookModalMode === 'create'
            ? t({ uz: "Kitob qo'shish", en: "Add book", ru: "Добавить книгу" })
            : t({ uz: "Kitobni tahrirlash", en: "Edit book", ru: "Изменить книгу" })
        }
        open={bookModalOpen}
        onCancel={() => setBookModalOpen(false)}
        onOk={() => bookForm.submit()}
        width={640}
        okButtonProps={{
          disabled:
            bookModalMode === 'create'
              ? !can('audioLibrary', 'create')
              : !can('audioLibrary', 'update'),
        }}
      >
        <Form
          form={bookForm}
          layout="vertical"
          onFinish={async (values) => {
            const payload = {
              title: values.title,
              description: values.description ?? null,
              coverUrl: values.coverUrl || null,
              audioUrl: values.audioUrl || null,
              isActive: values.isActive ?? true,
            };
            if (bookModalMode === 'create') {
              await apiService.adminCreateAudioBook(payload);
              message.success(
                t({ uz: 'Yaratildi', en: 'Created', ru: 'Создано' })
              );
            } else {
              if (!editingId) return;
              await apiService.adminUpdateAudioBook(editingId, payload);
              message.success(
                t({ uz: 'Saqlandi', en: 'Saved', ru: 'Сохранено' })
              );
            }
            setBookModalOpen(false);
            await refetch();
          }}
        >
          <Form.Item
            name="title"
            label={t({ uz: 'Sarlavha', en: 'Title', ru: 'Название' })}
            rules={[{ required: true, message: t({ uz: 'Majburiy', en: 'Required', ru: 'Обязательно' }) }]}
          >
            <Input maxLength={200} />
          </Form.Item>

          <Form.Item
            name="description"
            label={t({ uz: 'Tavsif', en: 'Description', ru: 'Описание' })}
          >
            <Input.TextArea rows={3} maxLength={4000} />
          </Form.Item>

          <Form.Item
            name="audioUrl"
            label={t({ uz: 'Audio fayl', en: 'Audio file', ru: 'Аудиофайл' })}
          >
            <AudioField />
          </Form.Item>

          <Form.Item
            name="coverUrl"
            label={t({ uz: 'Muqova rasm (ixtiyoriy)', en: 'Cover image (optional)', ru: 'Обложка (необязательно)' })}
          >
            <CoverImageField />
          </Form.Item>

          <Form.Item
            name="isActive"
            label={t({ uz: 'Active', en: 'Active', ru: 'Активно' })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
