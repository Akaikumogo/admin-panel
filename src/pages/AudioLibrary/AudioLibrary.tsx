import { useMemo, useState } from 'react';
import { Button, Collapse, Form, Input, InputNumber, Modal, Switch, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Plus, Trash2, Pencil, RefreshCcw, BookOpen, Music2 } from 'lucide-react';
import apiService, { BACKEND_ORIGIN } from '@/services/api';
import { usePaginatedFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import { can } from '@/utils/can';

type AdminAudioBookRow = {
  id: string;
  title: string;
  coverUrl: string | null;
  description: string | null;
  isActive: boolean;
  chaptersCount: number;
  createdAt: string;
  updatedAt: string;
};

type AdminAudioParagraph = {
  id: string;
  text: string;
  order: number;
  chapterId: string;
  audioUrl: string;
};

type AdminAudioChapter = {
  id: string;
  title: string;
  order: number;
  bookId: string;
  paragraphs: AdminAudioParagraph[];
};

type AdminAudioBookDetail = {
  id: string;
  title: string;
  coverUrl: string | null;
  description: string | null;
  isActive: boolean;
  chapters: AdminAudioChapter[];
};

export default function AudioLibraryPage() {
  const { t } = useTranslation();
  const {
    data: books,
    loading,
    initialLoading,
    refetch,
  } = usePaginatedFetch(['admin-audio-books'], async () => {
    // usePaginatedFetch expects {data,total,...} from apiService, but for this page we just need a simple list.
    // We'll wrap it into a compatible shape.
    const rows = await apiService.adminListAudioBooks();
    return { data: rows, total: rows.length, page: 1, limit: rows.length };
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<AdminAudioBookDetail | null>(null);

  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookModalMode, setBookModalMode] = useState<'create' | 'edit'>('create');
  const [bookForm] = Form.useForm();

  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [chapterForm] = Form.useForm();
  const [chapterBookId, setChapterBookId] = useState<string | null>(null);

  const [paragraphModalOpen, setParagraphModalOpen] = useState(false);
  const [paragraphForm] = Form.useForm();
  const [paragraphChapterId, setParagraphChapterId] = useState<string | null>(null);

  const openCreateBook = () => {
    setBookModalMode('create');
    bookForm.resetFields();
    bookForm.setFieldsValue({ isActive: true });
    setBookModalOpen(true);
  };

  const openEditBook = (row: AdminAudioBookRow) => {
    setBookModalMode('edit');
    setSelectedId(row.id);
    bookForm.setFieldsValue({
      title: row.title,
      description: row.description,
      coverUrl: row.coverUrl,
      isActive: row.isActive,
    });
    setBookModalOpen(true);
  };

  const loadDetail = async (bookId: string) => {
    setSelectedId(bookId);
    setDetailLoading(true);
    try {
      const d = await apiService.adminGetAudioBook(bookId);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ColumnsType<AdminAudioBookRow> = useMemo(
    () => [
      {
        title: t({ uz: 'Kitob', en: 'Book', ru: 'Книга' }),
        dataIndex: 'title',
        key: 'title',
        render: (_v, r) => (
          <button
            type="button"
            onClick={() => void loadDetail(r.id)}
            className="text-left w-full"
          >
            <div className="font-medium text-slate-900 dark:text-white truncate">
              {r.title}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {r.description || t({ uz: 'Tavsif yo‘q', en: 'No description', ru: 'Без описания' })}
            </div>
          </button>
        ),
      },
      {
        title: t({ uz: 'Holat', en: 'Status', ru: 'Статус' }),
        key: 'status',
        width: 110,
        render: (_v, r) => (
          r.isActive ? <Tag color="green">ACTIVE</Tag> : <Tag color="default">HIDDEN</Tag>
        ),
      },
      {
        title: t({ uz: 'Bob', en: 'Chapters', ru: 'Главы' }),
        key: 'chaptersCount',
        width: 90,
        align: 'center',
        render: (_v, r) => r.chaptersCount,
      },
      {
        title: t({ uz: 'Amallar', en: 'Actions', ru: 'Действия' }),
        key: 'actions',
        width: 200,
        render: (_v, r) => (
          <div className="flex gap-2">
            <Button
              size="small"
              icon={<Pencil size={14} />}
              disabled={!can('audioLibrary', 'update')}
              onClick={() => openEditBook(r)}
            >
              {t({ uz: 'Tahrir', en: 'Edit', ru: 'Изм.' })}
            </Button>
            <Button
              size="small"
              danger
              icon={<Trash2 size={14} />}
              disabled={!can('audioLibrary', 'delete')}
              onClick={() => {
                Modal.confirm({
                  title: t({ uz: 'O‘chirish', en: 'Delete', ru: 'Удалить' }),
                  content: t({
                    uz: 'Kitob yashiriladi (mobile’da chiqmaydi). Davom etamizmi?',
                    en: 'Book will be hidden from mobile. Continue?',
                    ru: 'Книга будет скрыта. Продолжить?',
                  }),
                  okButtonProps: { danger: true },
                  onOk: async () => {
                    await apiService.adminDeleteAudioBook(r.id);
                    if (selectedId === r.id) {
                      setSelectedId(null);
                      setDetail(null);
                    }
                    void refetch();
                    message.success(t({ uz: 'O‘chirildi', en: 'Deleted', ru: 'Удалено' }));
                  },
                });
              }}
            />
          </div>
        ),
      },
    ],
    [t, refetch, selectedId],
  );

  const selectedTitle = detail?.title || '';

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography.Title level={3} className="!mb-0">
            {t({ uz: 'Audio kutubxona', en: 'Audio library', ru: 'Аудиотека' })}
          </Typography.Title>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t({
              uz: 'Audio faqat paragrafga bog‘lanadi. Kitob/bob darajasida audio yo‘q.',
              en: 'Audio is attached only to paragraphs.',
              ru: 'Аудио прикрепляется только к параграфам.',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon={<RefreshCcw size={16} />} onClick={() => void refetch()}>
            {t({ uz: 'Yangilash', en: 'Refresh', ru: 'Обновить' })}
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            disabled={!can('audioLibrary', 'create')}
            onClick={openCreateBook}
          >
            {t({ uz: 'Kitob qo‘shish', en: 'Add book', ru: 'Добавить' })}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-[#121314]/80 dark:border-slate-700/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
            <BookOpen size={16} />
            <span className="font-semibold">{t({ uz: 'Kitoblar', en: 'Books', ru: 'Книги' })}</span>
          </div>
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={books as AdminAudioBookRow[]}
            loading={loading || initialLoading}
            pagination={false}
          />
          {!loading && (books?.length ?? 0) === 0 ? (
            <div className="p-4 text-sm text-slate-600 dark:text-slate-400">
              {t({ uz: 'Hozircha kitob yo‘q.', en: 'No books yet.', ru: 'Книг пока нет.' })}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-[#121314]/80 dark:border-slate-700/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Music2 size={16} />
              <span className="font-semibold truncate">
                {selectedId ? selectedTitle || t({ uz: 'Tanlangan kitob', en: 'Selected', ru: 'Выбрано' }) : t({ uz: 'Detail', en: 'Detail', ru: 'Детали' })}
              </span>
            </div>
            {selectedId ? (
              <Button
                size="small"
                icon={<Plus size={14} />}
                disabled={!can('audioLibrary', 'create')}
                onClick={() => {
                  setChapterBookId(selectedId);
                  chapterForm.resetFields();
                  chapterForm.setFieldsValue({ orderIndex: 0 });
                  setChapterModalOpen(true);
                }}
              >
                {t({ uz: 'Bob qo‘shish', en: 'Add chapter', ru: 'Глава +' })}
              </Button>
            ) : null}
          </div>

          <div className="p-4">
            {!selectedId ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {t({ uz: 'Chapdan kitob tanlang.', en: 'Select a book from the left.', ru: 'Выберите книгу слева.' })}
              </div>
            ) : detailLoading ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {t({ uz: 'Yuklanyapti...', en: 'Loading...', ru: 'Загрузка...' })}
              </div>
            ) : !detail ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {t({ uz: 'Topilmadi.', en: 'Not found.', ru: 'Не найдено.' })}
              </div>
            ) : detail.chapters.length === 0 ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {t({ uz: 'Bu kitobda boblar yo‘q. "Bob qo‘shish" bosing.', en: 'No chapters yet.', ru: 'Глав пока нет.' })}
              </div>
            ) : (
              <Collapse
                accordion
                items={detail.chapters
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((ch) => ({
                    key: ch.id,
                    label: (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{ch.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            order: {ch.order} | paragraphs: {ch.paragraphs.length}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="small"
                            icon={<Plus size={14} />}
                            disabled={!can('audioLibrary', 'create')}
                            onClick={(e) => {
                              e.stopPropagation();
                              setParagraphChapterId(ch.id);
                              paragraphForm.resetFields();
                              paragraphForm.setFieldsValue({ orderIndex: 0 });
                              setParagraphModalOpen(true);
                            }}
                          >
                            {t({ uz: 'Paragraf', en: 'Paragraph', ru: 'Параграф' })}
                          </Button>
                          <Button
                            size="small"
                            icon={<Pencil size={14} />}
                            disabled={!can('audioLibrary', 'update')}
                            onClick={(e) => {
                              e.stopPropagation();
                              Modal.confirm({
                                title: t({ uz: 'Bobni tahrirlash', en: 'Edit chapter', ru: 'Изм. главу' }),
                                content: (
                                  <Form
                                    layout="vertical"
                                    initialValues={{ title: ch.title, orderIndex: ch.order }}
                                    onFinish={async (values) => {
                                      await apiService.adminUpdateAudioChapter(ch.id, values);
                                      message.success(t({ uz: 'Saqlandi', en: 'Saved', ru: 'Сохранено' }));
                                      const d = await apiService.adminGetAudioBook(detail.id);
                                      setDetail(d);
                                    }}
                                  >
                                    <Form.Item name="title" label={t({ uz: 'Sarlavha', en: 'Title', ru: 'Название' })} rules={[{ required: true }]}>
                                      <Input />
                                    </Form.Item>
                                    <Form.Item name="orderIndex" label="Order" rules={[{ required: true }]}>
                                      <InputNumber min={0} className="w-full" />
                                    </Form.Item>
                                    <div className="flex justify-end">
                                      <Button type="primary" htmlType="submit">
                                        {t({ uz: 'Saqlash', en: 'Save', ru: 'Сохранить' })}
                                      </Button>
                                    </div>
                                  </Form>
                                ),
                                icon: null,
                                okButtonProps: { style: { display: 'none' } },
                                cancelText: t({ uz: 'Yopish', en: 'Close', ru: 'Закрыть' }),
                              });
                            }}
                          />
                          <Button
                            size="small"
                            danger
                            icon={<Trash2 size={14} />}
                            disabled={!can('audioLibrary', 'delete')}
                            onClick={(e) => {
                              e.stopPropagation();
                              Modal.confirm({
                                title: t({ uz: 'Bobni o‘chirish', en: 'Delete chapter', ru: 'Удалить главу' }),
                                content: t({ uz: 'Bob va ichidagi paragraf(lar) o‘chadi. Davom etamizmi?', en: 'This will delete chapter and its paragraphs. Continue?', ru: 'Удалит главу и параграфы. Продолжить?' }),
                                okButtonProps: { danger: true },
                                onOk: async () => {
                                  await apiService.adminDeleteAudioChapter(ch.id);
                                  const d = await apiService.adminGetAudioBook(detail.id);
                                  setDetail(d);
                                },
                              });
                            }}
                          />
                        </div>
                      </div>
                    ),
                    children: (
                      <div className="space-y-2">
                        {ch.paragraphs.length === 0 ? (
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {t({ uz: 'Paragraf yo‘q', en: 'No paragraphs', ru: 'Нет параграфов' })}
                          </div>
                        ) : (
                          ch.paragraphs
                            .slice()
                            .sort((a, b) => a.order - b.order)
                            .map((p) => (
                              <div key={p.id} className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 dark:text-white">
                                      {p.order}. {p.text}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                      audioUrl: {p.audioUrl}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="small"
                                      icon={<Pencil size={14} />}
                                      disabled={!can('audioLibrary', 'update')}
                                      onClick={() => {
                                        Modal.confirm({
                                          title: t({ uz: 'Paragrafni tahrirlash', en: 'Edit paragraph', ru: 'Изм. параграф' }),
                                          content: (
                                            <Form
                                              layout="vertical"
                                              initialValues={{ text: p.text, orderIndex: p.order, audioUrl: p.audioUrl }}
                                              onFinish={async (values) => {
                                                await apiService.adminUpdateAudioParagraph(p.id, values);
                                                message.success(t({ uz: 'Saqlandi', en: 'Saved', ru: 'Сохранено' }));
                                                const d = await apiService.adminGetAudioBook(detail.id);
                                                setDetail(d);
                                              }}
                                            >
                                              <Form.Item name="text" label="Text" rules={[{ required: true }]}>
                                                <Input.TextArea rows={3} />
                                              </Form.Item>
                                              <Form.Item name="orderIndex" label="Order" rules={[{ required: true }]}>
                                                <InputNumber min={0} className="w-full" />
                                              </Form.Item>
                                              <Form.Item name="audioUrl" label="audioUrl" rules={[{ required: true }]}>
                                                <Input />
                                              </Form.Item>
                                              <div className="flex justify-end">
                                                <Button type="primary" htmlType="submit">
                                                  {t({ uz: 'Saqlash', en: 'Save', ru: 'Сохранить' })}
                                                </Button>
                                              </div>
                                            </Form>
                                          ),
                                          icon: null,
                                          okButtonProps: { style: { display: 'none' } },
                                          cancelText: t({ uz: 'Yopish', en: 'Close', ru: 'Закрыть' }),
                                        });
                                      }}
                                    />
                                    <Button
                                      size="small"
                                      danger
                                      icon={<Trash2 size={14} />}
                                      disabled={!can('audioLibrary', 'delete')}
                                      onClick={() => {
                                        Modal.confirm({
                                          title: t({ uz: 'Paragrafni o‘chirish', en: 'Delete paragraph', ru: 'Удалить параграф' }),
                                          content: t({ uz: 'Davom etamizmi?', en: 'Continue?', ru: 'Продолжить?' }),
                                          okButtonProps: { danger: true },
                                          onOk: async () => {
                                            await apiService.adminDeleteAudioParagraph(p.id);
                                            const d = await apiService.adminGetAudioBook(detail.id);
                                            setDetail(d);
                                          },
                                        });
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    ),
                  }))}
              />
            )}
          </div>
        </div>
      </div>

      <Modal
        title={bookModalMode === 'create' ? t({ uz: 'Kitob qo‘shish', en: 'Add book', ru: 'Добавить' }) : t({ uz: 'Kitobni tahrirlash', en: 'Edit book', ru: 'Изм.' })}
        open={bookModalOpen}
        onCancel={() => setBookModalOpen(false)}
        onOk={() => bookForm.submit()}
        okButtonProps={{ disabled: bookModalMode === 'create' ? !can('audioLibrary', 'create') : !can('audioLibrary', 'update') }}
      >
        <Form
          form={bookForm}
          layout="vertical"
          onFinish={async (values) => {
            if (bookModalMode === 'create') {
              const created = await apiService.adminCreateAudioBook(values);
              message.success(t({ uz: 'Yaratildi', en: 'Created', ru: 'Создано' }));
              setBookModalOpen(false);
              void refetch();
              void loadDetail(created.id);
              return;
            }
            if (!selectedId) return;
            const updated = await apiService.adminUpdateAudioBook(selectedId, values);
            message.success(t({ uz: 'Saqlandi', en: 'Saved', ru: 'Сохранено' }));
            setBookModalOpen(false);
            void refetch();
            setDetail(updated);
          }}
        >
          <Form.Item name="title" label={t({ uz: 'Sarlavha', en: 'Title', ru: 'Название' })} rules={[{ required: true }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="description" label={t({ uz: 'Tavsif', en: 'Description', ru: 'Описание' })}>
            <Input.TextArea rows={3} maxLength={4000} />
          </Form.Item>
          <Form.Item name="coverUrl" label="coverUrl (optional)">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="isActive" label={t({ uz: 'Active', en: 'Active', ru: 'Активно' })} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          API: {BACKEND_ORIGIN}/api/audio-books (mobile), {BACKEND_ORIGIN}/api/admin/audio-books (admin)
        </div>
      </Modal>

      <Modal
        title={t({ uz: 'Bob qo‘shish', en: 'Add chapter', ru: 'Глава +' })}
        open={chapterModalOpen}
        onCancel={() => setChapterModalOpen(false)}
        onOk={() => chapterForm.submit()}
        okButtonProps={{ disabled: !can('audioLibrary', 'create') }}
      >
        <Form
          form={chapterForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!chapterBookId) return;
            await apiService.adminCreateAudioChapter(chapterBookId, values);
            message.success(t({ uz: 'Qo‘shildi', en: 'Added', ru: 'Добавлено' }));
            setChapterModalOpen(false);
            const d = await apiService.adminGetAudioBook(chapterBookId);
            setDetail(d);
            void refetch();
          }}
        >
          <Form.Item name="title" label={t({ uz: 'Sarlavha', en: 'Title', ru: 'Название' })} rules={[{ required: true }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="orderIndex" label="Order" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t({ uz: 'Paragraf qo‘shish', en: 'Add paragraph', ru: 'Параграф +' })}
        open={paragraphModalOpen}
        onCancel={() => setParagraphModalOpen(false)}
        onOk={() => paragraphForm.submit()}
        okButtonProps={{ disabled: !can('audioLibrary', 'create') }}
      >
        <Form
          form={paragraphForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!paragraphChapterId || !detail) return;
            await apiService.adminCreateAudioParagraph(paragraphChapterId, values);
            message.success(t({ uz: 'Qo‘shildi', en: 'Added', ru: 'Добавлено' }));
            setParagraphModalOpen(false);
            const d = await apiService.adminGetAudioBook(detail.id);
            setDetail(d);
          }}
        >
          <Form.Item name="text" label="Text" rules={[{ required: true }]}>
            <Input.TextArea rows={3} maxLength={4000} />
          </Form.Item>
          <Form.Item name="orderIndex" label="Order" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item
            name="audioUrl"
            label="audioUrl"
            rules={[{ required: true, message: 'audioUrl majburiy' }]}
          >
            <Input placeholder={`${BACKEND_ORIGIN}/uploads/audio/... yoki https://...`} />
          </Form.Item>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            V1.0: hozircha audioUrl ni link qilib beramiz. Upload (fayl) ni keyingi iteratsiyada qo‘shamiz.
          </div>
        </Form>
      </Modal>
    </div>
  );
}

