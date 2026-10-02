// Small reusable page header: title + optional description + optional action slot.

export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
