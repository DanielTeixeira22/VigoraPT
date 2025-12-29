import { api } from './httpClient';

export interface BodyMetric {
    _id: string;
    userId: string;
    weight?: number;
    muscleMass?: number;
    completionLogId?: string;
    recordedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface CurrentMetrics {
    currentWeight: number | null;
    currentMuscleMass: number | null;
}

export const listBodyMetrics = async (limit = 30): Promise<BodyMetric[]> => {
    const { data } = await api.get<BodyMetric[]>('/body-metrics', { params: { limit } });
    return data;
};

export const recordBodyMetric = async (payload: {
    weight?: number;
    muscleMass?: number;
    completionLogId?: string;
}): Promise<BodyMetric> => {
    const { data } = await api.post<BodyMetric>('/body-metrics', payload);
    return data;
};

export const getCurrentMetrics = async (): Promise<CurrentMetrics> => {
    const { data } = await api.get<CurrentMetrics>('/body-metrics/current');
    return data;
};
