import { useState } from 'react';

export default function TodoInput({ onAdd }) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="todo-input-row">
      <input
        className="todo-input"
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What needs to be done?"
        aria-label="New todo text"
      />
      <button className="add-btn" onClick={handleSubmit}>Add</button>
    </div>
  );
}
