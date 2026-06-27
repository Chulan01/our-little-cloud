import { createClient } from "@/lib/supabase/server";

export const MEDIA_BUCKET = "couple-media";

export type UploadPhotoInput = {
  coupleId: string;
  entity: "memories" | "capsules";
  entityId: string;
  file: File;
};

export type UploadedPhoto = {
  path: string;
  width: number | null;
  height: number | null;
};

function extensionFor(file: File): "jpg" | "png" | "webp" {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

/** Uploads a private photo under the couple-scoped storage prefix. */
export async function uploadPhoto(input: UploadPhotoInput): Promise<UploadedPhoto> {
  const supabase = createClient();
  const path = `${input.coupleId}/${input.entity}/${input.entityId}/${crypto.randomUUID()}.${extensionFor(input.file)}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, input.file, {
    contentType: input.file.type,
    upsert: false
  });

  if (error) {
    throw error;
  }

  return { path, width: null, height: null };
}

/** Deletes a private photo from Supabase Storage. */
export async function deletePhoto(path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}

/** Creates a short-lived signed URL for a private photo. */
export async function getSignedUrl(path: string, expiresInSeconds = 60 * 10): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) throw error ?? new Error("Signed URL is empty.");
  return data.signedUrl;
}
