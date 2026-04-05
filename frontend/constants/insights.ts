export interface SectorAllocation {
  sector: string
  color?: string
  description?: string
}

export const INSIGHTS: SectorAllocation[] = [
  { sector: 'Technology', color: '#3b82f6', description: 'Software, hardware, semiconductors, cloud platforms, and other digital infrastructure.' },
  { sector: 'Healthcare', color: '#10b981', description: 'Pharmaceuticals, biotech, medical devices, hospitals, and healthcare services.' },
  { sector: 'Financials', color: '#f59e0b', description: 'Banks, insurers, asset managers, payment networks, and other financial services.' },
  { sector: 'Consumer Discretionary', color: '#ef4444', description: 'Retail, travel, autos, media, and other spending-driven consumer businesses.' },
  { sector: 'Energy', color: '#8b5cf6', description: 'Oil, gas, renewables, exploration, production, and energy infrastructure.' },
  { sector: 'Communication Services', color: '#6366f1', description: 'Telecoms, internet platforms, streaming, advertising, and media companies.' },
  { sector: 'Consumer Staples', color: '#eab308', description: 'Everyday essentials like food, beverages, household goods, and personal care.' },
  { sector: 'Industrials', color: '#06b6d4', description: 'Manufacturing, transport, aerospace, logistics, and industrial services.' },
  { sector: 'Utilities', color: '#d946ef', description: 'Electricity, gas, water, and other essential utility services that support daily life.' },
  { sector: 'Real Estate', color: '#f97316', description: 'REITs, property ownership, development, and commercial or residential real estate.' },
  { sector: 'Materials', color: '#94a3b8', description: 'Chemicals, metals, mining, packaging, and other raw material producers.' }
];