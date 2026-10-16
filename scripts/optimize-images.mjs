// Resize and compress the project photos for the web.
//
//   node scripts/optimize-images.mjs
//
// Originals in public/images are left untouched. Optimised copies are written to
// public/images/optimized, and those are what the site serves.
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'public', 'images');
const dest = join(source, 'optimized');

const data = readFileSync(join(root, 'src', 'data', 'projects.ts'), 'utf8');
// Names come from the entries themselves; the source PNG shares the basename.
const names = [...data.matchAll(/image: '\/images\/optimized\/([^']+)\.webp'/g)].map(
	(match) => match[1],
);
if (names.length === 0) throw new Error('no project images found in src/data/projects.ts');

mkdirSync(dest, { recursive: true });

let before = 0;
let after = 0;
for (const name of names) {
	const input = join(source, `${name}.png`);
	if (!existsSync(input)) {
		console.warn(`skipped ${name}: no public/images/${name}.png to read`);
		continue;
	}
	const output = join(dest, `${name}.webp`);
	const result = await sharp(input)
		.resize({ width: 1600, withoutEnlargement: true })
		.webp({ quality: 82 })
		.toFile(output);

	const size = statSync(input).size;
	before += size;
	after += result.size;
	// Printed so a new project's entry can carry its width/height too.
	console.log(
		`${name}: ${Math.round(size / 1024)} KB -> ${Math.round(result.size / 1024)} KB  width: ${result.width}, height: ${result.height}`,
	);
}

console.log(
	`\n${names.length} images: ${(before / 1024 / 1024).toFixed(1)} MB -> ${(after / 1024 / 1024).toFixed(1)} MB`,
);
