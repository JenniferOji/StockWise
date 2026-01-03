export interface SectorAllocation {
  sector: string
  color?: string
}

export const INSIGHTS: SectorAllocation[] = [
  { sector: 'Technology', color: '#3b82f6' },
  { sector: 'Healthcare', color: '#10b981' },
  { sector: 'Financials', color: '#f59e0b' },
  { sector: 'Consumer Discretionary', color: '#ef4444' },
  { sector: 'Energy', color: '#8b5cf6' },
  { sector: 'Communication Services', color: '#6366f1' },
  { sector: 'Consumer Staples', color: '#eab308' },
  { sector: 'Industrials', color: '#06b6d4' },
  { sector: 'Utilities', color: '#d946ef' },
  { sector: 'Real Estate', color: '#f97316' },
  { sector: 'Materials', color: '#94a3b8' }
];