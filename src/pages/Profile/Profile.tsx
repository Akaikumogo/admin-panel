import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Divider, Form, Input, Spin, Tag, message } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import {
  Building2,
  KeyRound,
  LogOut,
  Mail,
  Save,
  Shield,
  UserCircle,
  X
} from 'lucide-react';
import apiService, { BACKEND_ORIGIN, type UserProfile } from '@/services/api';
import { useTranslation } from '@/hooks/useTranslation';

// ─── Module-level constants (zero per-render allocation) ──────

const BACKEND_BASE = BACKEND_ORIGIN;

const ROLE_COLOR_MAP: Record<string, string> = {
  SUPERADMIN: 'red',
  MODERATOR: 'blue',
  USER: 'default'
};

const GRADIENT_STYLE = Object.freeze({
  background: 'linear-gradient(135deg, #3B82F6 0%, #0a36ad 100%)'
});

const TAB_VISIBLE =
  'opacity-100 translate-x-0 transition-all duration-200 ease-in-out';
const TAB_HIDDEN =
  'opacity-0 translate-x-3 absolute pointer-events-none h-0 overflow-hidden';

// ─── Static translation dictionaries ─────────────────────────

const T = Object.freeze({
  imagesOnly: {
    uz: 'Faqat rasm fayllar qabul qilinadi',
    ru: 'Только изображения',
    en: 'Images only'
  },
  maxSize: {
    uz: 'Fayl 5MB dan oshmasin',
    ru: 'Файл не более 5MB',
    en: 'Max file size is 5MB'
  },
  avatarOk: {
    uz: 'Avatar yangilandi!',
    ru: 'Аватар обновлён!',
    en: 'Avatar updated!'
  },
  error: { uz: 'Xatolik yuz berdi', ru: 'Ошибка', en: 'Upload failed' },
  profileOk: {
    uz: 'Profil yangilandi!',
    ru: 'Профиль обновлён!',
    en: 'Profile updated!'
  },
  updateFail: { uz: 'Xatolik yuz berdi', ru: 'Ошибка', en: 'Failed to update' },
  pwOk: {
    uz: 'Parol yangilandi!',
    ru: 'Пароль обновлён!',
    en: 'Password changed!'
  },
  pwFail: { uz: 'Xatolik yuz berdi', ru: 'Ошибка', en: 'Failed' },
  clickPhoto: {
    uz: "Rasmga bosing o'zgartirish uchun",
    ru: 'Нажмите для изменения',
    en: 'Click to change photo'
  },
  orgs: { uz: 'Tashkilot', ru: 'Организаций', en: 'Organizations' },
  access: { uz: 'Ruxsat', ru: 'Доступ', en: 'Access' },
  firstName: { uz: 'Ism', ru: 'Имя', en: 'First name' },
  firstNameReq: {
    uz: 'Ism kiritilishi shart',
    ru: 'Введите имя',
    en: 'First name is required'
  },
  lastName: { uz: 'Familiya', ru: 'Фамилия', en: 'Last name' },
  lastNameReq: {
    uz: 'Familiya kiritilishi shart',
    ru: 'Введите фамилию',
    en: 'Last name is required'
  },
  role: { uz: 'Role', ru: 'Роль', en: 'Role' },
  orgsLabel: { uz: 'Tashkilotlar', ru: 'Организации', en: 'Organizations' },
  save: { uz: 'Saqlash', ru: 'Сохранить', en: 'Save changes' },
  cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
  curPw: { uz: 'Joriy parol', ru: 'Текущий пароль', en: 'Current password' },
  curPwReq: {
    uz: 'Joriy parolni kiriting',
    ru: 'Введите текущий пароль',
    en: 'Enter current password'
  },
  newPw: { uz: 'Yangi parol', ru: 'Новый пароль', en: 'New password' },
  newPwReq: {
    uz: 'Yangi parolni kiriting',
    ru: 'Введите новый пароль',
    en: 'Enter new password'
  },
  minChars: {
    uz: 'Kamida 6 belgi',
    ru: 'Минимум 6 символов',
    en: 'At least 6 characters'
  },
  confirmPw: {
    uz: 'Parolni tasdiqlang',
    ru: 'Подтвердите пароль',
    en: 'Confirm password'
  },
  confirmPwReq: {
    uz: 'Parolni tasdiqlang',
    ru: 'Подтвердите пароль',
    en: 'Confirm your password'
  },
  pwMismatch: {
    uz: 'Parollar mos kelmaydi',
    ru: 'Пароли не совпадают',
    en: 'Passwords do not match'
  },
  updatePw: {
    uz: 'Parolni yangilash',
    ru: 'Обновить пароль',
    en: 'Update password'
  },
  logout: { uz: 'Chiqish', ru: 'Выход', en: 'Logout' },
  logoutDesc: {
    uz: 'Tizimdan chiqish va login sahifasiga qaytish',
    ru: 'Выйти из системы и вернуться на страницу входа',
    en: 'Sign out and return to login page'
  },
  signOut: { uz: 'Chiqish', ru: 'Выйти', en: 'Sign out' },
  general: { uz: 'Umumiy', ru: 'Общие', en: 'General' },
  security: { uz: 'Xavfsizlik', ru: 'Безопасность', en: 'Security' }
});

type TFn = (d: Partial<Record<'uz' | 'ru' | 'en', string>>) => string;

// ─── Tab config ───────────────────────────────────────────────

type TabKey = 'general' | 'security';

const TAB_ITEMS: readonly {
  key: TabKey;
  icon: typeof UserCircle;
  labelKey: keyof typeof T;
}[] = [
  { key: 'general', icon: UserCircle, labelKey: 'general' },
  { key: 'security', icon: Shield, labelKey: 'security' }
] as const;

// ─── Avatar Card (left column) ────────────────────────────────

const AvatarCard = memo(function AvatarCard({
  me,
  avatarSrc,
  initials,
  uploading,
  onUpload,
  t
}: {
  me: UserProfile;
  avatarSrc: string | null;
  initials: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  t: TFn;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onUpload(file);
      e.target.value = '';
    },
    [onUpload]
  );

  return (
    <Card className="bg-white/95 dark:bg-[#101010]/95 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-xl">
      <div className="flex flex-col items-center">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-white dark:ring-[#101010] shadow-lg">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                style={GRADIENT_STYLE}
                className="w-full h-full flex items-center justify-center"
              >
                <span className="text-white font-bold text-4xl tracking-wide select-none">
                  {initials}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={handleClick}
            className="absolute inset-0 w-32 h-32 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-200 cursor-pointer"
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {uploading ? (
                <Spin size="small" />
              ) : (
                <CameraOutlined className="text-white text-2xl" />
              )}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          {t(T.clickPhoto)}
        </p>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-4">
          {me.firstName} {me.lastName}
        </h2>
        <Tag color={ROLE_COLOR_MAP[me.role]} className="mt-1">
          {me.role}
        </Tag>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {me.email}
        </p>
      </div>

      <Divider className="my-4" />
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {me.organizations.length || 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t(T.orgs)}
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {me.role === 'SUPERADMIN' ? 'Full' : 'Limited'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t(T.access)}
          </div>
        </div>
      </div>
    </Card>
  );
});

// ─── General Tab ──────────────────────────────────────────────

const GeneralTab = memo(function GeneralTab({
  me,
  profileForm,
  saving,
  isDirty,
  onSave,
  onCancel,
  onFieldsChange,
  t
}: {
  me: UserProfile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profileForm: any;
  saving: boolean;
  isDirty: boolean;
  onSave: (v: { firstName: string; lastName: string }) => void;
  onCancel: () => void;
  onFieldsChange: () => void;
  t: TFn;
}) {
  const firstNameRules = useMemo(
    () => [{ required: true, message: t(T.firstNameReq) }],
    [t]
  );
  const lastNameRules = useMemo(
    () => [{ required: true, message: t(T.lastNameReq) }],
    [t]
  );

  return (
    <div className="space-y-6">
      <Form
        form={profileForm}
        layout="vertical"
        onFinish={onSave}
        onFieldsChange={onFieldsChange}
        className="max-w-lg"
      >
        <Form.Item
          label={t(T.firstName)}
          name="firstName"
          rules={firstNameRules}
        >
          <Input size="large" />
        </Form.Item>
        <Form.Item label={t(T.lastName)} name="lastName" rules={lastNameRules}>
          <Input size="large" />
        </Form.Item>
        <Form.Item label="Email">
          <Input
            size="large"
            value={me.email}
            disabled
            prefix={<Mail size={16} />}
          />
        </Form.Item>
        <Form.Item label={t(T.role)}>
          <Tag color={ROLE_COLOR_MAP[me.role]}>{me.role}</Tag>
        </Form.Item>
        {me.role !== 'SUPERADMIN' && (
          <Form.Item label={t(T.orgsLabel)}>
            <div className="flex flex-wrap gap-2">
              {me.organizations.length ? (
                me.organizations.map((org) => (
                  <Tag
                    key={org.id}
                    className="font-mono text-xs  flex items-center gap-2"
                  >
                    <div className='flex items-center gap-2  p-2'>

                    <Building2 size={12} />
                    <span className="text-xs">{org.name}</span>
                    </div>
                  </Tag>
                ))
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </Form.Item>
        )}
        {isDirty && (
          <div className="flex items-center gap-3">
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              icon={<Save size={16} />}
              size="large"
            >
              {t(T.save)}
            </Button>
            <Button size="large" icon={<X size={16} />} onClick={onCancel}>
              {t(T.cancel)}
            </Button>
          </div>
        )}
      </Form>
    </div>
  );
});

// ─── Security Tab ─────────────────────────────────────────────

const SecurityTab = memo(function SecurityTab({
  passwordForm,
  changingPw,
  onChangePassword,
  t
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  passwordForm: any;
  changingPw: boolean;
  onChangePassword: (v: {
    currentPassword: string;
    newPassword: string;
  }) => void;
  t: TFn;
}) {
  const curPwRules = useMemo(
    () => [{ required: true, message: t(T.curPwReq) }, { min: 6 }],
    [t]
  );

  const newPwRules = useMemo(
    () => [
      { required: true, message: t(T.newPwReq) },
      { min: 6, message: t(T.minChars) }
    ],
    [t]
  );

  const confirmPwRules = useMemo(
    () => [
      { required: true, message: t(T.confirmPwReq) },
      ({ getFieldValue }: { getFieldValue: (n: string) => string }) => ({
        validator(_: unknown, value: string) {
          if (!value || getFieldValue('newPassword') === value)
            return Promise.resolve();
          return Promise.reject(new Error(t(T.pwMismatch)));
        }
      })
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <Form
        form={passwordForm}
        layout="vertical"
        onFinish={onChangePassword}
        className="max-w-lg"
      >
        <Form.Item label={t(T.curPw)} name="currentPassword" rules={curPwRules}>
          <Input.Password size="large" />
        </Form.Item>
        <Form.Item label={t(T.newPw)} name="newPassword" rules={newPwRules}>
          <Input.Password size="large" />
        </Form.Item>
        <Form.Item
          label={t(T.confirmPw)}
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={confirmPwRules}
        >
          <Input.Password size="large" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={changingPw}
          icon={<KeyRound size={16} />}
          size="large"
        >
          {t(T.updatePw)}
        </Button>
      </Form>
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────

export default function ProfilePage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    apiService
      .me()
      .then((res) => {
        setMe(res);
        profileForm.setFieldsValue({
          firstName: res.firstName,
          lastName: res.lastName
        });
      })
      .finally(() => setLoading(false));
  }, [profileForm]);

  const handleFieldsChange = useCallback(() => {
    if (!me) return;
    const vals = profileForm.getFieldsValue();
    setIsDirty(
      vals.firstName !== me.firstName || vals.lastName !== me.lastName
    );
  }, [me, profileForm]);

  const handleCancel = useCallback(() => {
    if (!me) return;
    profileForm.setFieldsValue({
      firstName: me.firstName,
      lastName: me.lastName
    });
    setIsDirty(false);
  }, [me, profileForm]);

  const handleAvatarUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        void message.error(t(T.imagesOnly));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        void message.error(t(T.maxSize));
        return;
      }
      setUploading(true);
      try {
        const result = await apiService.uploadMyAvatar(file);
        setMe((prev) =>
          prev ? { ...prev, avatarUrl: result.avatarUrl } : prev
        );
        void message.success(t(T.avatarOk));
      } catch {
        void message.error(t(T.error));
      } finally {
        setUploading(false);
      }
    },
    [t]
  );

  const handleProfileSave = useCallback(
    async (values: { firstName: string; lastName: string }) => {
      setSaving(true);
      try {
        const updated = await apiService.updateProfile(values);
        setMe((prev) => (prev ? { ...prev, ...updated } : prev));
        setIsDirty(false);
        void message.success(t(T.profileOk));
      } catch {
        void message.error(t(T.updateFail));
      } finally {
        setSaving(false);
      }
    },
    [t]
  );

  const handlePasswordChange = useCallback(
    async (values: { currentPassword: string; newPassword: string }) => {
      setChangingPw(true);
      try {
        await apiService.changePassword(values);
        void message.success(t(T.pwOk));
        passwordForm.resetFields();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        void message.error(err?.response?.data?.message || t(T.pwFail));
      } finally {
        setChangingPw(false);
      }
    },
    [t, passwordForm]
  );

  const handleLogout = useCallback(async () => {
    await apiService.logout();
    window.location.href = '/login';
  }, []);

  const handleTabClick = useCallback((key: TabKey) => {
    setActiveTab(key);
  }, []);

  const avatarSrc = useMemo(
    () => (me?.avatarUrl ? `${BACKEND_BASE}${me.avatarUrl}` : null),
    [me?.avatarUrl]
  );

  const initials = useMemo(
    () =>
      [me?.firstName?.[0], me?.lastName?.[0]]
        .filter(Boolean)
        .join('')
        .toUpperCase() || 'U',
    [me?.firstName, me?.lastName]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size="large" />
      </div>
    );
  }

  if (!me) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-36 w-full rounded-t-2xl" style={GRADIENT_STYLE} />

      <div className="flex flex-col md:flex-row gap-6 px-6 pb-8 -mt-16">
        <div className="w-full md:w-80 flex-shrink-0">
          <AvatarCard
            me={me}
            avatarSrc={avatarSrc}
            initials={initials}
            uploading={uploading}
            onUpload={handleAvatarUpload}
            t={t}
          />
        </div>

        <div className="w-full">
          <div className="p-6 rounded-2xl bg-white/95 dark:bg-[#101010]/95 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700/60 pb-3 mb-6">
              {TAB_ITEMS.map(({ key, icon: Icon, labelKey }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTabClick(key)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 active:scale-[0.97] ${
                    activeTab === key
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  {t(T[labelKey])}
                </button>
              ))}
            </div>

            {/* Both tabs stay mounted — no unmount/mount cost on switch */}
            <div className="relative">
              <div
                className={activeTab === 'general' ? TAB_VISIBLE : TAB_HIDDEN}
              >
                <GeneralTab
                  me={me}
                  profileForm={profileForm}
                  saving={saving}
                  isDirty={isDirty}
                  onSave={handleProfileSave}
                  onCancel={handleCancel}
                  onFieldsChange={handleFieldsChange}
                  t={t}
                />
              </div>
              <div
                className={activeTab === 'security' ? TAB_VISIBLE : TAB_HIDDEN}
              >
                <SecurityTab
                  passwordForm={passwordForm}
                  changingPw={changingPw}
                  onChangePassword={handlePasswordChange}
                  t={t}
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl mt-6 border border-red-200 dark:border-red-900/50 bg-white/95 dark:bg-[#101010]/95 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h4 className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-2">
                  <LogOut size={18} />
                  {t(T.logout)}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t(T.logoutDesc)}
                </p>
              </div>
              <Button
                danger
                size="large"
                icon={<LogOut size={16} />}
                onClick={handleLogout}
              >
                {t(T.signOut)}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
