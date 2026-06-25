
// Makes an HTTP request with XMLHttpRequest and hands back a promise.
// The result looks a bit like fetch's Response (ok, status, json()).
export function httpRequest(url, { method = 'GET', headers = {}, body = null } = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);

        Object.keys(headers).forEach((key) => xhr.setRequestHeader(key, headers[key]));

        xhr.onload = () => {
            const text = xhr.responseText;
            resolve({
                ok: xhr.status >= 200 && xhr.status < 300,
                status: xhr.status,
                json: () => {
                    try {
                        return Promise.resolve(text ? JSON.parse(text) : null);
                    } catch (err) {
                        return Promise.reject(err);
                    }
                },
            });
        };

        xhr.onerror = () => reject(new Error('Network error'));

        xhr.send(body);
    });
}
