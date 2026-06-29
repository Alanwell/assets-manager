export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ApiClientOptions {
  baseUrl?: string;
  getAccessToken?: () => string | null;
  getRefreshToken?: () => string | null;
  onTokens?: (tokens: TokenPair) => void;
  onUnauthorized?: () => void;
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: HeadersInit;
  auth?: boolean;
  responseType?: 'json' | 'text' | 'blob';
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(private readonly options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '/api').replace(/\/$/, '');
  }

  get<T>(
    path: string,
    options: Omit<RequestOptions, 'method'> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  patch<T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  delete<T = void>(
    path: string,
    options: Omit<RequestOptions, 'method'> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.send(path, options);
    if (
      response.status === 401 &&
      options.auth !== false &&
      !path.startsWith('/auth/') &&
      (await this.refreshTokens())
    ) {
      return this.parseResponse<T>(
        await this.send(path, options),
        options.responseType,
      );
    }
    return this.parseResponse<T>(response, options.responseType);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const {
      body: requestBody,
      auth: _auth,
      responseType: _responseType,
      ...init
    } = options;
    void _auth;
    void _responseType;
    const headers = new Headers(options.headers);
    const accessToken = this.options.getAccessToken?.();
    if (options.auth !== false && accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    let body: BodyInit | undefined;
    if (requestBody instanceof FormData || requestBody instanceof Blob) {
      body = requestBody;
    } else if (requestBody !== undefined) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(requestBody);
    }
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      ...(body === undefined ? {} : { body }),
    });
  }

  private async refreshTokens(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.performRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<boolean> {
    const refreshToken = this.options.getRefreshToken?.();
    if (!refreshToken) {
      this.options.onUnauthorized?.();
      return false;
    }
    try {
      const response = await this.send('/auth/refresh', {
        method: 'POST',
        auth: false,
        body: { refreshToken },
      });
      const result = await this.parseResponse<TokenPair>(response, 'json');
      this.options.onTokens?.(result);
      return true;
    } catch {
      this.options.onUnauthorized?.();
      return false;
    }
  }

  private async parseResponse<T>(
    response: Response,
    responseType: RequestOptions['responseType'] = 'json',
  ): Promise<T> {
    if (!response.ok) {
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = undefined;
      }
      const record = isRecord(payload) ? payload : {};
      throw new ApiError(
        response.status,
        typeof record.code === 'string' ? record.code : 'HTTP_ERROR',
        typeof record.message === 'string'
          ? record.message
          : response.statusText,
        record.details,
      );
    }
    if (response.status === 204) return undefined as T;
    if (responseType === 'blob') return (await response.blob()) as T;
    if (responseType === 'text') return (await response.text()) as T;
    return (await response.json()) as T;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
