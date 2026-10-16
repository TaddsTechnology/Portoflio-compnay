import gsap from 'gsap';
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

/* Inset from the field edges. */
const PAD = 24;

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
	const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-card]'));
	const modeButton = root.querySelector<HTMLElement>('[data-swap-mode]');
	const shuffleButton = root.querySelector<HTMLElement>('[data-swap-shuffle]');

	if (!stage || !clip || cards.length === 0) return;

	const options: Options = {
		refWidth: readNumber(root.dataset.width, 1100),
		refHeight: readNumber(root.dataset.height, 870),
		seed: readNumber(root.dataset.seed, 7),
		startMode: root.dataset.mode === 'scatter' ? 'scatter' : 'grid',
		motion: root.dataset.motion === 'system' ? 'system' : 'always',
	};
	const ratio = options.refHeight / options.refWidth;

	/* Slot position -> card index, so a shuffle only has to reorder this. */
	const order = cards.map((_, i) => i);

	let mode: Mode = options.startMode;
	let arranged: Arrangement | null = null;
	let drag: DragController | null = null;
	let dealer: gsap.core.Timeline | null = null;
	let frame = 0;
	let lastClipWidth = 0;
	let lastViewportHeight = 0;
	let reduced =
		options.motion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* Cards are laid out at this size and then scaled to an arrangement's card
	   size, which keeps their type in a readable range at every scale. */
	const baseCardWidth =
		Number.parseFloat(getComputedStyle(root).getPropertyValue('--card-w')) || options.refWidth;

	/* Measured, not assumed: whether a card keeps its text depends on what the
	   title actually renders at, which is a function of the card's own width. */
	const titleElement = cards[0]?.querySelector<HTMLElement>('.card__title');
	const titleSize = titleElement
		? Number.parseFloat(getComputedStyle(titleElement).fontSize) || 0
		: 0;

	const pagePadding = (): number => {
		const parent = root.parentElement;
		return parent
			? Number.parseFloat(getComputedStyle(parent).paddingTop) +
					Number.parseFloat(getComputedStyle(parent).paddingBottom)
			: 0;
	};

	const fieldWidth = (): number => clip.clientWidth || options.refWidth;
	/* A short grid still fills the screen, so the page never looks half empty. */
	const minFieldHeight = (): number => Math.max(360, window.innerHeight - pagePadding());

	const buildArrangement = (target: Mode): Arrangement => {
		const shared = {
			fieldWidth: fieldWidth(),
			minFieldHeight: minFieldHeight(),
			count: cards.length,
			ratio,
			baseCardWidth,
			titleSize,
			pad: PAD,
			seed: options.seed,
		};
		return target === 'grid' ? gridArrangement(shared) : scatterArrangement(shared);
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
		const position = Math.max(0, order.indexOf(index));
		const slot = arranged.slots[position]!;
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
		/* The field grows to hold the arrangement; the page scrolls to fit it. */
		stage.style.height = `${plan.fieldHeight}px`;

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
			x: (i: number) => plan.slots[order.indexOf(i)]!.x,
			y: (i: number) => plan.slots[order.indexOf(i)]!.y,
			rotation: (i: number) => plan.slots[order.indexOf(i)]!.rotation,
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

	/* Width only: the field's height follows the arrangement, so watching that as
	   well would feed this observer its own output. */
	new ResizeObserver((entries) => {
		const width = Math.round(entries[0]?.contentRect.width ?? 0);
		if (width === lastClipWidth) return;
		schedule();
	}).observe(clip);

	window.addEventListener('resize', () => {
		if (Math.abs(window.innerHeight - lastViewportHeight) < HEIGHT_JITTER) return;
		schedule();
	});

	apply(false);
	lastClipWidth = Math.round(clip.clientWidth);
	lastViewportHeight = window.innerHeight;
}

export function initCardSwaps(scope: ParentNode = document): void {
	scope.querySelectorAll<HTMLElement>('[data-card-swap]').forEach(initCardSwap);
}
