import './chatInput.css';

import { useLayoutEffect,useRef } from "react";

interface ChatInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  onSubmit?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const ChatInput = ({ value, onChange, onSubmit, ...props }: ChatInputProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.height = "1em";
    el.style.height = `${String(el.scrollHeight)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    props.onKeyDown?.(e);

    if (!e.defaultPrevented && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
   
    if (newValue.toLowerCase().includes('b1nzy')) {
      window.open('https://takeb1nzyto.space/', '_blank');

      e.target.value = newValue.replace(/b1nzy/gi, '');; //You're gonna get ratelimited.
    }

    onChange(e);
  };

  return (
    <textarea
      {...props}
      ref={ref}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className="chat-input"
    />
  );
};

export default ChatInput;