export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  expectStatus?: number;
};

export const apiRequest = async <T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const { method = "GET", body, token, expectStatus } = options;
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (expectStatus !== undefined && response.status !== expectStatus) {
    const text = await response.text();
    throw new Error(
      `Expected ${expectStatus} from ${method} ${path}, got ${response.status}: ${text}`,
    );
  }
  if (response.status === 204) {
    return undefined as unknown as T;
  }
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
};
