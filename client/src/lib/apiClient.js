const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;

const normalizeBaseUrl = (value) => {
    if (!value || typeof value !== 'string') return '';
    return value.replace(/\/+$/, '');
};

const API_BASE_URL = normalizeBaseUrl(rawBaseUrl);

const isFormData = (value) =>
    typeof FormData !== 'undefined' && value instanceof FormData;

export async function apiFetch(path, options = {}) {
    const {
        method = 'GET',
        headers = {},
        body,
        auth = true,
        ...rest
    } = options;

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${API_BASE_URL}${normalizedPath}`;

    const nextHeaders = { ...headers };

    if (auth) {
        const token = localStorage.getItem('token');
        if (token) nextHeaders.Authorization = `Bearer ${token}`;
    }

    const hasBody = body !== undefined && body !== null;
    const sendingFormData = isFormData(body);

    if (hasBody && !sendingFormData && !nextHeaders['Content-Type']) {
        nextHeaders['Content-Type'] = 'application/json';
    }

    const requestBody = !hasBody
        ? undefined
        : sendingFormData
            ? body
            : nextHeaders['Content-Type'] === 'application/json' && typeof body !== 'string'
                ? JSON.stringify(body)
                : body;

    const res = await fetch(url, {
        method,
        headers: nextHeaders,
        body: requestBody,
        ...rest
    });

    const contentType = res.headers.get('content-type') || '';

    let data;
    if (contentType.includes('application/json')) {
        data = await res.json().catch(() => null);
    } else {
        data = await res.text().catch(() => null);
    }

    if (!res.ok) {
        const message =
            (data && typeof data === 'object' && (data.error || data.message)) ||
            (typeof data === 'string' && data) ||
            `Request failed (${res.status})`;

        const error = new Error(message);
        error.status = res.status;
        error.data = data;
        throw error;
    }

    return data;
}
