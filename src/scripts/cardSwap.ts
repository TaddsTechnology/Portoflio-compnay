import gsap from 'gsap';
import type { Size } from './cardGeometry';
import {
	createDrag,
	DRAG_LIFT,
	gridArrangement,
	returnDuration,
	scatterArrangement,
	type Arrangement,
	type DragController,
	type Mode,
	type Slot,
} from './cardLayout';

interface Options {
	refWidth: number;
	refHeight: number;
	seed: number;
	startMode: Mode;
	/** `always` animates regardless of the OS motion setting. */
	motion: 'always' | 'system';
}

/* Cards are laid out at a share of the field and then scaled to an arrangement's
   size, which keeps the type in a readable range at every scale. */
const BASE_FIT = 0.9;
const BASE_SPREAD = 0.3;
const BASE_FRAME = 1.4;
const MIN_BASE_WIDTH = 240;

/* Inset from the field edges, and the band the floating controls need. */
const PAD = 24;
const DOCK_CLEARANCE = 20;

const TRANSITION_DURATION = 0.95;
const TRANSITION_STAGGER = 0.045;

/* Mobile browsers resize the viewport as the URL bar hides; ignore that. */
const HEIGHT_JITTER = 100;

const readNumber = (value: string | undefined, fallback: number): number => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

export function initCardSwap(root: HTMLElement): void {
	if (root.dataset.swapInit === 'true') return;
	root.dataset.swapInit = 'true';

	/* The controller is running, so the pre-script fallback list is no longer
	   needed — drop it before touching layout, or the cards stay position:static. */
	document.documentElement.classList.remove('swap-fallback');

	const stage = root.querySelector<HTMLElement>('.swap__stage');
	const clip = root.querySelector<HTMLElement>('.swap__clip');
	const dock = root.querySelector<HTMLElement>('.swap__dock');
	const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-card]'));
	const modeButton = root.querySelector<HTMLElement>('[data-swap-mode]');
	const shuffleButton = root.querySelector<HTMLElement>('[data-swap-shuffle]');

	if (!stage || !clip || cards.length === 0) return;

	const options: Options = {
		refWidth: readNumber(root.dataset.width, 1100),
		refHeight: readNumber(root.dataset.height, 870),
		seed: readNumber(root.dataset.seed, 7),
		startMode: root.dataset.mode === 'grid' ? 'grid' : 'scatter',
		motion: root.dataset.motion === 'system' ? 'system' : 'always',
	};
	const ratio = options.refHeight / options.refWidth;

	/* Slot position -> card index, so a shuffle only has to reorder this. */
	const order = cards.map((_, i) => i);

	let mode: Mode = options.startMode;
	let arranged: Arrangement | null = null;
	let drag: DragController | null = null;
	let dealer: gsap.core.Timeline | null = null;
	let baseCardWidth = options.refWidth;
	let titleSize = 0;
	let frame = 0;
	let lastClipWidth = 0;
	let lastViewportHeight = 0;
	let reduced =
		options.motion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const fieldBox = (): Size => ({ width: clip.clientWidth, height: clip.clientHeight });
	const bottomBand = (): number => (dock ? dock.offsetHeight + DOCK_CLEARANCE : DOCK_CLEARANCE);
	const slotIndexFor = (cardIndex: number): number => Math.max(0, order.indexOf(cardIndex));

	const heightBudget = (): number => {
		const parent = root.parentElement;
		const padding = parent
			? Number.parseFloat(getComputedStyle(parent).paddingTop) +
				Number.parseFloat(getComputedStyle(parent).paddingBottom)
			: 0;
		return window.innerHeight - (root.offsetHeight - stage.offsetHeight) - padding;
	};

	/* What the cards are laid out at before a mode scales them down. */
	const measure = (): void => {
		const available = fieldBox().width || options.refWidth;
		baseCardWidth = Math.max(
			MIN_BASE_WIDTH,
			Math.min(
				options.refWidth,
				available / (1 + BASE_SPREAD),
				(heightBudget() * BASE_FIT) / BASE_FRAME / ratio,
			),
		);
		root.style.setProperty('--card-w', `${baseCardWidth}px`);
		root.style.setProperty('--card-h', `${baseCardWidth * ratio}px`);

		/* Measured, not assumed: whether a card keeps its text depends on what the
		   title actually renders at, which is a function of the card's own width. */
		const title = cards[0]?.querySelector<HTMLElement>('.card__title');
		if (title) titleSize = Number.parseFloat(getComputedStyle(title).fontSize) || 0;
	};

	const buildArrangement = (target: Mode): Arrangement => {
		const shared = {
			field: fieldBox(),
			count: cards.length,
			ratio,
			baseCardWidth,
			titleSize,
			pad: PAD,
			bottomBand: bottomBand(),
			seed: options.seed,
		};
		/* The grid decides the card size and the scatter borrows it, so a project
		   shows its title in both arrangements or in neither. */
		const grid = gridArrangement(shared);
		return target === 'grid' ? grid : scatterArrangement({ ...shared, cardWidth: grid.cardWidth });
	};

	const style = (card: HTMLElement, slot: Slot, scale: number): void => {
		gsap.set(card, {
			x: slot.x,
			y: slot.y,
			z: 0,
			rotation: slot.rotation,
			scale,
			skewY: 0,
			xPercent: -50,
			yPercent: -50,
			transformOrigin: 'center center',
			zIndex: slot.zIndex,
			force3D: true,
		});
	};

	const placeAll = (plan: Arrangement): void => {
		order.forEach((cardIndex, position) =>
			style(cards[cardIndex]!, plan.slots[position]!, plan.scale),
		);
		cards.forEach((card) => {
			card.dataset.compact = String(plan.compact);
		});
		root.classList.add('swap--ready');
	};

	/* Route activation through the card's own button so the dialog keeps exactly
	   one entry point, whether the click came from Draggable or the browser. */
	function activate(card: HTMLElement): void {
		card.querySelector<HTMLElement>('[data-project-open]')?.click();
	}

	/* Pulled out of its cell, a card goes back to it: the grid stays a grid.
	   Distance scales the duration, so a nudge returns quickly and a throw takes
	   longer — momentum's deceleration, without letting a flick decide where the
	   card lands. */
	function sendHome(card: HTMLElement): void {
		if (mode !== 'grid' || !arranged) return;
		const index = cards.indexOf(card);
		if (index < 0) return;
		const slot = arranged.slots[slotIndexFor(index)]!;
		const distance = Math.hypot(
			(gsap.getProperty(card, 'x') as number) - slot.x,
			(gsap.getProperty(card, 'y') as number) - slot.y,
		);
		if (distance < 2) return;
		gsap.to(card, {
			x: slot.x,
			y: slot.y,
			duration: returnDuration(distance, arranged.scale),
			ease: 'power3.out',
		});
	}

	function liftCard(card: HTMLElement): void {
		card.dataset.dragging = 'true';
		if (!arranged) return;
		gsap.to(card, { scale: arranged.scale * DRAG_LIFT, duration: 0.25, ease: 'power2.out' });
	}

	function dropCard(card: HTMLElement): void {
		delete card.dataset.dragging;
		if (!arranged) return;
		gsap.to(card, { scale: arranged.scale, duration: 0.35, ease: 'power2.out' });
		sendHome(card);
	}

	const startDragging = (): void => {
		drag = createDrag({
			cards,
			bounds: arranged!.bounds,
			// Scattered cards fly where you throw them; grid cards go home.
			inertia: mode === 'scatter',
			onActivate: activate,
			onPress: liftCard,
			onRelease: dropCard,
		});
	};

	/* Move the deck into the current mode's arrangement. */
	const apply = (animate: boolean): void => {
		dealer?.kill();
		dealer = null;
		drag?.kill();
		drag = null;

		const plan = buildArrangement(mode);
		arranged = plan;
		cards.forEach((card) => {
			card.dataset.compact = String(plan.compact);
		});
		root.classList.toggle('is-grid', mode === 'grid');
		modeButton?.setAttribute('aria-pressed', String(mode === 'grid'));

		if (!animate) {
			placeAll(plan);
			startDragging();
			return;
		}

		order.forEach((cardIndex, position) =>
			gsap.set(cards[cardIndex]!, { zIndex: plan.slots[position]!.zIndex }),
		);
		dealer = gsap.timeline({
			onComplete: () => {
				dealer = null;
				root.classList.add('swap--ready');
				startDragging();
			},
		});
		dealer.to(cards, {
			x: (i: number) => plan.slots[slotIndexFor(i)]!.x,
			y: (i: number) => plan.slots[slotIndexFor(i)]!.y,
			rotation: (i: number) => plan.slots[slotIndexFor(i)]!.rotation,
			scale: plan.scale,
			z: 0,
			skewY: 0,
			duration: TRANSITION_DURATION,
			ease: 'power3.out',
			stagger: TRANSITION_STAGGER,
		});
	};

	const setMode = (next: Mode): void => {
		if (mode === next) return;
		mode = next;
		apply(!reduced);
	};

	/* Reassign which card sits where, then let the arrangement re-place them. */
	const shuffle = (): void => {
		for (let i = order.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			const swap = order[i]!;
			order[i] = order[j]!;
			order[j] = swap;
		}
		apply(!reduced);
	};

	const schedule = (): void => {
		if (frame) cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			frame = 0;
			lastClipWidth = Math.round(clip.clientWidth);
			lastViewportHeight = window.innerHeight;
			/* A transition owns the cards right now; a resize can land when it's done. */
			if (dealer?.isActive()) return;
			measure();
			apply(false);
		});
	};

	modeButton?.addEventListener('click', () => {
		setMode(mode === 'grid' ? 'scatter' : 'grid');
	});
	shuffleButton?.addEventListener('click', shuffle);

	window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
		reduced = options.motion === 'system' && event.matches;
	});

	/* Width only: the stage drives the clip height, so watching height too would
	   feed this observer its own output. */
	new ResizeObserver((entries) => {
		const width = Math.round(entries[0]?.contentRect.width ?? 0);
		if (width === lastClipWidth) return;
		schedule();
	}).observe(clip);

	window.addEventListener('resize', () => {
		if (Math.abs(window.innerHeight - lastViewportHeight) < HEIGHT_JITTER) return;
		schedule();
	});

	measure();
	apply(false);
	lastClipWidth = Math.round(clip.clientWidth);
	lastViewportHeight = window.innerHeight;
}

export function initCardSwaps(scope: ParentNode = document): void {
	scope.querySelectorAll<HTMLElement>('[data-card-swap]').forEach(initCardSwap);
}
