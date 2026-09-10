import type { StudentSummary, UserProfile } from '@/services/api';
import { EmployeeSafetySection } from './EmployeeSafetySection';

type Props = {
  summary: StudentSummary;
  me: UserProfile | null;
};

/**
 * Flat-list expand panel: safety tables only.
 * Energo ID display fields are edited inline as list columns.
 */
export function EmployeeListExpandPanel({ summary, me }: Props) {
  return (
    <div className="space-y-4" data-stop-row-click>
      <EmployeeSafetySection userId={summary.id} me={me} />
    </div>
  );
}