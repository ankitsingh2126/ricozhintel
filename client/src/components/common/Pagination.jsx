// Reusable pagination controls.
//
// Props:
//   page     — current page (1-indexed)
//   pages    — total number of pages (>= 0)
//   total    — total item count (used for the "showing X-Y of Z" label)
//   limit    — items per page (used to compute the "showing" range)
//   onChange — callback receiving the new page number
//
// Shows Prev / numbered pages / Next. Disables Prev on page 1 and Next on the
// last page. Renders nothing if pages <= 1 and total is 0.

export default function Pagination({ page, pages, total, limit, onChange }) {
  // Hide entirely when there is no data at all.
  if (!total || pages <= 1) {
    // But still show a small "showing X of Y" line if there is data.
    if (total && pages === 1) {
      return (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>
            Showing {total} of {total}
          </span>
          <div />
        </div>
      );
    }
    return null;
  }

  const firstItem = (page - 1) * limit + 1;
  const lastItem = Math.min(page * limit, total);

  // Build a compact page list: up to 5 pages around the current page.
  const pageNumbers = [];
  const windowSize = 2;
  const start = Math.max(1, page - windowSize);
  const end = Math.min(pages, page + windowSize);
  for (let i = start; i <= end; i++) {
    pageNumbers.push(i);
  }

  const goTo = (p) => {
    if (p < 1 || p > pages || p === page) return;
    onChange(p);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-sm">
      <span className="text-slate-500">
        Showing {firstItem}–{lastItem} of {total}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-md border border-slate-200 bg-white
                     text-slate-700 hover:bg-slate-50
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>

        {start > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(1)}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-white
                         text-slate-700 hover:bg-slate-50"
            >
              1
            </button>
            {start > 2 && <span className="px-2 text-slate-400">…</span>}
          </>
        )}

        {pageNumbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => goTo(n)}
            aria-current={n === page ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-md border
              ${n === page
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            {n}
          </button>
        ))}

        {end < pages && (
          <>
            {end < pages - 1 && <span className="px-2 text-slate-400">…</span>}
            <button
              type="button"
              onClick={() => goTo(pages)}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-white
                         text-slate-700 hover:bg-slate-50"
            >
              {pages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page === pages}
          className="px-3 py-1.5 rounded-md border border-slate-200 bg-white
                     text-slate-700 hover:bg-slate-50
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}