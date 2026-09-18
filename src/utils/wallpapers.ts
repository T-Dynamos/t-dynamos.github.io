import fs from "node:fs/promises";
import path from "node:path";
import exifr from "exifr";

type WallpaperImage = {
  src: string;
  width: number;
  height: number;
  format?: string;
};

export type WallpaperItem = WallpaperImage & {
  fileName: string;
  sizeBytes: number;
  sizeLabel: string;
  description?: string;
  dateAdded: number;
};

const wallpaperImages = import.meta.glob<WallpaperImage>(
  "../assets/images/wallpapers/*.{png,jpg,jpeg,webp,avif}",
  {
    eager: true,
    import: "default",
  }
);

const wallpaperDir = path.join(
  process.cwd(),
  "src/assets/images/wallpapers"
);

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function getWallpapers(): Promise<WallpaperItem[]> {
  const files = Object.entries(wallpaperImages).map(async ([modulePath, image]) => {
    const fileName = path.basename(modulePath);
    const filePath = path.join(wallpaperDir, fileName);
    const stats = await fs.stat(filePath);
    
    let description = "";
    let dateAdded = stats.mtimeMs; // Default to file modification time
    
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
      fileName,
      sizeBytes: stats.size,
      sizeLabel: formatFileSize(stats.size),
      description,
      dateAdded,
    };
  });

  const wallpapers = await Promise.all(files);

  // Sort by date added descending (newest first)
  return wallpapers.sort((a, b) => b.dateAdded - a.dateAdded);
}
