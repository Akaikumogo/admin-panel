import { Spin } from '@/components/ui';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { StudentDetail, StudentSummary, UserProfile } from '@/services/api';
import { StudentFieldsEditor } from './StudentFieldsEditor';
import { EmployeeSafetySection } from './EmployeeSafetySection';

type Props = {
  summary: StudentSummary;
  me: UserProfile | null;
  onFieldsSaved: () => void;
};

/**
 * Flat-list expand panel: Energo ID display editor + safety tables.
 * Loads detail for 1c fallbacks before mounting the editor.
 */
export function EmployeeListExpandPanel({
  summary,
  me,
  onFieldsSaved,
}: Props) {
  const { data: detail, initialLoading, refetch } = useFetch<StudentDetail | null>(
    ['employee-list-fields', summary.id],
    () => apiService.getStudent(summary.id),
    null,
  );

  const editorStudent = detail ?? {
    id: summary.id,
    firstName: summary.firstName,
    lastName: summary.lastName,
    middleName: summary.middleName ?? null,
    division: summary.division ?? null,
    post: summary.post ?? null,
  };

  return (
    <div className="space-y-4" data-stop-row-click>
      {initialLoading && !detail ? (
        <div className="flex h-16 items-center justify-center rounded-lg border border-border bg-muted/20">
          <Spin />
        </div>
      ) : (
        <StudentFieldsEditor
          student={editorStudent}
          compact
          onSaved={() => {
            void refetch();
            onFieldsSaved();
          }}
        />
      )}
      <EmployeeSafetySection userId={summary.id} me={me} />
    </div>
  );
}
