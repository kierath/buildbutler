// All server calls go through here, so error handling lives in one place.
// Paths are relative ("/api/..."): Vite's proxy sends them on to Express.

export async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

export const postJSON = (path, body) => sendJSON('POST', path, body);
export const putJSON = (path, body) => sendJSON('PUT', path, body);

async function sendJSON(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  // The API sends { error } on failure, which is friendlier to show than a status code.
  if (!res.ok) throw new Error(data.error || `${path} returned ${res.status}`);
  return data;
}
