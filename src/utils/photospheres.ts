import fs from "node:fs/promises";
import path from "node:path";
import exifr from "exifr";

type PhotosphereImage = {
  src: string;
  width: number;
  height: number;
  format?: string;
};

export type PhotosphereItem = PhotosphereImage & {
  slug: string;
  fileName: string;
  sizeBytes: number;
  sizeLabel: string;
  description?: string;
  dateAdded: number;
};

const photosphereImages = import.meta.glob<PhotosphereImage>(
  "../assets/images/photospheres/*.{png,jpg,jpeg,webp,avif}",
  {
    eager: true,
    import: "default",
  }
);

const photosphereDir = path.join(
  process.cwd(),
  "src/assets/images/photospheres"
);

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function getPhotospheres(): Promise<PhotosphereItem[]> {
  const files = Object.entries(photosphereImages).map(async ([modulePath, image]) => {
    const fileName = path.basename(modulePath);
    const slug = fileName.replace(/\.[^/.]+$/, "");
    const filePath = path.join(photosphereDir, fileName);
    const stats = await fs.stat(filePath);
    
    let description = "";
    let dateAdded = stats.mtimeMs;
    
    try {
      const buffer = await fs.readFile(filePath);
      const exifData = await exifr.parse(buffer, { gps: true, exif: true });
      if (exifData) {
        const parts = [];
        if (exifData.Make || exifData.Model) {
          parts.push(`Shot on ${exifData.Make === 'Nothing' ? '' : (exifData.Make || '')} ${exifData.Model || ''}`.replace(/\s+/g, ' ').trim());
        }
        if (exifData.latitude && exifData.longitude) {
          const lat = exifData.latitude.toFixed(4);
          const lon = exifData.longitude.toFixed(4);
          parts.push(`Location: ${lat}, ${lon}`);
        }
        if (exifData.DateTimeOriginal) {
          dateAdded = new Date(exifData.DateTimeOriginal).getTime();
        } else if (exifData.CreateDate) {
          dateAdded = new Date(exifData.CreateDate).getTime();
        }
        description = parts.join(" • ");
      }
    } catch (e) {
      // Ignore if no exif or error parsing
    }

    return {
      ...image,
      slug,
      fileName,
      sizeBytes: stats.size,
      sizeLabel: formatFileSize(stats.size),
      description,
      dateAdded,
    };
  });

  const photospheres = await Promise.all(files);

  // Sort by date added descending (newest first)
  return photospheres.sort((a, b) => b.dateAdded - a.dateAdded);
}
