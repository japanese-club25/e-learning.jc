/**
 * Cloudinary image storage for exam question images.
 * Server-only: never import this from a client component.
 */

import { v2 as cloudinary } from "cloudinary";

export const QUESTION_IMAGE_FOLDER = "exam-questions";
// 4MB, not 5: serverless hosts (Vercel) reject request bodies above ~4.5MB
// before the handler ever runs, which would surface as an opaque 413.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export interface UploadedImage {
  url: string;
  publicId: string;
}

let configured = false;

function getClient() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
    );
  }

  if (!configured) {
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    configured = true;
  }

  return cloudinary;
}

/**
 * Validate an uploaded image at the trust boundary.
 * Returns an error message, or null when the file is acceptable.
 */
export function validateImageFile(file: File): string | null {
  if (file.size === 0) return "Image file is empty";
  if (file.size > MAX_IMAGE_BYTES) return "Image must not exceed 4MB";
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Image must be JPEG, PNG or WebP";
  }
  return null;
}

/** Upload an already-validated image file to Cloudinary. */
export async function uploadQuestionImage(file: File): Promise<UploadedImage> {
  const client = getClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const stream = client.uploader.upload_stream(
        { folder: QUESTION_IMAGE_FOLDER, resource_type: "image" },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(error ?? new Error("Cloudinary upload returned no result"));
            return;
          }
          resolve({
            secure_url: uploaded.secure_url,
            public_id: uploaded.public_id,
          });
        }
      );
      stream.end(buffer);
    }
  );

  return { url: result.secure_url, publicId: result.public_id };
}

/**
 * Best-effort delete. A failed cleanup must not fail the request that owns it,
 * otherwise the DB row and the asset drift apart in the worse direction.
 */
export async function deleteQuestionImage(publicId: string | null | undefined) {
  if (!publicId) return;
  try {
    await getClient().uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error("Cloudinary delete failed for", publicId, error);
  }
}
