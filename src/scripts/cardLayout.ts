import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import {
	clamp,
	fieldBounds,
	gridPlan,
	scatterPlan,
	type Box,
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
	/** Height the field needs, so the page can scroll to fit it. */
	fieldHeight: number;
	slots: Slot[];
	bounds: Box;
}

/** Below this rendered size a title is a smudge rather than a label. */
const MIN_TITLE_PX = 9;

export interface ArrangementOptions {
	fieldWidth: number;
	/** Shortest field to use, so a short grid still fills the screen. */
	minFieldHeight: number;
	count: number;
	/** Height / width. */
	ratio: number;
	/** Width the card element is laid out at, before scaling. */
	baseCardWidth: number;
	/** Rendered font size of the card title at base size. */
	titleSize: number;
	pad: number;
	seed: number;
}

function assemble(
	mode: Mode,
	options: ArrangementOptions,
	cardWidth: number,
	cardHeight: number,
	fieldHeight: number,
	placements: Array<{ x: number; y: number; rotation: number }>,
): Arrangement {
	const { fieldWidth, baseCardWidth, titleSize, pad } = options;
	const scale = baseCardWidth > 0 ? cardWidth / baseCardWidth : 1;

	return {
		mode,
		cardWidth,
		cardHeight,
		scale,
		// The type scales with the card, so what matters is what the title actually
		// renders at, not how wide the card is.
		compact: titleSize * scale < MIN_TITLE_PX,
		fieldHeight,
		slots: placements.map((placement, i) => ({ ...placement, zIndex: i + 1 })),
		bounds: fieldBounds(cardWidth, cardHeight, { width: fieldWidth, height: fieldHeight }, pad),
	};
}

export function gridArrangement(options: ArrangementOptions): Arrangement {
	const plan = gridPlan({
		fieldWidth: options.fieldWidth,
		count: options.count,
		ratio: options.ratio,
		pad: options.pad,
		minFieldHeight: options.minFieldHeight,
	});

	return assemble(
		'grid',
		options,
		plan.cardWidth,
		plan.cardHeight,
		plan.fieldHeight,
		plan.cells.map((cell) => ({ ...cell, rotation: 0 })),
	);
}

export function scatterArrangement(options: ArrangementOptions): Arrangement {
	/* The grid decides the card size and the scatter borrows it, so a project shows
	   its title in both arrangements or in neither. */
	const grid = gridPlan({
		fieldWidth: options.fieldWidth,
		count: options.count,
		ratio: options.ratio,
		pad: options.pad,
		minFieldHeight: options.minFieldHeight,
	});

	const plan = scatterPlan({
		fieldWidth: options.fieldWidth,
		count: options.count,
		cardWidth: grid.cardWidth,
		cardHeight: grid.cardHeight,
		pad: options.pad,
		minFieldHeight: options.minFieldHeight,
		seed: options.seed,
	});

	return assemble('scatter', options, grid.cardWidth, grid.cardHeight, plan.fieldHeight, plan.positions);
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
