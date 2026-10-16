import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import {
	clamp,
	scatterCardWidth,
	scatterSlots,
	slotBounds,
	type ScatterSlot,
	type Size,
} from './cardGeometry';

gsap.registerPlugin(Draggable, InertiaPlugin);

export interface ScatterLayout {
	/** Visual size the cards are scaled down to. */
	cardWidth: number;
	cardHeight: number;
	/** Scale applied to the stack-sized card element. */
	scale: number;
	/** True when the cards are too small to carry readable text. */
	compact: boolean;
	slots: ScatterSlot[];
}

export interface ScatterLayoutOptions {
	field: Size;
	count: number;
	/** Stack reference ratio: height / width. */
	ratio: number;
	stackCardWidth: number;
	coverage: number;
	seed: number;
	pad: number;
	bottomBand: number;
	maxRotation: number;
	minCardWidth: number;
	maxCardWidth: number;
	/** Below this visual width, cards drop their text band. */
	compactBelow: number;
}

export function scatterLayout(options: ScatterLayoutOptions): ScatterLayout {
	const {
		field,
		count,
		ratio,
		stackCardWidth,
		coverage,
		seed,
		pad,
		bottomBand,
		maxRotation,
		minCardWidth,
		maxCardWidth,
		compactBelow,
	} = options;

	const cardWidth = scatterCardWidth(field, count, ratio, coverage, minCardWidth, maxCardWidth);
	const cardHeight = cardWidth * ratio;

	return {
		cardWidth,
		cardHeight,
		scale: stackCardWidth > 0 ? cardWidth / stackCardWidth : 1,
		compact: cardWidth < compactBelow,
		slots: scatterSlots({
			field,
			count,
			cardWidth,
			cardHeight,
			seed,
			pad,
			bottomBand,
			maxRotation,
		}),
	};
}

export interface DragConfig {
	cards: HTMLElement[];
	slots: ScatterSlot[];
	field: Size;
	pad: number;
	bottomBand: number;
	/** Fired when a card is pressed and released without really moving. */
	onActivate: (card: HTMLElement) => void;
	onPress: (card: HTMLElement) => void;
	onRelease: (card: HTMLElement) => void;
}

export interface DragController {
	kill(): void;
	/** Re-apply bounds after the field or the layout changed. */
	setBounds(slots: ScatterSlot[], field: Size, pad: number, bottomBand: number): void;
}

/**
 * One Draggable per card. `dragClickables` is essential here: every card is
 * covered edge-to-edge by its stretched button, and Draggable otherwise refuses
 * to start a drag on a button, which would silently kill dragging everywhere on
 * a card.
 */
export function createDrag(config: DragConfig): DragController {
	const { cards, slots, field, pad, bottomBand, onActivate, onPress, onRelease } = config;

	const instances = cards.map((card, i) =>
		Draggable.create(card, {
			type: 'x,y',
			bounds: slotBounds(slots[i]!, field, pad, bottomBand),
			inertia: true,
			dragClickables: true,
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
		setBounds(next, nextField, nextPad, nextBand) {
			instances.forEach((instance, i) =>
				instance.applyBounds(slotBounds(next[i]!, nextField, nextPad, nextBand)),
			);
		},
	};
}

/** Amount a card lifts towards the cursor while dragged. */
export const DRAG_LIFT = 1.04;

export function scaleBy(scale: number, factor: number): number {
	return clamp(scale * factor, 0.05, 4);
}
