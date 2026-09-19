import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, helperText, style, className = '', ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
        {label && (
          <label
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              letterSpacing: '0.01em',
            }}
          >
            {label}
            {props.required && <span style={{ color: 'var(--accent-rose)', marginLeft: '3px' }}>*</span>}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {icon && (
            <div
              style={{
                position: 'absolute',
                left: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            style={{
              width: '100%',
              padding: icon ? '0.65rem 1rem 0.65rem 2.5rem' : '0.65rem 1rem',
              backgroundColor: 'var(--bg-input)',
              border: `1px solid ${error ? 'var(--accent-rose)' : 'var(--border-card)'}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
              ...style,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = error ? 'var(--accent-rose)' : 'var(--primary-light)';
              e.currentTarget.style.boxShadow = `0 0 0 3px ${error ? 'rgba(244, 63, 94, 0.15)' : 'var(--primary-glow)'}`;
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? 'var(--accent-rose)' : 'var(--border-card)';
              e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.2)';
              props.onBlur?.(e);
            }}
            className={className}
            {...props}
          />
        </div>
        {error && (
          <span style={{ fontSize: '0.78rem', color: 'var(--accent-rose)', fontWeight: 500 }}>
            {error}
          </span>
        )}
        {helperText && !error && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
