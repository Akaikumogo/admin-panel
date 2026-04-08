import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Select, Spin } from 'antd';
import { BookOpen, ChevronRight, Filter } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { Level, Theory } from '@/services/api';
import NoData from '@/components/NoData';

const T = {
  title: { uz: 'Darslar', en: 'Lessons', ru: 'Уроки' },
  subtitle: {
    uz: 'Modul tanlang, keyin dars ustida nazariyalarni oching',
    en: 'Pick a module, then open theories for a lesson',
    ru: 'Выберите модуль, затем откройте теории урока',
  },
  module: { uz: 'Modul', en: 'Module', ru: 'Модуль' },
  allModules: { uz: 'Modulni tanlang', en: 'Select module', ru: 'Модуль' },
  theories: { uz: 'Nazariyalar', en: 'Theories', ru: 'Теории' },
  noData: { uz: 'Dars yo\'q', en: 'No lessons', ru: 'Нет уроков' },
} as const;

const Lessons = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: levels, initialLoading: levelsLoading } = useFetch(
    ['levels'],
    () => apiService.getLevels(),
    [] as Level[],
  );

  const [levelId, setLevelId] = useState<string | undefined>();

  useEffect(() => {
    if (levels.length && !levelId) {
      setLevelId(levels[0].id);
    }
  }, [levels, levelId]);

  const treeQuery = useQuery({
    queryKey: ['theory-tree', levelId],
    queryFn: () => apiService.getTheoryTreeByLevel(levelId!),
    enabled: !!levelId,
  });

  const lessons = useMemo(() => {
    const roots = treeQuery.data ?? [];
    return roots.filter(
      (r: Theory) =>
        r.theoryRole === 'lesson' || !r.parentTheoryId,
    ) as Theory[];
  }, [treeQuery.data]);

  if (levelsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {t(T.title)}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t(T.subtitle)}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg px-4 py-3">
        <Filter size={16} className="text-slate-400" />
        <Select
          className="min-w-[260px]"
          placeholder={t(T.allModules)}
          value={levelId}
          onChange={(v) => setLevelId(v)}
          options={levels.map((l) => ({ value: l.id, label: l.title }))}
        />
      </div>

      {treeQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : !levelId ? (
        <NoData text={t(T.allModules)} />
      ) : lessons.length === 0 ? (
        <NoData text={t(T.noData)} />
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <Card
              key={lesson.id}
              className="!border-slate-200 dark:!border-slate-700/60"
              bodyStyle={{ padding: '14px 18px' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10">
                    <BookOpen size={18} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      #{lesson.orderIndex + 1}
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {lesson.title}
                    </p>
                  </div>
                </div>
                <Button
                  type="primary"
                  className="shrink-0"
                  icon={<ChevronRight size={16} />}
                  iconPosition="end"
                  onClick={() =>
                    navigate(
                      `/dashboard/theories?lessonId=${encodeURIComponent(lesson.id)}`,
                    )
                  }
                >
                  {t(T.theories)}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Lessons;
