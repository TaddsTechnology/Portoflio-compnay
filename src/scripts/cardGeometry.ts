/**
 * Geometry for the two deck arrangements — a scattered field and a grid. Pure:
 * numbers in, numbers out — no DOM, no GSAP, so a layout can be reasoned about
 * (and tuned) on its own.
 */

export interface Size {
	width: number;
	height: number;
}

/** A card's position, before a z-index is assigned. */
export interface Placement {
	x: number;
	y: number;
	rotation: number;
}

export interface Column {
	x: number;
	y: number;
}

export interface Plan {
	columns: number;
	rows: number;
	cardWidth: number;
	cardHeight: number;
	gap: number;
	cells: Column[];
}

export interface Box {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** Small, fast, seedable PRNG so a scatter is identical on every load. */
export function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/* -------------------------------------------------------------------- grid */

/* Gaps breathe with the field rather than switching at breakpoints. */
const GAP_RATIO = 0.02;
const GAP_MIN = 12;
const GAP_MAX = 28;

export interface GridOptions {
	field: Size;
	count: number;
	/** Height / width. */
	ratio: number;
	pad: number;
	/** Band kept clear at the bottom for the controls. */
	bottomBand: number;
}

/**
 * Every way `count` divides into a grid, best card size first.
 *
 * 15 factorises as 5x3 and 3x5, so there is always a complete grid with no empty
 * cells in either orientation. Rather than guessing which way round the screen
 * wants it, each candidate is sized and the one that yields the *largest card*
 * wins — which in practice picks 5x3 on a wide field and 3x5 on a tall one.
 */
export function gridPlan(options: GridOptions): Plan {
	const { field, count, ratio, pad, bottomBand } = options;
	const gap = Math.round(clamp(field.width * GAP_RATIO, GAP_MIN, GAP_MAX));

	const candidates: Array<{ columns: number; rows: number }> = [];
	for (let columns = 1; columns <= count; columns++) {
		if (count % columns === 0) candidates.push({ columns, rows: count / columns });
	}

	let best: Plan | null = null;
	for (const { columns, rows } of candidates) {
		const usableWidth = field.width - pad * 2 - gap * (columns - 1);
		const usableHeight = field.height - pad * 2 - bottomBand - gap * (rows - 1);
		if (usableWidth <= 0 || usableHeight <= 0) continue;

		const cardWidth = Math.min(usableWidth / columns, usableHeight / rows / ratio);
		if (best && cardWidth <= best.cardWidth) continue;

		const cardHeight = cardWidth * ratio;
		const blockWidth = cardWidth * columns + gap * (columns - 1);
		const blockHeight = cardHeight * rows + gap * (rows - 1);
		// Round the block, then centre it: equal margins on both sides is the whole
		// point of a symmetrical grid, so the cells are not individually rounded.
		const left = Math.round(-blockWidth / 2);
		const top = Math.round(-bottomBand / 2 - blockHeight / 2);

		const cells: Column[] = [];
		for (let row = 0; row < rows; row++) {
			for (let column = 0; column < columns; column++) {
				cells.push({
					x: left + cardWidth / 2 + column * (cardWidth + gap),
					y: top + cardHeight / 2 + row * (cardHeight + gap),
				});
			}
		}

		best = { columns, rows, cardWidth, cardHeight, gap, cells };
	}

	// Only reachable when the field is smaller than the padding, which cannot
	// happen in practice, but the caller should not have to handle null.
	return (
		best ?? {
			columns: 1,
			rows: count,
			cardWidth: 1,
			cardHeight: ratio,
			gap,
			cells: Array.from({ length: count }, () => ({ x: 0, y: 0 })),
		}
	);
}

/* ----------------------------------------------------------------- scatter */

/* Scatter tuning: how far a card tilts, and how many spots to try per card. */
const MAX_ROTATION = 14;
const CANDIDATES = 18;

/** Half-extents of a rotated rectangle. */
function extents(width: number, height: number, rotation: number): { halfW: number; halfH: number } {
	const rad = (Math.abs(rotation) * Math.PI) / 180;
	return {
		halfW: (width * Math.cos(rad) + height * Math.sin(rad)) / 2,
		halfH: (width * Math.sin(rad) + height * Math.cos(rad)) / 2,
	};
}

export interface ScatterOptions {
	field: Size;
	count: number;
	cardWidth: number;
	cardHeight: number;
	seed: number;
	pad: number;
	bottomBand: number;
}

/**
 * Best-candidate sampling (Mitchell): for each card, try several spots and keep
 * the one furthest from everything already placed. Organic but evenly spread —
 * uniform random clumps and leaves holes, which reads as sloppy rather than
 * scattered, and at any useful coverage a true collision-free packing is
 * impossible anyway.
 */
export function scatterPositions(options: ScatterOptions): Placement[] {
	const { field, count, cardWidth, cardHeight, seed, pad, bottomBand } = options;
	const random = mulberry32(seed);
	const placed: Array<{ x: number; y: number }> = [];
	const positions: Placement[] = [];

	for (let i = 0; i < count; i++) {
		const rotation = (random() * 2 - 1) * MAX_ROTATION;
		const { halfW, halfH } = extents(cardWidth, cardHeight, rotation);
		const minX = -field.width / 2 + pad + halfW;
		const maxX = field.width / 2 - pad - halfW;
		const minY = -field.height / 2 + pad + halfH;
		const maxY = field.height / 2 - pad - bottomBand - halfH;

		let best = { x: minX, y: minY };
		let bestDistance = -1;
		for (let c = 0; c < CANDIDATES; c++) {
			const x = minX + random() * Math.max(0, maxX - minX);
			const y = minY + random() * Math.max(0, maxY - minY);
			let nearest = Number.POSITIVE_INFINITY;
			for (const centre of placed) {
				const distance = Math.hypot(x - centre.x, y - centre.y);
				if (distance < nearest) nearest = distance;
			}
			if (nearest > bestDistance) {
				bestDistance = nearest;
				best = { x, y };
			}
		}

		placed.push(best);
		positions.push({ x: best.x, y: best.y, rotation });
	}

	return positions;
}

/* ------------------------------------------------------------------ shared */

/**
 * Drag bounds: the whole card stays in the field, and out of the band the
 * controls float over.
 */
export function fieldBounds(
	cardWidth: number,
	cardHeight: number,
	field: Size,
	pad: number,
	bottomBand: number,
): Box {
	return {
		minX: -field.width / 2 + pad + cardWidth / 2,
		maxX: field.width / 2 - pad - cardWidth / 2,
		minY: -field.height / 2 + pad + cardHeight / 2,
		maxY: field.height / 2 - pad - bottomBand - cardHeight / 2,
	};
}
