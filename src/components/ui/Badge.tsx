import React from 'react';
import { LeadPriority, LeadStatus, OperationType } from '@/core/types/lead';
import { STATUS_CONFIG, PRIORITY_CONFIG, OPERATION_CONFIG } from '@/core/config/constants';

interface StatusBadgeProps {
  status: LeadStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.nuevo;
  const isSmall = size === 'sm';

  return (
    <span
      className="badge"
      style={{
        backgroundColor: config.bg,
        color: config.color,
        borderColor: config.border,
        fontSize: isSmall ? '0.7rem' : '0.78rem',
        padding: isSmall ? '0.15rem 0.5rem' : '0.25rem 0.65rem',
      }}
    >
      <span
        style={{
          width: isSmall ? '5px' : '6px',
          height: isSmall ? '5px' : '6px',
          borderRadius: '50%',
          backgroundColor: config.color,
          boxShadow: `0 0 6px ${config.color}`,
        }}
      />
      {config.label}
    </span>
  );
};

interface PriorityBadgeProps {
  priority: LeadPriority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medio;
  const isSmall = size === 'sm';

  return (
    <span
      className="badge"
      style={{
        backgroundColor: config.bg,
        color: config.color,
        borderColor: config.border,
        fontSize: isSmall ? '0.7rem' : '0.78rem',
        padding: isSmall ? '0.15rem 0.5rem' : '0.25rem 0.65rem',
      }}
    >
      <span>{config.iconLabel}</span>
      <span>{config.label.split(' ')[0]}</span>
    </span>
  );
};

interface OperationBadgeProps {
  operation: OperationType;
  size?: 'sm' | 'md';
}

export const OperationBadge: React.FC<OperationBadgeProps> = ({ operation, size = 'md' }) => {
  const config = OPERATION_CONFIG[operation] || OPERATION_CONFIG.compra;
  const isSmall = size === 'sm';

  return (
    <span
      className="badge"
      style={{
        backgroundColor: config.bg,
        color: config.color,
        borderColor: 'transparent',
        fontSize: isSmall ? '0.7rem' : '0.78rem',
        padding: isSmall ? '0.15rem 0.5rem' : '0.25rem 0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 700,
      }}
    >
      {config.label}
    </span>
  );
};
