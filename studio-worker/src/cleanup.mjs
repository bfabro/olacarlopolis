const safeIdentifier = (value, label) => {
  const normalized = String(value || "");
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(normalized)) throw new Error(`${label} inválido para exclusão segura.`);
  return normalized;
};

export function studioProjectPrefixes(uid, projectId) {
  const safeUid = safeIdentifier(uid, "UID");
  const safeProjectId = safeIdentifier(projectId, "Projeto");
  return ["originals", "logos", "music", "plans", "renders"].map((folder) => `studio/${safeUid}/${folder}/${safeProjectId}/`);
}

export async function deleteStudioProjectAssets(bucket, uid, projectId) {
  const prefixes = studioProjectPrefixes(uid, projectId);
  let deletedFiles = 0;
  for (const prefix of prefixes) {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      await file.delete({ ignoreNotFound: true });
      deletedFiles += 1;
    }
  }
  return { deletedFiles, prefixes };
}
