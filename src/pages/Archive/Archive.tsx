import { useNavigate } from 'react-router-dom';
import { Archive, BookOpen, GraduationCap, HelpCircle, Layers } from 'lucide-react';
import { Card, Spin, Tag } from '@/components/ui';
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

  const { data: summary, loading } = useFetch(
    ['archive-summary'],
    () => apiService.getArchiveSummary(),
    { employees: 0, questions: 0, modules: 0, theories: 0 },
  );

  const cards: ArchiveCard[] = [
    {
      key: 'employees',
      title: { uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' },
      description: {
        uz: 'Energo ID syncdan chiqarilgan / bo‘shagan xodimlar',
        en: 'Employees removed from Energo ID sync',
        ru: 'Сотрудники, исключённые из синхронизации',
      },
      icon: GraduationCap,
      path: '/dashboard/archive/employees',
      count: summary.employees,
    },
    {
      key: 'questions',
      title: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' },
      description: {
        uz: 'Arxivlangan o‘quv savollari',
        en: 'Archived learning questions',
        ru: 'Архивные вопросы',
      },
      icon: HelpCircle,
      count: summary.questions,
      comingSoon: true,
    },
    {
      key: 'modules',
      title: { uz: 'Modullar', en: 'Modules', ru: 'Модули' },
      description: {
        uz: 'Arxivlangan o‘quv modullari',
        en: 'Archived learning modules',
        ru: 'Архивные модули',
      },
      icon: Layers,
      count: summary.modules,
      comingSoon: true,
    },
    {
      key: 'theories',
      title: { uz: 'Nazariyalar', en: 'Theories', ru: 'Теории' },
      description: {
        uz: 'Arxivlangan nazariy materiallar',
        en: 'Archived theory materials',
        ru: 'Архивные теории',
      },
      icon: BookOpen,
      count: summary.theories,
      comingSoon: true,
    },
  ];

  return (
    <div className="space-y-6 overflow-y-auto p-6 h-[calc(100vh-100px)]">
      <PageHeader
        title={t({ uz: 'Arxiv', en: 'Archive', ru: 'Архив' })}
        description={t({
          uz: 'Asosiy ro‘yxatlardan chiqarilgan ma’lumotlar shu yerda saqlanadi',
          en: 'Items removed from main lists are kept here',
          ru: 'Удалённые из основных списков данные хранятся здесь',
        })}
        icon={Archive}
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spin size="large" />
        </div>
      ) : (
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
                  !clickable && 'cursor-default opacity-80',
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
                <p className="mt-1 text-sm text-muted-foreground">{t(card.description)}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
