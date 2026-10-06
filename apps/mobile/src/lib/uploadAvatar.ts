import { ApiError } from "@unsaid/api-client";
import type { ProfileDto } from "@unsaid/shared";
import { api, loadToken } from "./api";
import { API_URL } from "./env";

/** Uploads through Android/iOS's native uploader (reliable with content:// URIs and big GIFs); falls back to the JS client. */
export async function uploadAvatar(uri: string, name: string, type: string): Promise<ProfileDto> {
  try {
    const FS = await import("expo-file-system/legacy");
    const token = await loadToken();
    const res = await FS.uploadAsync(`${API_URL}/api/v1/profile/avatar`, uri, {
      httpMethod: "POST",
      uploadType: FS.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType: type,
      headers: { accept: "application/json", "x-requested-with": "unsaid", "x-client": "mobile", ...(token ? { authorization: `Bearer ${token}` } : {}) }
    });
    let json: { error?: { code?: string; message?: string } } | null = null;
    try { json = JSON.parse(res.body); } catch { /* non-json */ }
    if (res.status >= 200 && res.status < 300 && json) return json as unknown as ProfileDto;
    throw new ApiError((json?.error?.code ?? "server_error") as ApiError["code"], json?.error?.message ?? `HTTP ${res.status}`, res.status);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const form = new FormData();
    form.append("file", { uri, name, type } as unknown as Blob);
    return api.profile.uploadAvatar(form);
  }
}
