import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { bucket } from "./firebase-client.mjs";
import { deleteStudioProjectAssets } from "./cleanup.mjs";

export async function downloadAsset(asset, outputDir, prefix) {
  if (!asset?.storagePath) return null;
  const extension = path.extname(asset.name || asset.storagePath).slice(0, 10);
  const destination = path.join(outputDir, `${prefix}${extension || ""}`);
  await bucket.file(asset.storagePath).download({ destination });
  return { ...asset, localPath: destination };
}

export async function uploadRender(localPath, storagePath) {
  const token = crypto.randomUUID();
  const [file] = await bucket.upload(localPath, {
    destination: storagePath,
    resumable: false,
    metadata: { contentType: "video/mp4", cacheControl: "private,max-age=3600", metadata: { firebaseStorageDownloadTokens: token } }
  });
  const stats = await fs.stat(localPath);
  return { storagePath: file.name, size: stats.size, contentType: "video/mp4", fileName: path.basename(localPath) };
}

export async function uploadJson(value, storagePath) {
  const temporary = path.join(process.cwd(), `.studio-${crypto.randomUUID()}.json`);
  await fs.writeFile(temporary, JSON.stringify(value, null, 2));
  try { await bucket.upload(temporary, { destination: storagePath, resumable: false, metadata: { contentType: "application/json", cacheControl: "private,no-store" } }); }
  finally { await fs.rm(temporary, { force: true }); }
  return storagePath;
}

export async function downloadJson(storagePath) {
  const [contents] = await bucket.file(storagePath).download();
  return JSON.parse(contents.toString("utf8"));
}

export async function deleteProjectAssets(uid, projectId) {
  return deleteStudioProjectAssets(bucket, uid, projectId);
}
