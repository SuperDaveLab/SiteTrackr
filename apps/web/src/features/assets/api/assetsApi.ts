import { apiClient } from '../../../lib/apiClient';

export interface AssetSummary {
  id: string;
  tag?: string;
  type: string;
  status: string;
}

export const fetchAssets = () => apiClient.get<AssetSummary[]>('/assets');
export const fetchAssetById = (assetId: string) => apiClient.get<AssetSummary>(`/assets/${assetId}`);
