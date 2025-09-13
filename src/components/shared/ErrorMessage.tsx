interface ErrorMessageProps {
  message: string;
  onClose: () => void;
}

export function ErrorMessage({ message, onClose }: ErrorMessageProps) {
  return (
    <div className="error-message">
      {message}
      <button className="error-close" onClick={onClose}>×</button>
    </div>
  );
}