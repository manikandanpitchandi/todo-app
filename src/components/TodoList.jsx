import TodoItem from './TodoItem';

export default function TodoList({ todos, onToggle, onDelete }) {
  if (todos.length === 0) {
    return <p className="empty-message">No todos here!</p>;
  }

  return (
    <ul className="todo-list">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
