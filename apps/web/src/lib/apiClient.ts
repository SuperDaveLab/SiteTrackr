import { ACCESS_TOKEN_KEY } from './storageKeys';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';

const buildHeaders = (headers?: HeadersInit): Headers => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const result = new Headers(headers ?? {});
  result.set('Content-Type', 'application/json');
  if (token) {
    result.set('Authorization', `Bearer ${token}`);
  }
  return result;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.message ?? 'Request failed';
    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
};

const buildUrl = (path: string, params?: Record<string, unknown>): string => {
  if (!params) {
    return `${baseUrl}${path}`;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}${path}?${queryString}` : `${baseUrl}${path}`;
};

const request = async <T>(path: string, options: RequestInit & { params?: Record<string, unknown> }): Promise<T> => {
  const { params, ...fetchOptions } = options;
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    ...fetchOptions,
    headers: buildHeaders(fetchOptions.headers)
  });

  return handleResponse<T>(response);
};

export const apiClient = {
  get: <T>(path: string, options: { params?: Record<string, unknown> } & RequestInit = {}) => 
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options: RequestInit = {}) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    }),
  patch: <T>(path: string, body?: unknown, options: RequestInit = {}) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    }),
  put: <T>(path: string, body?: unknown, options: RequestInit = {}) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    })
};
