import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label?: string;
  title?: string;
  className?: string;
  showText?: boolean;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = '複製',
  title = '複製 STOP ID',
  className = '',
  showText = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      id={`copy-btn-${text.replace(/[^a-zA-Z0-9]/g, '')}`}
      onClick={handleCopy}
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 active:scale-95 cursor-pointer select-none ${
        copied
          ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 shadow-2xs'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          {showText && <span>已複製!</span>}
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          {showText && <span>{label}</span>}
        </>
      )}
    </button>
  );
};
