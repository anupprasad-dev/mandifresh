export default function Pagination({ page, count, pageSize = 12, onChange }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="btn btn-outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</button>
      <span>Page {page} of {pages}</span>
      <button className="btn btn-outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next →</button>
    </nav>
  );
}
