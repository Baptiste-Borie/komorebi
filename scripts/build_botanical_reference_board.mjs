import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const speciesId = process.argv[2] ?? 'quercus-robur';
const root = path.resolve('docs/botany/references', speciesId);
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const bundled = manifest.images.filter((image) => image.redistribution === 'bundled' && image.localPath);
if (bundled.length === 0) throw new Error(`${speciesId}: no bundled reference images`);

const width = 1800;
const height = 1260;
const margin = 36;
const header = 134;
const footer = 92;
const gap = 18;
const columns = 3;
const rows = Math.ceil(bundled.length / columns);
const cellWidth = Math.floor((width - margin * 2 - gap * (columns - 1)) / columns);
const cellHeight = Math.floor((height - header - footer - margin * 2 - gap * (rows - 1)) / rows);

const escapeXml = (text) => String(text).replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]);
const overlays = [];
for (let index = 0; index < bundled.length; index += 1) {
  const item = bundled[index];
  const col = index % columns;
  const row = Math.floor(index / columns);
  const left = margin + col * (cellWidth + gap);
  const top = margin + header + row * (cellHeight + gap);
  const labelHeight = 58;
  const image = await sharp(path.join(root, item.localPath))
    .resize(cellWidth, cellHeight - labelHeight, { fit: 'contain', background: '#ece8dc' })
    .jpeg({ quality: 88 })
    .toBuffer();
  overlays.push({ input: image, left, top });
  const label = `<svg width="${cellWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#283028"/><text x="14" y="23" fill="#f4f0e4" font-size="16" font-family="sans-serif" font-weight="700">${escapeXml(item.subjects.join(' · ').toUpperCase())}</text><text x="14" y="45" fill="#cbc8bc" font-size="13" font-family="sans-serif">${escapeXml(`${item.photographer} — ${item.license}`)}</text></svg>`;
  overlays.push({ input: Buffer.from(label), left, top: top + cellHeight - labelHeight });
}

const title = `<svg width="${width}" height="${height}"><text x="${margin}" y="70" fill="#263126" font-size="42" font-family="serif" font-weight="700">QUERCUS ROBUR L.</text><text x="${margin}" y="108" fill="#596459" font-size="21" font-family="sans-serif">BOTANICAL REFERENCE BOARD · MATURE OPEN-GROWN FORM</text><text x="${margin}" y="${height - 52}" fill="#596459" font-size="15" font-family="sans-serif">Visual index only · full source, author, licence and modification records in manifest.json</text><text x="${margin}" y="${height - 26}" fill="#596459" font-size="13" font-family="sans-serif">Each photograph retains its listed licence · board layout/captions CC BY-SA 4.0 · generated ${escapeXml(manifest.reviewedOn)}</text></svg>`;

await sharp({ create: { width, height, channels: 3, background: '#e7e2d4' } })
  .composite([{ input: Buffer.from(title), left: 0, top: 0 }, ...overlays])
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(path.join(root, 'reference-board.jpg'));

console.log(`Built ${path.join(root, 'reference-board.jpg')} from ${bundled.length} licensed references.`);
