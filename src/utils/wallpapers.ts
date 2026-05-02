import fs from "node:fs/promises";
import path from "node:path";

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
    const stats = await fs.stat(path.join(wallpaperDir, fileName));
    return {
      ...image,
      fileName,
      sizeBytes: stats.size,
      sizeLabel: formatFileSize(stats.size),
    };
  });

  const wallpapers = await Promise.all(files);

  return wallpapers.sort((a, b) => a.fileName.localeCompare(b.fileName));
}
