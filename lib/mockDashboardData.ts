// lib/mockDashboardData.ts
// Executive dashboard mock data — replace with real API calls later

// ── Types ──────────────────────────────────────────────────────────────

export interface KpiMetric {
    id: string;
    label: string;
    value: string;
    rawValue: number;
    change: number;       // percentage change (positive = good, negative = bad)
    changeLabel: string;
    invertChange?: boolean; // true = lower is better (e.g. fraud detected)
}

export interface TrendDataPoint {
    time: string;
    transactions: number;
    fraudAlerts: number;
}

export interface RiskDistributionPoint {
    label: string;
    value: number;
    color: string;
}

export type ClusterStatus = 'active' | 'contained' | 'monitoring';

export interface RiskCluster {
    clusterId: string;
    accountsInvolved: number;
    avgRiskScore: number;
    status: ClusterStatus;
    lastActivity: string;
}

// ── KPI Metrics ─────────────────────────────────────────────────────────

export const kpiMetrics: KpiMetric[] = [
    {
        id: 'total-transactions',
        label: 'Total Transactions Today',
        value: '94,852',
        rawValue: 94852,
        change: 12.4,
        changeLabel: 'vs yesterday',
    },
    {
        id: 'fraud-detected',
        label: 'Fraud Detected Today',
        value: '218',
        rawValue: 218,
        change: -6.2,
        changeLabel: 'vs yesterday',
        invertChange: true,
    },
    {
        id: 'fraud-prevented',
        label: 'Fraud Prevented',
        value: '$4.2M',
        rawValue: 4200000,
        change: 18.7,
        changeLabel: 'vs yesterday',
    },
    {
        id: 'active-clusters',
        label: 'Active Risk Clusters',
        value: '7',
        rawValue: 7,
        change: -1,
        changeLabel: 'vs yesterday',
        invertChange: true,
    },
];

// ── Fraud Trend Data (Last 24 hours, hourly) ─────────────────────────────

const now = new Date();
function hourLabel(hoursAgo: number): string {
    const d = new Date(now.getTime() - hoursAgo * 3600000);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const trendData: TrendDataPoint[] = [
    { time: hourLabel(23), transactions: 2840, fraudAlerts: 12 },
    { time: hourLabel(22), transactions: 3120, fraudAlerts: 18 },
    { time: hourLabel(21), transactions: 2980, fraudAlerts: 14 },
    { time: hourLabel(20), transactions: 3450, fraudAlerts: 22 },
    { time: hourLabel(19), transactions: 4200, fraudAlerts: 9 },
    { time: hourLabel(18), transactions: 5100, fraudAlerts: 31 },  // spike
    { time: hourLabel(17), transactions: 4820, fraudAlerts: 28 },
    { time: hourLabel(16), transactions: 4550, fraudAlerts: 15 },
    { time: hourLabel(15), transactions: 4310, fraudAlerts: 11 },
    { time: hourLabel(14), transactions: 3980, fraudAlerts: 19 },
    { time: hourLabel(13), transactions: 3760, fraudAlerts: 42 },  // spike
    { time: hourLabel(12), transactions: 4050, fraudAlerts: 35 },
    { time: hourLabel(11), transactions: 4230, fraudAlerts: 17 },
    { time: hourLabel(10), transactions: 3890, fraudAlerts: 8 },
    { time: hourLabel(9), transactions: 3540, fraudAlerts: 13 },
    { time: hourLabel(8), transactions: 3220, fraudAlerts: 56 },  // major spike
    { time: hourLabel(7), transactions: 4100, fraudAlerts: 48 },
    { time: hourLabel(6), transactions: 3980, fraudAlerts: 21 },
    { time: hourLabel(5), transactions: 3740, fraudAlerts: 14 },
    { time: hourLabel(4), transactions: 3560, fraudAlerts: 9 },
    { time: hourLabel(3), transactions: 3280, fraudAlerts: 11 },
    { time: hourLabel(2), transactions: 4020, fraudAlerts: 18 },
    { time: hourLabel(1), transactions: 3890, fraudAlerts: 23 },
    { time: hourLabel(0), transactions: 4150, fraudAlerts: 16 },
];

// ── Risk Distribution ─────────────────────────────────────────────────

export const riskDistribution: RiskDistributionPoint[] = [
    { label: 'Low', value: 68, color: '#52525b' },
    { label: 'Medium', value: 23, color: '#d97706' },
    { label: 'High', value: 9, color: '#dc2626' },
];

// ── Risk Clusters ─────────────────────────────────────────────────────

export const riskClusters: RiskCluster[] = [
    { clusterId: 'CLU-001', accountsInvolved: 5, avgRiskScore: 0.92, status: 'active', lastActivity: '2 min ago' },
    { clusterId: 'CLU-002', accountsInvolved: 12, avgRiskScore: 0.78, status: 'monitoring', lastActivity: '8 min ago' },
    { clusterId: 'CLU-003', accountsInvolved: 3, avgRiskScore: 0.85, status: 'active', lastActivity: '14 min ago' },
    { clusterId: 'CLU-004', accountsInvolved: 8, avgRiskScore: 0.61, status: 'monitoring', lastActivity: '31 min ago' },
    { clusterId: 'CLU-005', accountsInvolved: 21, avgRiskScore: 0.55, status: 'contained', lastActivity: '1 hr ago' },
    { clusterId: 'CLU-006', accountsInvolved: 6, avgRiskScore: 0.88, status: 'active', lastActivity: '4 min ago' },
    { clusterId: 'CLU-007', accountsInvolved: 9, avgRiskScore: 0.47, status: 'contained', lastActivity: '2 hr ago' },
];

// ── System Status ─────────────────────────────────────────────────────

export function getSystemStatus() {
    const highRisk = riskClusters.filter(c => c.avgRiskScore >= 0.8 && c.status === 'active');
    return {
        threatLevel: highRisk.length >= 2 ? 'High' : highRisk.length >= 1 ? 'Medium' : 'Low' as 'High' | 'Medium' | 'Low',
        lastUpdated: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        }),
    };
}
