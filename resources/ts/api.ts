import type { Catalog, InventoryItem, ResolveResult, Room } from './types';

export interface SavedPlan {
    id: string;
    name: string;
    room: Room;
    items: InventoryItem[];
    settings: Record<string, unknown>;
    createdAt: string;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const response = await fetch(url, {
        method,
        headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const errors = (data as { errors?: Record<string, string[]> }).errors;
        const message = errors ? Object.values(errors).flat()[0] : (data as { message?: string }).message;
        throw new Error(message ?? `Request failed (${response.status})`);
    }
    return data as T;
}

export const api = {
    catalog: () => request<Catalog>('GET', '/api/catalog'),
    resolve: (urls: string[]) => request<ResolveResult>('POST', '/api/products/resolve', { urls }),
    loadPlan: (id: string) => request<SavedPlan>('GET', `/api/plans/${encodeURIComponent(id)}`),
    savePlan: (id: string | null, plan: Omit<SavedPlan, 'id' | 'createdAt'>) =>
        id ? request<SavedPlan>('PUT', `/api/plans/${encodeURIComponent(id)}`, plan) : request<SavedPlan>('POST', '/api/plans', plan),
};
