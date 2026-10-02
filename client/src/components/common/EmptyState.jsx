// Shown when a list has no items.

import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No data yet', description = '' }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
      <Inbox className="mx-auto text-slate-300" size={40} />
      <h3 className="mt-3 font-medium text-slate-700">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  );
}
