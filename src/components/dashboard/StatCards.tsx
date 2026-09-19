'use client';

import React from 'react';
import { LeadStats } from '@/core/types/lead';
import { Users, Flame, DollarSign, TrendingUp, Sparkles, UserPlus } from 'lucide-react';

interface StatCardsProps {
  stats: LeadStats;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  const formattedPipeline = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(stats.totalPipelineValue);

  const cards = [
    {
      title: 'Total Prospectos',
      value: stats.total,
      subtitle: `${stats.newLeadsCount} ingresados recientemente`,
      icon: Users,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.25)',
    },
    {
      title: 'Prospectos Calientes',
      value: stats.highPriorityCount,
      subtitle: 'Alta probabilidad de cierre',
      icon: Flame,
      color: '#f43f5e',
      bg: 'rgba(244, 63, 94, 0.12)',
      border: 'rgba(244, 63, 94, 0.25)',
    },
    {
      title: 'Pipeline Activo',
      value: formattedPipeline,
      subtitle: 'Volumen en negociación',
      icon: DollarSign,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.25)',
    },
    {
      title: 'Tasa de Conversión',
      value: `${stats.conversionRate}%`,
      subtitle: `${stats.byStatus.cerrado} cerrados con éxito`,
      icon: TrendingUp,
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.12)',
      border: 'rgba(168, 85, 247, 0.25)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
      }}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="glass-panel"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = card.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-card)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {card.title}
              </span>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: card.bg,
                  border: `1px solid ${card.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                }}
              >
                <Icon size={20} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {card.value}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {card.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
