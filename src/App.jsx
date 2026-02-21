import { useState, useEffect } from 'react';
import TodoInput from './components/TodoInput';
import TodoList from './components/TodoList';
import TodoFilter from './components/TodoFilter';
import AuthPage from './components/AuthPage';
import { getSession, clearSession, todosKey } from './utils/auth';
import './App.css';

export default function App() {
  const [user, setUser] = useState(() => getSession());
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    try {
      const stored = localStorage.getItem(todosKey(user));
      setTodos(stored ? JSON.parse(stored) : []);
    } catch {
      setTodos([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(todosKey(user), JSON.stringify(todos));
  }, [todos, user]);

  const handleLogin = (username) => {
    setUser(username);
    setFilter('all');
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setTodos([]);
  };

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

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
      <div className="app-header">
        <h1 className="app-title">Task Manager</h1>
        <div className="app-user">
          <span className="app-username">Hi, <strong>{user}</strong></span>
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
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
