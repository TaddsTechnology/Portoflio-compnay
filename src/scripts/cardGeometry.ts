/**
 * Geometry for a scattered field of cards. Pure: numbers in, numbers out — no
 * DOM, no GSAP, so the placement can be reasoned about (and tuned) on its own.
 */

export interface Size {
	width: number;
	height: number;
}

export interface ScatterSlot {
	/** Card centre, in the field's coordinate space (0,0 = field centre). */
	x: number;
	y: number;
	rotation: number;
	zIndex: number;
	/** Visual half-extents after rotation — how close the centre may sit to an edge. */
	halfW: number;
	halfH: number;
}

export interface Box {
	minX: number;
	/** Range the card centre may occupy. */
	maxX: number;
	minY: number;
	maxY: number;
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

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Card width that spreads `count` cards over roughly `coverage` of the field's
 * area. Above ~0.5 the deck reads as a solid block; below ~0.3 it looks sparse.
 */
export function scatterCardWidth(
	field: Size,
	count: number,
	ratio: number,
	coverage: number,
	min: number,
	max: number,
): number {
	if (field.width <= 0 || field.height <= 0) return min;
	const fitted = Math.sqrt((coverage * field.width * field.height) / Math.max(1, count * ratio));
	return Math.round(clamp(fitted, min, max));
}

/** Half-extents of a rotated rectangle. */
export function scatterExtents(
	width: number,
	height: number,
	rotation: number,
): { halfW: number; halfH: number } {
	const rad = (Math.abs(rotation) * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	return {
		halfW: (width * cos + height * sin) / 2,
		halfH: (width * sin + height * cos) / 2,
	};
}

export interface SlotOptions {
	field: Size;
	count: number;
	/** Visual card size, after any scale. */
	cardWidth: number;
	cardHeight: number;
	seed: number;
	/** Inset kept clear at the field edges. */
	pad: number;
	/** Band kept clear at the bottom for the controls. */
	bottomBand: number;
	maxRotation: number;
	/** Candidates per card for best-candidate sampling. */
	candidates?: number;
}

/**
 * Best-candidate sampling (Mitchell): for each card, try several spots and keep
 * the one furthest from everything already placed. Organic but evenly spread —
 * uniform random clumps and leaves holes, which reads as sloppy rather than
 * scattered, and at any useful coverage a true collision-free packing is
 * impossible anyway.
 */
export function scatterSlots(options: SlotOptions): ScatterSlot[] {
	const { field, count, cardWidth, cardHeight, seed, pad, bottomBand, maxRotation } = options;
	const candidates = Math.max(1, options.candidates ?? 18);
	const random = mulberry32(seed);
	const slots: ScatterSlot[] = [];
	const centres: Array<{ x: number; y: number }> = [];

	for (let i = 0; i < count; i++) {
		const rotation = (random() * 2 - 1) * maxRotation;
		const { halfW, halfH } = scatterExtents(cardWidth, cardHeight, rotation);
		const box = {
			minX: -field.width / 2 + pad + halfW,
			maxX: field.width / 2 - pad - halfW,
			minY: -field.height / 2 + pad + halfH,
			maxY: field.height / 2 - pad - bottomBand - halfH,
		};

		let best = { x: box.minX, y: box.minY };
		let bestDistance = -1;
		for (let c = 0; c < candidates; c++) {
			const x = box.minX + random() * Math.max(0, box.maxX - box.minX);
			const y = box.minY + random() * Math.max(0, box.maxY - box.minY);
			let nearest = Number.POSITIVE_INFINITY;
			for (const centre of centres) {
				const distance = Math.hypot(x - centre.x, y - centre.y);
				if (distance < nearest) nearest = distance;
			}
			if (nearest > bestDistance) {
				bestDistance = nearest;
				best = { x, y };
			}
		}

		centres.push(best);
		slots.push({ x: best.x, y: best.y, rotation, zIndex: i + 1, halfW, halfH });
	}

	return slots;
}

/**
 * Drag bounds for one card. A rotated card needs its rotated half-extents, not
 * its box — Draggable's own bounds would let a corner overhang.
 */
export function slotBounds(
	slot: ScatterSlot,
	field: Size,
	pad: number,
	bottomBand: number,
): Box {
	return {
		minX: -field.width / 2 + pad + slot.halfW,
		maxX: field.width / 2 - pad - slot.halfW,
		minY: -field.height / 2 + pad + slot.halfH,
		maxY: field.height / 2 - pad - bottomBand - slot.halfH,
	};
}
