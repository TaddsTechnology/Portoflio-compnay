/**
 * Geometry for the two deck arrangements — a scattered field and a grid. Pure:
 * numbers in, numbers out — no DOM, no GSAP.
 *
 * Neither arrangement is clamped to the viewport height. A grid of large cards is
 * allowed to run past the fold and the page scrolls; that is the trade for cards
 * big enough to read.
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

export interface Box {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

export interface Plan {
	columns: number;
	rows: number;
	cardWidth: number;
	cardHeight: number;
	gap: number;
	blockHeight: number;
	/** Height the field needs to hold this block with its padding. */
	fieldHeight: number;
	cells: Array<{ x: number; y: number }>;
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

/* Aim for a card about this wide. Scale with the field, within reason. */
const TARGET_RATIO = 0.22;
const TARGET_MIN = 150;
const TARGET_MAX = 280;

/* Never so small the cards stop being cards, never so large they look stranded. */
const CARD_MIN = 120;
const CARD_MAX = 360;

/* A grid that comes out even is worth a small miss on the target width. */
const COMPLETE_TOLERANCE = 60;

export interface GridOptions {
	fieldWidth: number;
	count: number;
	/** Height / width. */
	ratio: number;
	pad: number;
	/** Shortest field to use, so a short grid still fills the screen. */
	minFieldHeight: number;
}

/**
 * Column count from the width alone. Cards are sized to fill their columns, so
 * the only real choice is how many columns — and height never enters into it.
 */
export function gridPlan(options: GridOptions): Plan {
	const { fieldWidth, count, ratio, pad, minFieldHeight } = options;
	const gap = Math.round(clamp(fieldWidth * GAP_RATIO, GAP_MIN, GAP_MAX));
	const target = clamp(fieldWidth * TARGET_RATIO, TARGET_MIN, TARGET_MAX);
	const available = fieldWidth - pad * 2;

	const candidates: Array<{
		columns: number;
		rows: number;
		cardWidth: number;
		even: boolean;
	}> = [];

	for (let columns = 1; columns <= count; columns++) {
		// Card width only falls as columns rise, so the first failure ends the search.
		const cardWidth = Math.min((available - gap * (columns - 1)) / columns, CARD_MAX);
		if (cardWidth < CARD_MIN) break;
		candidates.push({
			columns,
			rows: Math.ceil(count / columns),
			cardWidth,
			even: count % columns === 0,
		});
	}

	// Field too narrow for even one card at minimum width: use the smallest we allow.
	if (candidates.length === 0) {
		candidates.push({ columns: 1, rows: count, cardWidth: CARD_MIN, even: true });
	}

	const even = candidates.filter(
		(candidate) => candidate.even && Math.abs(candidate.cardWidth - target) <= COMPLETE_TOLERANCE,
	);
	const pool = even.length > 0 ? even : candidates;

	const best = pool.reduce((a, b) => {
		const missA = Math.abs(a.cardWidth - target);
		const missB = Math.abs(b.cardWidth - target);
		if (missA !== missB) return missB < missA ? b : a;
		return b.columns > a.columns ? b : a;
	});

	const { columns, rows } = best;
	const cardWidth = best.cardWidth;
	const cardHeight = cardWidth * ratio;
	const blockHeight = cardHeight * rows + gap * (rows - 1);

	const cells: Plan['cells'] = [];
	for (let i = 0; i < count; i++) {
		const row = Math.floor(i / columns);
		const column = i % columns;
		// A part-filled last row is centred rather than left stranded.
		const inRow = Math.min(columns, count - row * columns);
		const rowWidth = cardWidth * inRow + gap * (inRow - 1);
		cells.push({
			x: -rowWidth / 2 + cardWidth / 2 + column * (cardWidth + gap),
			y: -blockHeight / 2 + cardHeight / 2 + row * (cardHeight + gap),
		});
	}

	return {
		columns,
		rows,
		cardWidth,
		cardHeight,
		gap,
		blockHeight,
		fieldHeight: Math.max(minFieldHeight, blockHeight + pad * 2),
		cells,
	};
}

/* ----------------------------------------------------------------- scatter */

/* Scatter tuning: how far a card tilts, how many spots to try, and how densely
   the deck is allowed to sit. */
const MAX_ROTATION = 14;
const CANDIDATES = 18;
const COVERAGE = 0.5;

export interface ScatterPlanOptions {
	fieldWidth: number;
	count: number;
	cardWidth: number;
	cardHeight: number;
	pad: number;
	minFieldHeight: number;
	seed: number;
}

export interface ScatterPlan {
	fieldHeight: number;
	positions: Placement[];
}

/** Half-extents of a rotated rectangle. */
function extents(width: number, height: number, rotation: number): { halfW: number; halfH: number } {
	const rad = (Math.abs(rotation) * Math.PI) / 180;
	return {
		halfW: (width * Math.cos(rad) + height * Math.sin(rad)) / 2,
		halfH: (width * Math.sin(rad) + height * Math.cos(rad)) / 2,
	};
}

/**
 * The scatter gets as much height as it needs to sit at a readable density, so
 * the cards stay the same size as the grid's and the page scrolls instead.
 */
export function scatterPlan(options: ScatterPlanOptions): ScatterPlan {
	const { fieldWidth, count, cardWidth, cardHeight, pad, minFieldHeight, seed } = options;
	const area = count * cardWidth * cardHeight;
	const needed = Math.round(area / COVERAGE / Math.max(1, fieldWidth)) + pad * 2;
	const fieldHeight = Math.max(minFieldHeight, needed);
	const random = mulberry32(seed);

	/* Best-candidate sampling (Mitchell): for each card, try several spots and keep
	   the one furthest from everything already placed. Uniform random clumps and
	   leaves holes, which reads as sloppy rather than scattered. */
	const placed: Array<{ x: number; y: number }> = [];
	const positions: Placement[] = [];

	for (let i = 0; i < count; i++) {
		const rotation = (random() * 2 - 1) * MAX_ROTATION;
		const { halfW, halfH } = extents(cardWidth, cardHeight, rotation);
		const minX = -fieldWidth / 2 + pad + halfW;
		const maxX = fieldWidth / 2 - pad - halfW;
		const minY = -fieldHeight / 2 + pad + halfH;
		const maxY = fieldHeight / 2 - pad - halfH;

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

	return { fieldHeight, positions };
}

/* ------------------------------------------------------------------ shared */

/** Drag bounds: the whole card stays inside the field. */
export function fieldBounds(
	cardWidth: number,
	cardHeight: number,
	field: Size,
	pad: number,
): Box {
	return {
		minX: -field.width / 2 + pad + cardWidth / 2,
		maxX: field.width / 2 - pad - cardWidth / 2,
		minY: -field.height / 2 + pad + cardHeight / 2,
		maxY: field.height / 2 - pad - cardHeight / 2,
	};
}
