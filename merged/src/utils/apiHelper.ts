export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    let parsedData: any = null;

    if (contentType.includes('application/json')) {
      parsedData = await res.json();
    } else {
      const text = await res.text();
      try {
        parsedData = JSON.parse(text);
      } catch {
        parsedData = { text };
      }
    }

    if (!res.ok) {
      const errorMsg =
        (parsedData && typeof parsedData === 'object' && (parsedData.error || parsedData.message)) ||
        `Request failed with status ${res.status}`;
      return {
        success: false,
        data: parsedData,
        error: errorMsg,
        status: res.status,
      };
    }

    return {
      success: true,
      data: parsedData,
      status: res.status,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network communication error',
      status: 0,
    };
  }
}
