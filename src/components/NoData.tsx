import { Inbox } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

interface Props {
  text?: string;
  title?: string;
  action?: React.ReactNode;
}

/** Compat wrapper — SCHETCHIK EmptyState uslubida */
const NoData = ({ text, title, action }: Props) => (
  <EmptyState
    className="items-center text-center sm:items-center"
    icon={<Inbox className="h-6 w-6" strokeWidth={1.5} />}
    title={title ?? text ?? 'Maʼlumot yo‘q'}
    text={title ? text : undefined}
    action={action}
  />
);

export default NoData;
