import { useRef, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Switch,
  Tag,
  message,
} from '@/components/ui';
import { FileText, Pencil, Plus, RefreshCcw, Trash2, UploadCloud } from 'lucide-react';
import apiService, {
  BACKEND_ORIGIN,
  type LibraryDocumentKind,
  type LibraryDocumentRow,
} from '@/services/api';
import { usePaginatedFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import { can } from '@/utils/can';

function resolveUrl(url: string | null | undefined) {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${BACKEND_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function formatSize(size: string | null | undefined) {
  const n = Number(size);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LibraryDocumentsPanel() {
  const { t } = useTranslation();
  const {
    data: docs,
    loading,
    initialLoading,
    refetch,
  } = usePaginatedFetch(['admin-library-documents'], async () => {
    const rows = await apiService.adminListLibraryDocuments();
    return { data: rows, total: rows.length, page: 1, limit: rows.length };
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = (docs ?? []) as LibraryDocumentRow[];

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, orderIndex: 0 });
    setModalOpen(true);
  };

  const openEdit = (row: LibraryDocumentRow) => {
    setMode('edit');
    setEditingId(row.id);
    form.setFieldsValue({
      title: row.title,
      description: row.description,
      fileUrl: row.fileUrl,
      fileKind: row.fileKind,
      originalName: row.originalName,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      orderIndex: row.orderIndex,
      isActive: row.isActive,
    });
    setModalOpen(true);
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const res = await apiService.adminUploadDocument(file);
      form.setFieldsValue({
        fileUrl: res.url,
        fileKind: res.fileKind,
        originalName: res.originalName,
        mimeType: res.mimeType,
        fileSize: String(res.size),
        title: form.getFieldValue('title') || res.originalName.replace(/\.[^.]+$/, ''),
      });
      message.success('Fayl yuklandi');
    } catch {
      message.error('Fayl yuklashda xato');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!values.fileUrl) {
        message.warning('Avval fayl yuklang');
        return;
      }
      if (mode === 'create') {
        await apiService.adminCreateLibraryDocument({
          title: values.title,
          description: values.description || null,
          fileKind: values.fileKind as LibraryDocumentKind,
          fileUrl: values.fileUrl,
          originalName: values.originalName || null,
          mimeType: values.mimeType || null,
          fileSize: values.fileSize || null,
          orderIndex: Number(values.orderIndex) || 0,
          isActive: values.isActive ?? true,
        });
        message.success('Hujjat qo‘shildi');
      } else if (editingId) {
        await apiService.adminUpdateLibraryDocument(editingId, {
          title: values.title,
          description: values.description || null,
          fileKind: values.fileKind,
          fileUrl: values.fileUrl,
          originalName: values.originalName || null,
          mimeType: values.mimeType || null,
          fileSize: values.fileSize || null,
          orderIndex: Number(values.orderIndex) || 0,
          isActive: values.isActive ?? true,
        });
        message.success('Hujjat yangilandi');
      }
      setModalOpen(false);
      refetch();
    } catch {
      /* validation */
    }
  };

  const handleDelete = async (id: string) => {
    await apiService.adminDeleteLibraryDocument(id);
    message.success('Hujjat yashirildi');
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button icon={<RefreshCcw size={16} />} onClick={() => void refetch()}>
          {t({ uz: 'Yangilash', en: 'Refresh', ru: 'Обновить' })}
        </Button>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          disabled={!can('audioLibrary', 'create')}
          onClick={openCreate}
        >
          {t({ uz: 'Hujjat qo‘shish', en: 'Add document', ru: 'Добавить документ' })}
        </Button>
      </div>

      {initialLoading || loading ? (
        <div className="py-4 text-sm text-slate-500">Yuklanyapti...</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-[#121314]/80">
          Hozircha hujjat yo‘q. PDF yoki Word fayl qo‘shing.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/60 dark:bg-[#121314]/80"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">
                        {doc.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {doc.fileKind} · {formatSize(doc.fileSize)}
                      </p>
                    </div>
                    {doc.isActive ? (
                      <Tag color="green">ACTIVE</Tag>
                    ) : (
                      <Tag>HIDDEN</Tag>
                    )}
                  </div>
                  {doc.description ? (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                      {doc.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex gap-1">
                    <Button
                      size="small"
                      icon={<Pencil size={12} />}
                      disabled={!can('audioLibrary', 'update')}
                      onClick={() => openEdit(doc)}
                    />
                    <Button
                      size="small"
                      danger
                      icon={<Trash2 size={12} />}
                      disabled={!can('audioLibrary', 'delete')}
                      onClick={() => void handleDelete(doc.id)}
                    />
                    <a
                      href={resolveUrl(doc.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center rounded-md border px-2 text-xs"
                    >
                      Ochish
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={mode === 'create' ? 'Hujjat qo‘shish' : 'Hujjatni tahrirlash'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleSave()}
        okText="Saqlash"
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Tavsif">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="fileUrl" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="fileKind" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="originalName" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="mimeType" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="fileSize" hidden>
            <Input />
          </Form.Item>
          <div className="mb-4 space-y-2">
            <label className="text-sm font-medium">Fayl (PDF / Word)</label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                icon={<UploadCloud size={16} />}
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                Fayl tanlash
              </Button>
              {form.getFieldValue('originalName') || form.getFieldValue('fileUrl') ? (
                <span className="text-xs text-slate-500">
                  {form.getFieldValue('originalName') || form.getFieldValue('fileKind')}
                </span>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
                e.target.value = '';
              }}
            />
          </div>
          <Form.Item name="orderIndex" label="Tartib">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="isActive" label="Faol" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
