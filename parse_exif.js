import exifr from 'exifr';
import fs from 'fs';

const files = [
  'src/assets/images/wallpapers/IMG_20260916_150424953.jpg',
  'src/assets/images/wallpapers/IMG_20260916_161301070.jpg',
  'src/assets/images/wallpapers/IMG_20260916_161335691.jpg',
  'src/assets/images/wallpapers/IMG_20260916_161350222.jpg'
];

async function run() {
  for (const file of files) {
    if (fs.existsSync(file)) {
      const gps = await exifr.gps(file);
      console.log(`${file}:`, gps);
    } else {
      console.log(`${file}: NOT FOUND`);
    }
  }
}
run();
