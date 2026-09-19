import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const getStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      borderRadius: 'var(--radius-md)',
      fontWeight: 600,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.6 : 1,
      transition: 'all var(--transition-fast)',
      border: '1px solid transparent',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
    };

    // Size variants
    if (size === 'sm') {
      base.padding = '0.4rem 0.75rem';
      base.fontSize = '0.82rem';
    } else if (size === 'lg') {
      base.padding = '0.75rem 1.5rem';
      base.fontSize = '1rem';
    } else {
      base.padding = '0.55rem 1.15rem';
      base.fontSize = '0.9rem';
    }

    // Color variants
    switch (variant) {
      case 'primary':
        base.backgroundColor = 'var(--primary)';
        base.color = '#ffffff';
        base.boxShadow = '0 2px 10px rgba(79, 70, 229, 0.35)';
        break;
      case 'secondary':
        base.backgroundColor = 'rgba(255, 255, 255, 0.08)';
        base.color = 'var(--text-primary)';
        base.borderColor = 'var(--border-subtle)';
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.color = 'var(--text-primary)';
        base.borderColor = 'var(--border-card)';
        break;
      case 'danger':
        base.backgroundColor = 'rgba(244, 63, 94, 0.15)';
        base.color = '#fb7185';
        base.borderColor = 'rgba(244, 63, 94, 0.3)';
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        base.color = 'var(--text-secondary)';
        break;
      case 'glass':
        base.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        base.backdropFilter = 'blur(10px)';
        base.color = 'var(--text-primary)';
        base.borderColor = 'rgba(255, 255, 255, 0.1)';
        break;
    }

    return { ...base, ...style };
  };

  return (
    <button
      style={getStyles()}
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  );
};
