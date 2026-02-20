export default function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className={`todo-item${todo.completed ? ' completed' : ''}`}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      />
      <span className="todo-text">{todo.text}</span>
      <button
        className="delete-btn"
        onClick={() => onDelete(todo.id)}
        aria-label={`Delete "${todo.text}"`}
      >
        ✕
      </button>
    </li>
  );
}
