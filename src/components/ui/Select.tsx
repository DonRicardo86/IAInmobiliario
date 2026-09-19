import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, helperText, style, className = '', ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
        {label && (
          <label
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            {label}
            {props.required && <span style={{ color: 'var(--accent-rose)', marginLeft: '3px' }}>*</span>}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          <select
            ref={ref}
            style={{
              width: '100%',
              padding: '0.65rem 2.2rem 0.65rem 1rem',
              backgroundColor: 'var(--bg-input)',
              border: `1px solid ${error ? 'var(--accent-rose)' : 'var(--border-card)'}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
              transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
              ...style,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary-light)';
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-glow)';
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? 'var(--accent-rose)' : 'var(--border-card)';
              e.currentTarget.style.boxShadow = 'none';
              props.onBlur?.(e);
            }}
            className={className}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ background: '#131b2e', color: '#f8fafc' }}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Custom Chevron arrow */}
          <div
            style={{
              position: 'absolute',
              right: '0.9rem',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
            }}
          >
            ▼
          </div>
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

Select.displayName = 'Select';
