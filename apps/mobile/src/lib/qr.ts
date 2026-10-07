import QRCode from "qrcode";

/** Builds the module matrix (true = dark). Exported for tests. */
export function qrMatrix(text: string): boolean[][] {
  const q = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = q.modules.size;
  const data = q.modules.data as ArrayLike<number>;
  return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => !!data[y * n + x]));
}
