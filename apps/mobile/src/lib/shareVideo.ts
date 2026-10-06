import { ApiError } from "@unsaid/api-client";
import { loadToken } from "./api";
import { API_URL } from "./env";

/** Uploads the captured card (PNG) and returns a local MP4 file the system share sheet can send to Instagram / TikTok. */
export async function makeCardVideo(pngUri: string): Promise<string> {
  const FS = await import("expo-file-system/legacy");
  const token = await loadToken();
  const res = await FS.uploadAsync(`${API_URL}/api/v1/share/video`, pngUri, {
    httpMethod: "POST",
    uploadType: FS.FileSystemUploadType.MULTIPART,
    fieldName: "file",
    mimeType: "image/png",
    headers: { accept: "application/json", "x-requested-with": "unsaid", "x-client": "mobile", ...(token ? { authorization: `Bearer ${token}` } : {}) }
  });
  let json: { url?: string; error?: { code?: string; message?: string } } | null = null;
  try { json = JSON.parse(res.body); } catch { /* non-json */ }
  if (res.status < 200 || res.status >= 300 || !json?.url) throw new ApiError((json?.error?.code ?? "server_error") as ApiError["code"], json?.error?.message ?? `HTTP ${res.status}`, res.status);
  const dest = `${FS.cacheDirectory}ear-card-${Date.now()}.mp4`;
  const dl = await FS.downloadAsync(json.url, dest);
  if (dl.status !== 200) throw new ApiError("server_error", `HTTP ${dl.status}`, dl.status);
  return dl.uri;
}
