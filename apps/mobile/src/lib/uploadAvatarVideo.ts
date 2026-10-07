import { ApiError } from "@unsaid/api-client";
import type { ProfileDto } from "@unsaid/shared";
import { loadToken } from "./api";
import { API_URL } from "./env";
import { AVATAR_VIDEO_MAX_SECONDS } from "./videoTrim";

/** Uploads a video; the server trims [start, start+duration] (max 5 s) and turns it into an animated avatar. */
export async function uploadAvatarVideo(uri: string, mimeType: string, start: number, duration: number): Promise<ProfileDto> {
  const FS = await import("expo-file-system/legacy");
  const token = await loadToken();
  const q = `start=${encodeURIComponent(String(start))}&duration=${encodeURIComponent(String(Math.min(duration, AVATAR_VIDEO_MAX_SECONDS)))}`;
  const res = await FS.uploadAsync(`${API_URL}/api/v1/profile/avatar-video?${q}`, uri, {
    httpMethod: "POST",
    uploadType: FS.FileSystemUploadType.MULTIPART,
    fieldName: "file",
    mimeType,
    headers: { accept: "application/json", "x-requested-with": "unsaid", "x-client": "mobile", ...(token ? { authorization: `Bearer ${token}` } : {}) }
  });
  let json: { error?: { code?: string; message?: string } } | null = null;
  try { json = JSON.parse(res.body); } catch { /* non-json */ }
  if (res.status >= 200 && res.status < 300 && json) return json as unknown as ProfileDto;
  throw new ApiError((json?.error?.code ?? "server_error") as ApiError["code"], json?.error?.message ?? `HTTP ${res.status}`, res.status);
}
