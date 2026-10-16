import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import {
	clamp,
	fieldBounds,
	gridPlan,
	scatterPositions,
	type Box,
	type Size,
} from './cardGeometry';

gsap.registerPlugin(Draggable, InertiaPlugin);

export type Mode = 'scatter' | 'grid';

/** Where one card sits in an arrangement. */
export interface Slot {
	x: number;
	y: number;
	rotation: number;
	zIndex: number;
}

export interface Arrangement {
	mode: Mode;
	/** Visual size the cards are scaled to. */
	cardWidth: number;
	cardHeight: number;
	/** Scale applied to the base-sized card element. */
	scale: number;
	/** True when the cards are too small to carry readable text. */
	compact: boolean;
	slots: Slot[];
	bounds: Box;
}

/** Below this rendered size a title is a smudge rather than a label, so the card
    shows its photo alone — the details view carries every word. */
const MIN_TITLE_PX = 9;

export interface ArrangementOptions {
	field: Size;
	count: number;
	/** Height / width. */
	ratio: number;
	/** Width the card element is laid out at, before scaling. */
	baseCardWidth: number;
	/** Rendered font size of the card title at base size. */
	titleSize: number;
	pad: number;
	bottomBand: number;
	seed: number;
}

function assemble(
	mode: Mode,
	options: ArrangementOptions,
	cardWidth: number,
	cardHeight: number,
	placements: Array<{ x: number; y: number; rotation: number }>,
): Arrangement {
	const { field, baseCardWidth, titleSize, pad, bottomBand } = options;
	const scale = baseCardWidth > 0 ? cardWidth / baseCardWidth : 1;

	return {
		mode,
		cardWidth,
		cardHeight,
		scale,
		// The type scales with the card, so what matters is what the title actually
		// renders at, not how wide the card is.
		compact: titleSize * scale < MIN_TITLE_PX,
		slots: placements.map((placement, i) => ({ ...placement, zIndex: i + 1 })),
		bounds: fieldBounds(cardWidth, cardHeight, field, pad, bottomBand),
	};
}

export interface ScatterOptions extends ArrangementOptions {
	/**
	 * Card size, normally taken from the grid. Both arrangements have to agree on
	 * it, or they disagree about whether a title is readable and the same project
	 * shows its name in one mode and not the other.
	 */
	cardWidth: number;
}

export function gridArrangement(options: ArrangementOptions): Arrangement {
	const plan = gridPlan({
		field: options.field,
		count: options.count,
		ratio: options.ratio,
		pad: options.pad,
		bottomBand: options.bottomBand,
	});

	return assemble(
		'grid',
		options,
		plan.cardWidth,
		plan.cardHeight,
		plan.cells.map((cell) => ({ ...cell, rotation: 0 })),
	);
}

export function scatterArrangement(options: ScatterOptions): Arrangement {
	const cardHeight = options.cardWidth * options.ratio;

	return assemble(
		'scatter',
		options,
		options.cardWidth,
		cardHeight,
		scatterPositions({
			field: options.field,
			count: options.count,
			cardWidth: options.cardWidth,
			cardHeight,
			seed: options.seed,
			pad: options.pad,
			bottomBand: options.bottomBand,
		}),
	);
}

export interface DragConfig {
	cards: HTMLElement[];
	bounds: Box;
	/** Scatter cards fly where you throw them; grid cards return to their cell. */
	inertia: boolean;
	onActivate: (card: HTMLElement) => void;
	onPress: (card: HTMLElement) => void;
	onRelease: (card: HTMLElement) => void;
}

export interface DragController {
	kill(): void;
}

/**
 * One Draggable per card. `dragClickables` is essential: every card is covered
 * edge-to-edge by its stretched button, and Draggable otherwise refuses to start
 * a drag on a button, which would silently kill dragging everywhere on a card.
 */
export function createDrag(config: DragConfig): DragController {
	const { cards, bounds, inertia, onActivate, onPress, onRelease } = config;

	const instances = cards.map((card) =>
		Draggable.create(card, {
			type: 'x,y',
			bounds,
			inertia,
			dragClickables: true,
			edgeResistance: 0.9,
			cursor: 'grab',
			activeCursor: 'grabbing',
			onPress() {
				onPress(card);
			},
			onRelease() {
				onRelease(card);
			},
			onClick() {
				onActivate(card);
			},
		})[0]!,
	);

	return {
		kill() {
			instances.forEach((instance) => instance.kill());
		},
	};
}

/** How much a card lifts while it is in hand. */
export const DRAG_LIFT = 1.05;

/** Snap-back duration, so a nudge returns quickly and a throw takes longer. */
export function returnDuration(distance: number, scale: number): number {
	return clamp(distance / (1600 * clamp(scale, 0.2, 1)), 0.35, 0.85);
}
