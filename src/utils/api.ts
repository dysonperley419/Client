type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const request = async (
  endpoint: string,
  method: RequestMethod = 'GET',
  options: RequestOptions = {},
) => {
  const baseUrl = localStorage.getItem('selectedInstanceUrl') ?? '';
  const version = localStorage.getItem('defaultApiVersion') ?? '';
  const token = localStorage.getItem('Authorization') ?? '';
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanVersion = version.replace(/^\/+|\/+$/g, '');
  const cleanPath = endpoint.replace(/^\/+/, '');
  const fullUrlString = `${cleanBase}/${cleanVersion}/${cleanPath}`;
  const url = new URL(fullUrlString);

  if (options.params) {
    Object.entries(options.params).forEach(([key, val]) => {
      url.searchParams.append(key, val);
    });
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (options.body && !(options.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(options.body);
  } else if (options.body instanceof FormData) {
    if (fetchOptions.headers) {
      delete (fetchOptions.headers as any)['Content-Type']; //to-do get the type for this
    }

    fetchOptions.body = options.body;
  }

  const sendRequest = async (): Promise<any> => {
    const response = await fetch(url.toString(), fetchOptions);

    if (response.status === 429) {
      const data = await response.json();
      const retryAfter = (data.retry_after ?? 1) * 1000;

      console.warn(`Rate limited. Retrying after ${retryAfter}ms`); //Should we visually show the user this?

      await sleep(retryAfter);

      return sendRequest();
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Request failed with status ${response.status}`);

      (error as any).responseBody = errorData;

      throw error;
    }

    if (response.status === 204) {
      return null;
    }

    const json = await response.json();

    return json;
  };

  return sendRequest();
};

export const get = async (endpoint: string) => {
  return await request(endpoint);
};

export const post = async (endpoint: string, body: any, content_type = 'application/json') => {
  return await request(endpoint, 'POST', {
    headers: {
      'Content-Type': content_type,
    },
    body: body,
  });
};

export const patch = async (endpoint: string, body: any, content_type = 'application/json') => {
  return await request(endpoint, 'PATCH', {
    headers: {
      'Content-Type': content_type,
    },
    body: body,
  });
};

export const put = async (endpoint: string, body: any, content_type = 'application/json') => {
  return await request(endpoint, 'PUT', {
    headers: {
      'Content-Type': content_type,
    },
    body: body,
  });
};

export const del = async (endpoint: string) => {
  return await request(endpoint, 'DELETE');
};
