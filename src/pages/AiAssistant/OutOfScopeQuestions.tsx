import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import { PageHeader } from '@/components/PageHeader';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';

const AUDIENCE: Record<string, string> = {
  superadmin: 'Superadmin',
  central: 'Markaziy apparat',
  branch: 'Filial',
};

export default function OutOfScopeQuestionsPage() {
  const { data, loading } = useFetch(
    ['ai-out-of-scope'],
    () => apiService.getOutOfScopeQuestions(),
    { total: 0, data: [] },
  );
  const rows = data.data;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <PageHeader
        title="Contextdan tashqari savollar"
        description="Platforma, filial va xavfsizlik yozuvlaridan tashqari so‘rovlar. Bu sahifa faqat markaziy apparat va superadmin uchun."
      />
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Vaqt</th>
              <th className="px-4 py-3 font-medium">Kim</th>
              <th className="px-4 py-3 font-medium">Doira</th>
              <th className="px-4 py-3 font-medium">Savol</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-muted-foreground" colSpan={4}>
                  Yuklanmoqda
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted-foreground" colSpan={4}>
                  Hozircha tashqaridagi savol yo‘q.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    <DateTimeDisplay value={row.createdAt} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{row.userName}</div>
                    <div className="text-xs text-muted-foreground">
                      {AUDIENCE[row.audience] ?? row.userRole}
                    </div>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-muted-foreground">
                    {row.scopeLabel}
                  </td>
                  <td className="px-4 py-3 text-foreground">{row.question}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
