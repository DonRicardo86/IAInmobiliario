'use client';

import React from 'react';
import { LeadStats } from '@/core/types/lead';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/core/config/constants';
import { Filter, PieChart, Layers } from 'lucide-react';

interface PipelineDistributionProps {
  stats: LeadStats;
}

export const PipelineDistribution: React.FC<PipelineDistributionProps> = ({ stats }) => {
  const total = stats.total || 1;

  const funnelStages = [
    { key: 'nuevo', label: 'Nuevos', count: stats.byStatus.nuevo, cfg: STATUS_CONFIG.nuevo },
    { key: 'contactado', label: 'Contactados', count: stats.byStatus.contactado, cfg: STATUS_CONFIG.contactado },
    { key: 'interesado', label: 'Interesados', count: stats.byStatus.interesado, cfg: STATUS_CONFIG.interesado },
    { key: 'negociacion', label: 'En Negociación', count: stats.byStatus.negociacion, cfg: STATUS_CONFIG.negociacion },
    { key: 'cerrado', label: 'Cerrados Exitosos', count: stats.byStatus.cerrado, cfg: STATUS_CONFIG.cerrado },
  ];

  const totalOps = (stats.byOperation.compra || 0) + (stats.byOperation.arriendo || 0) || 1;
  const compraPercent = Math.round(((stats.byOperation.compra || 0) / totalOps) * 100);
  const arriendoPercent = 100 - compraPercent;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
      {/* Sales Funnel */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="var(--primary-light)" />
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Embudo de Conversión</h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Proceso comercial</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {funnelStages.map((stage) => {
            const percent = Math.round((stage.count / total) * 100);
            return (
              <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{stage.label}</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {stage.count} ({percent}%)
                  </span>
                </div>
                {/* Progress bar */}
                <div
                  style={{
                    height: '8px',
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(percent, stage.count > 0 ? 5 : 0)}%`,
                      backgroundColor: stage.cfg.color,
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.5s ease',
                      boxShadow: `0 0 8px ${stage.cfg.color}`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operation & Priority Distribution */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Operations */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Tipo de Operación</h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Compra vs Arriendo</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                height: '12px',
                width: `${compraPercent}%`,
                backgroundColor: '#10b981',
                borderRadius: 'var(--radius-sm)',
              }}
            />
            <div
              style={{
                height: '12px',
                width: `${arriendoPercent}%`,
                backgroundColor: '#6366f1',
                borderRadius: 'var(--radius-sm)',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>
              ● Compra ({stats.byOperation.compra || 0} - {compraPercent}%)
            </span>
            <span style={{ color: '#818cf8', fontWeight: 600 }}>
              ● Arriendo ({stats.byOperation.arriendo || 0} - {arriendoPercent}%)
            </span>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Clasificación de Calidad</h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Lead Scoring</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            {/* Alto */}
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: PRIORITY_CONFIG.alto.bg,
                border: `1px solid ${PRIORITY_CONFIG.alto.border}`,
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: PRIORITY_CONFIG.alto.color, fontWeight: 700, textTransform: 'uppercase' }}>
                🔥 Alta
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
                {stats.byPriority.alto}
              </div>
            </div>

            {/* Medio */}
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: PRIORITY_CONFIG.medio.bg,
                border: `1px solid ${PRIORITY_CONFIG.medio.border}`,
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: PRIORITY_CONFIG.medio.color, fontWeight: 700, textTransform: 'uppercase' }}>
                ⚡ Media
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
                {stats.byPriority.medio}
              </div>
            </div>

            {/* Bajo */}
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: PRIORITY_CONFIG.bajo.bg,
                border: `1px solid ${PRIORITY_CONFIG.bajo.border}`,
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: PRIORITY_CONFIG.bajo.color, fontWeight: 700, textTransform: 'uppercase' }}>
                ❄️ Baja
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
                {stats.byPriority.bajo}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
