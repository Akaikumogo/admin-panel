import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Collapse, Select, Spin, Tag } from 'antd';
import { BookOpen, ChevronRight, Filter } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { Level, Theory, Question } from '@/services/api';
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
  all: { uz: 'Barcha modullar', en: 'All modules', ru: 'Все модули' },
  theories: { uz: 'Nazariyalar', en: 'Theories', ru: 'Теории' },
  noData: { uz: 'Dars yo\'q', en: 'No lessons', ru: 'Нет уроков' },
} as const;

const ALL_LEVELS = '__all__';

type LessonRow = Theory & { _levelTitle?: string };

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
    queryFn: async () => {
      if (!levelId) return [];
      if (levelId !== ALL_LEVELS) {
        return apiService.getTheoryTreeByLevel(levelId);
      }
      const byId = new Map(levels.map((l) => [l.id, l.title] as const));
      const chunks = await Promise.all(
        levels.map(async (l) => {
          const rows = await apiService.getTheoryTreeByLevel(l.id);
          return rows.map((r) => ({ ...r, _levelTitle: byId.get(l.id) }));
        }),
      );
      return chunks.flat();
    },
    enabled: !!levelId,
  });

  const lessons = useMemo(() => {
    const roots = treeQuery.data ?? [];
    return roots.filter(
      (r: Theory) =>
        r.theoryRole === 'lesson' || !r.parentTheoryId,
    ) as LessonRow[];
  }, [treeQuery.data]);

  const [questionsByLesson, setQuestionsByLesson] = useState<
    Record<string, Question[] | undefined>
  >({});

  const fetchQuestions = async (lessonId: string) => {
    if (questionsByLesson[lessonId]) return;
    const res = await apiService.getQuestions({ theoryId: lessonId, limit: 200 });
    setQuestionsByLesson((p) => ({ ...p, [lessonId]: res.data }));
  };

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
          options={[
            { value: ALL_LEVELS, label: t(T.all) },
            ...levels.map((l) => ({ value: l.id, label: l.title })),
          ]}
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
        <Collapse
          accordion
          className="bg-transparent"
          onChange={(key) => {
            const lessonId = Array.isArray(key) ? key[0] : key;
            if (lessonId) void fetchQuestions(lessonId as string);
          }}
          items={lessons.map((lesson) => ({
            key: lesson.id,
            label: (
              <div className="flex items-center justify-between gap-3 pr-2">
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
                    {levelId === ALL_LEVELS && lesson._levelTitle && (
                      <p className="text-xs text-slate-400 truncate">
                        {lesson._levelTitle}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="primary"
                  size="small"
                  className="shrink-0"
                  icon={<ChevronRight size={14} />}
                  iconPosition="end"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard/theories?lessonId=${encodeURIComponent(lesson.id)}`);
                  }}
                >
                  {t(T.theories)}
                </Button>
              </div>
            ),
            children: (
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t(T.theories)}
                  </span>
                  {!lesson.children?.length ? (
                    <p className="text-xs text-slate-400 pl-1 mt-2">{t(T.noData)}</p>
                  ) : (
                    <div className="mt-2 space-y-1 border-l-2 border-slate-200 dark:border-slate-600 pl-3">
                      {lesson.children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between gap-2 py-1"
                        >
                          <button
                            type="button"
                            className="text-sm text-slate-800 dark:text-slate-200 hover:underline text-left truncate"
                            onClick={() => navigate(`/dashboard/theories/${child.id}`)}
                          >
                            {child.title}
                          </button>
                          <Tag className="text-xs">{child.orderIndex + 1}</Tag>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t({ uz: 'Mashqlar', en: 'Exercises', ru: 'Упражнения' })}
                  </span>
                  {!questionsByLesson[lesson.id] ? (
                    <div className="mt-2"><Spin size="small" /></div>
                  ) : questionsByLesson[lesson.id]!.length === 0 ? (
                    <p className="text-xs text-slate-400 pl-1 mt-2">
                      {t({ uz: 'Savol yo‘q', en: 'No questions', ru: 'Нет вопросов' })}
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {questionsByLesson[lesson.id]!
                        .slice()
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((q) => (
                          <div
                            key={q.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/70 dark:border-slate-700/60 px-3 py-2"
                          >
                            <button
                              type="button"
                              className="text-sm text-slate-900 dark:text-white hover:underline text-left truncate"
                              onClick={() => navigate(`/dashboard/questions/${q.id}`)}
                            >
                              #{q.orderIndex + 1} — {q.prompt}
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ),
          }))}
        />
      )}
    </div>
  );
};

export default Lessons;
