const FILTERS = ['all', 'active', 'completed'];

export default function TodoFilter({
  filter,
  onFilterChange,
  activeCount,
  hasCompleted,
  onClearCompleted,
}) {
  const itemLabel = activeCount === 1 ? 'item' : 'items';

  return (
    <div className="todo-footer">
      <span className="item-count">{activeCount} {itemLabel} left</span>

      <div className="filter-buttons" role="group" aria-label="Filter todos">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`filter-btn${filter === f ? ' active' : ''}`}
            onClick={() => onFilterChange(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {hasCompleted && (
        <button className="clear-btn" onClick={onClearCompleted}>
          Clear completed
        </button>
      )}
    </div>
  );
}
