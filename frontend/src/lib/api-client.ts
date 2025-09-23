const fallbackBaseUrl = import.meta.env.DEV
  ? "http://localhost:5000/api"
  : "https://himal-nagrik-mono-mesr.vercel.app/api";

const resolveBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim();
  }

  return fallbackBaseUrl;
};

const normalizeBaseUrl = (base: string) => base.replace(/\/+$/, "");
const ensureLeadingSlash = (value: string) => (value.startsWith("/") ? value : `/${value}`);

export const API_BASE_URL = normalizeBaseUrl(resolveBaseUrl());

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
    this.name = "ApiError";
  }
}

const parseResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn("Failed to parse API response", error);
    return undefined;
  }
};

const normalizeHeaders = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Array.from(headers.entries()).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  return headers as Record<string, string>;
};

export type ApiRequestOptions<TBody = unknown> = Omit<RequestInit, "body"> & {
  json?: TBody;
};

export const apiRequest = async <TResponse, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {}
): Promise<TResponse> => {
  const { json, headers, ...rest } = options;
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...normalizeHeaders(headers),
  };

  const init: RequestInit = {
    ...rest,
    headers: requestHeaders,
  };

  if (json !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    init.body = JSON.stringify(json);
  }

  const response = await fetch(`${API_BASE_URL}${ensureLeadingSlash(path)}`, init);

  if (!response.ok) {
    const errorBody = await parseResponse(response);
    const message =
      (errorBody as { message?: string } | undefined)?.message ?? response.statusText;
    throw new ApiError(response.status, message, errorBody);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const data = (await parseResponse(response)) as TResponse | undefined;
  return data as TResponse;
};

