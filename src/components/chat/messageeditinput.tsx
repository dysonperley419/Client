import { useEffect, useRef, useState } from "react";

export const MessageEditInput = ({ 
  initialContent, 
  onSave, 
  onCancel 
}: { 
  initialContent: string, 
  onSave: (content: string) => void, 
  onCancel: () => void 
}) => {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(content.length, content.length);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(content);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="message-edit-container">
      <textarea
        autoFocus
        className="message-edit-input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="edit-help-text">
        escape to{' '}<a href="#" 
        className="login-link" 
        onClick={(e) => {
            e.preventDefault();
            onCancel();
        }}>cancel</a>{' '}• enter to{' '}<a href="#" className="login-link" onClick={(e) => {
            e.preventDefault();
            onSave(content);
        }}>save</a>
      </div>
    </div>
  );
};