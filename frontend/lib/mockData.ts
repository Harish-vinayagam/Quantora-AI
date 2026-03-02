// lib/mockData.ts
// All graph and transaction mock data — swap with real API calls later

export type RiskLevel = 'low' | 'medium' | 'high';

export interface Transaction {
    id: string;
    senderId: string;
    receiverId: string;
    amount: number;
    timestamp: Date;
    risk: RiskLevel;
    isFraud?: boolean;
}

export interface GraphNode {
    id: string;
    label: string;
    risk: RiskLevel;
    isSuspicious?: boolean;
    group?: 'fraud-cluster' | 'normal';
    x?: number;
    y?: number;
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    amount: number;
    risk: RiskLevel;
}

// --- Fraud cluster node IDs ---
export const FRAUD_CLUSTER_IDS = ['A001', 'A002', 'A003', 'A004', 'A005'];

// --- Initial graph nodes ---
export const initialNodes: GraphNode[] = [
    // Fraud cluster (center)
    { id: 'A001', label: 'A001', risk: 'high', isSuspicious: true, group: 'fraud-cluster' },
    { id: 'A002', label: 'A002', risk: 'high', isSuspicious: true, group: 'fraud-cluster' },
    { id: 'A003', label: 'A003', risk: 'high', isSuspicious: true, group: 'fraud-cluster' },
    { id: 'A004', label: 'A004', risk: 'high', isSuspicious: true, group: 'fraud-cluster' },
    { id: 'A005', label: 'A005', risk: 'medium', isSuspicious: true, group: 'fraud-cluster' },

    // Normal outer ring
    { id: 'B001', label: 'B001', risk: 'low', group: 'normal' },
    { id: 'B002', label: 'B002', risk: 'low', group: 'normal' },
    { id: 'B003', label: 'B003', risk: 'low', group: 'normal' },
    { id: 'B004', label: 'B004', risk: 'medium', group: 'normal' },
    { id: 'B005', label: 'B005', risk: 'low', group: 'normal' },
    { id: 'B006', label: 'B006', risk: 'low', group: 'normal' },
    { id: 'B007', label: 'B007', risk: 'low', group: 'normal' },
    { id: 'B008', label: 'B008', risk: 'medium', group: 'normal' },
    { id: 'C001', label: 'C001', risk: 'low', group: 'normal' },
    { id: 'C002', label: 'C002', risk: 'low', group: 'normal' },
    { id: 'C003', label: 'C003', risk: 'low', group: 'normal' },
];

// --- Initial graph edges ---
export const initialEdges: GraphEdge[] = [
    // Fraud cluster internal
    { id: 'e1', source: 'A001', target: 'A002', amount: 42000, risk: 'high' },
    { id: 'e2', source: 'A002', target: 'A003', amount: 38000, risk: 'high' },
    { id: 'e3', source: 'A003', target: 'A004', amount: 51000, risk: 'high' },
    { id: 'e4', source: 'A004', target: 'A001', amount: 29000, risk: 'high' },
    { id: 'e5', source: 'A001', target: 'A005', amount: 17000, risk: 'medium' },
    { id: 'e6', source: 'A005', target: 'A003', amount: 23000, risk: 'medium' },

    // Fraud to normal bridges
    { id: 'e7', source: 'A002', target: 'B004', amount: 8500, risk: 'medium' },
    { id: 'e8', source: 'A005', target: 'B008', amount: 6200, risk: 'medium' },
    { id: 'e9', source: 'B004', target: 'A001', amount: 3100, risk: 'medium' },

    // Normal network
    { id: 'e10', source: 'B001', target: 'B002', amount: 1200, risk: 'low' },
    { id: 'e11', source: 'B002', target: 'B003', amount: 890, risk: 'low' },
    { id: 'e12', source: 'B003', target: 'B005', amount: 2400, risk: 'low' },
    { id: 'e13', source: 'B005', target: 'B006', amount: 670, risk: 'low' },
    { id: 'e14', source: 'B006', target: 'B007', amount: 1560, risk: 'low' },
    { id: 'e15', source: 'B001', target: 'C001', amount: 3400, risk: 'low' },
    { id: 'e16', source: 'C001', target: 'C002', amount: 780, risk: 'low' },
    { id: 'e17', source: 'C002', target: 'C003', amount: 1120, risk: 'low' },
    { id: 'e18', source: 'B007', target: 'C003', amount: 940, risk: 'low' },
];

// --- Initial transactions (pre-load) ---
const now = new Date();
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000);

export const initialTransactions: Transaction[] = [
    { id: 't1', senderId: 'A001', receiverId: 'A002', amount: 42000, timestamp: ago(2), risk: 'high', isFraud: true },
    { id: 't2', senderId: 'A002', receiverId: 'A003', amount: 38000, timestamp: ago(5), risk: 'high', isFraud: true },
    { id: 't3', senderId: 'B001', receiverId: 'B002', amount: 1200, timestamp: ago(7), risk: 'low' },
    { id: 't4', senderId: 'A003', receiverId: 'A004', amount: 51000, timestamp: ago(9), risk: 'high', isFraud: true },
    { id: 't5', senderId: 'B003', receiverId: 'B005', amount: 2400, timestamp: ago(12), risk: 'low' },
    { id: 't6', senderId: 'A005', receiverId: 'B008', amount: 6200, timestamp: ago(14), risk: 'medium' },
    { id: 't7', senderId: 'C001', receiverId: 'C002', amount: 780, timestamp: ago(18), risk: 'low' },
    { id: 't8', senderId: 'A004', receiverId: 'A001', amount: 29000, timestamp: ago(20), risk: 'high', isFraud: true },
];

// --- Randomized new transaction generator ---
const allIds = [...FRAUD_CLUSTER_IDS, 'B001', 'B002', 'B003', 'B004', 'B005', 'C001', 'C002', 'C003'];

function randomId(): string {
    return allIds[Math.floor(Math.random() * allIds.length)];
}

function randomAmount(risk: RiskLevel): number {
    if (risk === 'high') return Math.floor(Math.random() * 50000) + 20000;
    if (risk === 'medium') return Math.floor(Math.random() * 10000) + 2000;
    return Math.floor(Math.random() * 2000) + 200;
}

let txCounter = 100;

export function generateNewTransaction(): Transaction {
    const sender = randomId();
    let receiver = randomId();
    while (receiver === sender) receiver = randomId();

    const isFraudSender = FRAUD_CLUSTER_IDS.includes(sender);
    const isFraudReceiver = FRAUD_CLUSTER_IDS.includes(receiver);

    let risk: RiskLevel = 'low';
    if (isFraudSender && isFraudReceiver) risk = 'high';
    else if (isFraudSender || isFraudReceiver) risk = Math.random() > 0.5 ? 'medium' : 'high';

    return {
        id: `t${++txCounter}`,
        senderId: sender,
        receiverId: receiver,
        amount: randomAmount(risk),
        timestamp: new Date(),
        risk,
        isFraud: risk === 'high' && (isFraudSender || isFraudReceiver),
    };
}

export function generateNewEdge(tx: Transaction): GraphEdge {
    return {
        id: `edge-${tx.id}`,
        source: tx.senderId,
        target: tx.receiverId,
        amount: tx.amount,
        risk: tx.risk,
    };
}
