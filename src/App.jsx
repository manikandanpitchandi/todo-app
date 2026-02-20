import { useState, useEffect } from 'react';
import TodoInput from './components/TodoInput';
import TodoList from './components/TodoList';
import TodoFilter from './components/TodoFilter';
import './App.css';

export default function App() {
  const [todos, setTodos] = useState(() => {
    try {
      const stored = localStorage.getItem('todos');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = (text) => {
    setTodos(prev => [
      ...prev,
      { id: crypto.randomUUID(), text, completed: false },
    ]);
  };

  const toggleTodo = (id) => {
    setTodos(prev =>
      prev.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo)
    );
  };

  const deleteTodo = (id) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos(prev => prev.filter(todo => !todo.completed));
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter(t => !t.completed).length;
  const hasCompleted = todos.some(t => t.completed);

  return (
    <div className="app">
      <h1 className="app-title">Task Manager</h1>
      <div className="card">
        <TodoInput onAdd={addTodo} />
        <TodoList
          todos={filteredTodos}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
        />
        {todos.length > 0 && (
          <TodoFilter
            filter={filter}
            onFilterChange={setFilter}
            activeCount={activeCount}
            hasCompleted={hasCompleted}
            onClearCompleted={clearCompleted}
          />
        )}
      </div>
    </div>
  );
}
