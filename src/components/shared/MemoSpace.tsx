import { useState, useEffect } from 'react';

export function MemoSpace() {
  const [memoContent, setMemoContent] = useState('');

  // Load memo from localStorage on mount
  useEffect(() => {
    const savedMemo = localStorage.getItem('daily-memo');
    if (savedMemo) {
      setMemoContent(savedMemo);
    }
  }, []);

  // Save memo to localStorage when it changes
  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setMemoContent(newContent);
    localStorage.setItem('daily-memo', newContent);
  };

  return (
    <div className="memo-space">
      <div className="memo-header">
        <h3>📝 Daily Memo</h3>
      </div>
      <div className="memo-content">
        <textarea
          value={memoContent}
          onChange={handleMemoChange}
          placeholder="Your daily to-do list, notes, reminders..."
          className="memo-textarea"
          rows={12}
        />
      </div>
    </div>
  );
}