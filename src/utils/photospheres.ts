import fs from "node:fs/promises";
import path from "node:path";

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
    const stats = await fs.stat(path.join(photosphereDir, fileName));
    return {
      ...image,
      slug,
      fileName,
      sizeBytes: stats.size,
      sizeLabel: formatFileSize(stats.size),
    };
  });

  const photospheres = await Promise.all(files);

  return photospheres.sort((a, b) => a.fileName.localeCompare(b.fileName));
}
