'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  size = 'md',
  footer,
}: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    // Only track if clicking directly on backdrop (not modal content)
    if (e.target === backdropRef.current) {
      mouseDownRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
      };
    }
  };

  const handleBackdropMouseUp = (e: React.MouseEvent) => {
    // Check if this was a click (not a drag/selection)
    if (mouseDownRef.current && e.target === backdropRef.current) {
      const deltaX = Math.abs(e.clientX - mouseDownRef.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownRef.current.y);
      const deltaTime = Date.now() - mouseDownRef.current.time;
      
      // Check if there's a text selection
      const selection = window.getSelection();
      const hasSelection = selection && selection.toString().length > 0;
      
      // Only close if:
      // 1. It was a quick click (not a drag) - movement < 5px
      // 2. No text was selected
      // 3. Click happened within 300ms (quick click, not a drag)
      if (deltaX < 5 && deltaY < 5 && deltaTime < 300 && !hasSelection) {
        onClose();
      }
    }
    mouseDownRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      {/* Backdrop */}
      <div ref={backdropRef} className="absolute inset-0 bg-black/70 transition-opacity" />

      {/* Modal */}
      <div
        className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-slate-800 rounded-3xl shadow-modern-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scaleIn`}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              {Icon && (
                <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

