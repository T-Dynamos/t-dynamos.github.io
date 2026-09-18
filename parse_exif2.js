import exifr from 'exifr';
import fs from 'fs/promises';

const files = [
  'src/assets/images/wallpapers/IMG_20260916_150424953.jpg'
];

async function run() {
  for (const file of files) {
    const buffer = await fs.readFile(file);
    const data = await exifr.parse(buffer, { gps: true, exif: true });
    console.log(data.latitude, data.longitude, data.Make, data.Model);
  }
}
run();
