import gsap from 'gsap';
import { createDrag, scatterLayout, DRAG_LIFT, type DragController, type ScatterLayout } from './cardScatter';
import type { Size } from './cardGeometry';

/** Contract for anything that opens over the stack: broadcast these on
    `document` to stop the cycle while a panel is covering the cards. */
export const HOLD_EVENT = 'cardswap:hold';
export const RELEASE_EVENT = 'cardswap:release';

type Easing = 'linear' | 'elastic';

interface Options {
	refWidth: number;
	refHeight: number;
	spread: number;
	delay: number;
	skew: number;
	easing: Easing;
	pauseOnHover: boolean;
	/** `always` runs the cycle even when the OS asks for reduced motion.
	    `system` honours that preference and swaps instantly. */
	motion: 'always' | 'system';
	/** ms after mount before the deck deals itself out. 0 disables. */
	scatterAfter: number;
	coverage: number;
	seed: number;
	startScattered: boolean;
}

interface Slot {
	x: number;
	y: number;
	z: number;
	zIndex: number;
}

const TIMELINE = {
	elastic: {
		ease: 'elastic.out(0.6,0.9)',
		durDrop: 2,
		durMove: 2,
		durReturn: 2,
		promoteOverlap: 0.9,
		returnDelay: 0.05,
	},
	linear: {
		ease: 'power1.inOut',
		durDrop: 0.8,
		durMove: 0.8,
		durReturn: 0.8,
		promoteOverlap: 0.45,
		returnDelay: 0.2,
	},
} as const;

/* Default fan across the whole stack as a fraction of the card, and the slack
   the stage frame keeps around it (also the room the dropping card has before
   it leaves the clip). Only the per-card step changes with the count — scaling
   the *step* instead would throw the fifteenth card thousands of pixels back
   in z. */
const STACK_SPREAD = 0.3;
const FRAME_SLACK = 0.1;
const DROP_RATIO = 1.67;

/* Share of the available height the stack is allowed to use. Below 1 the
   composition keeps air above and below instead of touching the window edges. */
const VIEWPORT_FIT = 0.9;

/* Total stagger across a promote phase, in seconds, before the depth of the
   stack pushes it out. */
const STAGGER_TOTAL = 1.1;

/* Mobile browsers resize the viewport as the URL bar hides, which would
   re-scale the card mid-scroll. Ignore changes smaller than this. */
const HEIGHT_JITTER = 100;

/* Scatter tuning. Card width comes from the coverage target, clamped so it stays
   legible on a phone and doesn't balloon on a large display. */
const SCATTER_PAD = 24;
const SCATTER_CLEARANCE = 20;
const SCATTER_MIN_W = 132;
const SCATTER_MAX_W = 260;
const SCATTER_MAX_ROTATION = 14;
const DEAL_DURATION = 1.05;
const DEAL_STAGGER = 0.045;
/* Below this visual width the text band would render under ~8px, so cards drop
   it and show the photo alone — the details view carries the words. */
const COMPACT_BELOW = 180;
/* How long to wait before re-trying an auto-deal while the pointer is busy. */
const DEAL_RETRY = 800;

const makeSlot = (i: number, distX: number, distY: number, total: number): Slot => {
	// Offsetting by the stack's midpoint centres the group; the original only
	// grew right and up, which left the whole composition off-centre.
	const offset = i - (total - 1) / 2;
	return { x: offset * distX, y: -offset * distY, z: -i * distX * 1.5, zIndex: total - i };
};

const place = (el: HTMLElement, slot: Slot, skew: number): gsap.core.Tween =>
	gsap.set(el, {
		x: slot.x,
		y: slot.y,
		z: slot.z,
		rotation: 0,
		scale: 1,
		xPercent: -50,
		yPercent: -50,
		skewY: skew,
		transformOrigin: 'center center',
		zIndex: slot.zIndex,
		force3D: true,
	});

const readNumber = (value: string | undefined, fallback: number): number => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const pad = (n: number): string => String(n).padStart(2, '0');

export function initCardSwap(root: HTMLElement): void {
	if (root.dataset.swapInit === 'true') return;
	root.dataset.swapInit = 'true';

	const stage = root.querySelector<HTMLElement>('.swap__stage');
	const clip = root.querySelector<HTMLElement>('.swap__clip');
	const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-card]'));
	const ticks = Array.from(root.querySelectorAll<HTMLElement>('[data-swap-tick]'));
	const counter = root.querySelector<HTMLElement>('[data-swap-current]');
	const live = root.querySelector<HTMLElement>('[data-swap-live]');
	const dock = root.querySelector<HTMLElement>('.swap__dock');
	const modeButton = root.querySelector<HTMLElement>('[data-swap-mode]');
	const shuffleButton = root.querySelector<HTMLElement>('[data-swap-shuffle]');

	if (!stage || !clip || cards.length === 0) return;

	const options: Options = {
		refWidth: readNumber(root.dataset.width, 400),
		refHeight: readNumber(root.dataset.height, 300),
		spread: readNumber(root.dataset.spread, STACK_SPREAD),
		delay: readNumber(root.dataset.delay, 4000),
		skew: readNumber(root.dataset.skew, 4),
		easing: root.dataset.easing === 'linear' ? 'linear' : 'elastic',
		pauseOnHover: root.dataset.pauseOnHover !== 'false',
		motion: root.dataset.motion === 'system' ? 'system' : 'always',
		scatterAfter: readNumber(root.dataset.scatterAfter, 2600),
		coverage: readNumber(root.dataset.coverage, 0.42),
		seed: readNumber(root.dataset.seed, 7),
		startScattered: root.dataset.mode === 'scatter',
	};
	const timing = TIMELINE[options.easing];

	/* `order` maps slot position -> card index, so order[0] is the front card. */
	const order = cards.map((_, i) => i);

	let distX = 0;
	let distY = 0;
	let dropDistance = options.refHeight * DROP_RATIO;
	let stackCardWidth = options.refWidth;
	let active: gsap.core.Timeline | null = null;
	let timer = 0;
	let frame = 0;
	let lastClipWidth = 0;
	let lastViewportHeight = 0;
	let hovered = false;
	let focused = false;
	let covered = false;
	let mode: 'stack' | 'scatter' = 'stack';
	let scatter: ScatterLayout | null = null;
	let drag: DragController | null = null;
	let scatterShift = { x: 0, y: 0 };
	let seed = options.seed;
	let dealer: gsap.core.Timeline | null = null;
	let dealTimer = 0;
	let autoDealt = false;
	let reduced = options.motion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const slotAt = (slot: number): Slot => makeSlot(slot, distX, distY, cards.length);

	/* Tested at each tick rather than tracked by an IntersectionObserver: the
	   observer's first callback can land while the stage is still zero-area and
	   report not-intersecting forever after. */
	const onScreen = (): boolean => {
		const rect = root.getBoundingClientRect();
		return rect.bottom > 0 && rect.top < window.innerHeight;
	};

	/* The cycle only runs in the stack: once the cards are scattered they are
	   user-driven. `idle` is the looser question — "is anything in the way?" —
	   which is what the auto-deal waits on. */
	const idle = (): boolean => onScreen() && !document.hidden && !hovered && !focused && !covered;
	const running = (): boolean => mode === 'stack' && !reduced && idle();

	/* The stack has to fit the window as well as the column, so the card ends up
	   as large as the tighter of the two allows. Space taken by the dock and the
	   page padding is measured rather than assumed. */
	const heightBudget = (): number => {
		const parent = root.parentElement;
		const padding = parent
			? parseFloat(getComputedStyle(parent).paddingTop) +
				parseFloat(getComputedStyle(parent).paddingBottom)
			: 0;
		return window.innerHeight - (root.offsetHeight - stage.offsetHeight) - padding;
	};

	const layout = (): void => {
		const availableWidth = clip.clientWidth || options.refWidth;
		const availableHeight = heightBudget();
		const steps = Math.max(1, cards.length - 1);
		const ratio = options.refHeight / options.refWidth;
		/* Frame is derived from the spread so the fan is always contained,
		   whatever the deck depth or the spread works out to. */
		const frame = 1 + options.spread + FRAME_SLACK;
		const cardWidth = Math.max(
			200,
			Math.min(
				options.refWidth,
				availableWidth / (1 + options.spread),
				(availableHeight * VIEWPORT_FIT) / frame / ratio,
			),
		);
		const cardHeight = cardWidth * ratio;

		stackCardWidth = cardWidth;
		distX = (cardWidth * options.spread) / steps;
		distY = (cardHeight * options.spread) / steps;
		dropDistance = cardHeight * DROP_RATIO;

		root.style.setProperty('--card-w', `${cardWidth}px`);
		root.style.setProperty('--card-h', `${cardHeight}px`);
		root.style.setProperty('--dist-x', `${distX}px`);
		root.style.setProperty('--frame', String(frame));

		active?.kill();
		active = null;
		order.forEach((cardIndex, slot) => place(cards[cardIndex]!, slotAt(slot), options.skew));
		root.classList.add('swap--ready');
	};

	/* In the stack only the front card is live. Once scattered, every card is:
	   they are all individually reachable, and pointer-events must stay on or
	   they could not be dragged. */
	const setActive = (): void => {
		const front = order[0]!;
		cards.forEach((card, i) => {
			const isFront = mode === 'scatter' || i === front;
			card.dataset.active = String(isFront);
			card.toggleAttribute('inert', !isFront);
		});
		if (mode === 'scatter') return;
		ticks.forEach((tick, i) => tick.setAttribute('aria-current', String(i === front)));
		if (counter) counter.textContent = pad(front + 1);
		if (live) {
			live.textContent = `Project ${front + 1} of ${cards.length}: ${cards[front]!.dataset.title ?? ''}`;
		}
	};

	/* The signature move: the front card drops out and the rest step forward. */
	const cycle = (): void => {
		if (order.length < 2) return;
		const front = order[0]!;
		const rest = order.slice(1);
		const frontCard = cards[front]!;

		frontCard.dataset.active = 'false';

		const tl = gsap.timeline({
			onComplete: () => {
				order.push(order.shift()!);
				active = null;
				setActive();
			},
		});
		active = tl;

		tl.to(frontCard, { y: `+=${dropDistance}`, duration: timing.durDrop, ease: timing.ease });

		tl.addLabel('promote', `-=${timing.durDrop * timing.promoteOverlap}`);
		const stagger = Math.min(0.15, STAGGER_TOTAL / Math.max(1, cards.length - 1));
		rest.forEach((cardIndex, i) => {
			const slot = slotAt(i);
			const card = cards[cardIndex]!;
			tl.set(card, { zIndex: slot.zIndex }, 'promote');
			tl.to(
				card,
				{ x: slot.x, y: slot.y, z: slot.z, duration: timing.durMove, ease: timing.ease },
				`promote+=${i * stagger}`,
			);
		});

		const back = slotAt(cards.length - 1);
		tl.addLabel('return', `promote+=${timing.durMove * timing.returnDelay}`);
		tl.call(() => gsap.set(frontCard, { zIndex: back.zIndex }), undefined, 'return');
		tl.to(
			frontCard,
			{ x: back.x, y: back.y, z: back.z, duration: timing.durReturn, ease: timing.ease },
			'return',
		);
	};

	/* Used by the ticks and the prev/next buttons: bring a chosen card forward
	   as a shuffle rather than a drop, so the control matches the intent. */
	const jumpTo = (target: number, animate = true): void => {
		if (cards[target] === undefined || order[0] === target) return;

		active?.kill();
		active = null;

		const from = order.indexOf(target);
		order.push(...order.splice(0, from));
		setActive();

		const duration = animate && !reduced ? 0.6 : 0;

		order.forEach((cardIndex, slot) => {
			const card = cards[cardIndex]!;
			const destination = slotAt(slot);
			gsap.set(card, { zIndex: destination.zIndex });
			if (duration === 0) place(card, destination, options.skew);
			else
				gsap.to(card, {
					x: destination.x,
					y: destination.y,
					z: destination.z,
					duration,
					ease: 'power3.out',
				});
		});
	};

	const stopTimer = (): void => {
		if (timer) window.clearInterval(timer);
		timer = 0;
	};

	const startTimer = (): void => {
		stopTimer();
		timer = window.setInterval(() => {
			if (active?.isActive() || !running()) return;
			cycle();
		}, options.delay);
	};

	const sync = (): void => {
		if (running()) startTimer();
		else stopTimer();
	};

	const restart = (): void => {
		if (running()) startTimer();
	};

	const hold = (): void => {
		active?.pause();
		sync();
	};

	const release = (): void => {
		active?.play();
		restart();
	};

	/* -------------------------------------------------------------- scatter */

	const centreOf = (el: HTMLElement): { x: number; y: number } => {
		const rect = el.getBoundingClientRect();
		return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
	};

	const fieldBox = (): Size => ({ width: clip.clientWidth, height: clip.clientHeight });

	const bottomBand = (): number =>
		dock ? dock.offsetHeight + SCATTER_CLEARANCE : SCATTER_CLEARANCE;

	const scatterOptions = (field: Size) => ({
		field,
		count: cards.length,
		ratio: options.refHeight / options.refWidth,
		stackCardWidth,
		coverage: options.coverage,
		seed,
		pad: SCATTER_PAD,
		bottomBand: bottomBand(),
		maxRotation: SCATTER_MAX_ROTATION,
		minCardWidth: SCATTER_MIN_W,
		maxCardWidth: SCATTER_MAX_W,
		compactBelow: COMPACT_BELOW,
	});

	const updateDock = (): void => {
		modeButton?.setAttribute('aria-pressed', String(mode === 'scatter'));
	};

	/** Re-place the deck: instantly for resizes, animated for the shuffle. */
	const relayoutScatter = (animate = false): void => {
		if (mode !== 'scatter') return;
		const field = fieldBox();
		const next = scatterLayout(scatterOptions(field));
		scatter = next;

		cards.forEach((card, i) => {
			const slot = next.slots[i]!;
			card.dataset.compact = String(next.compact);
			gsap.set(card, { zIndex: slot.zIndex });
			if (!animate) {
				gsap.set(card, {
					x: slot.x,
					y: slot.y,
					rotation: slot.rotation,
					scale: next.scale,
				});
				return;
			}
			gsap.to(card, {
				x: slot.x,
				y: slot.y,
				rotation: slot.rotation,
				scale: next.scale,
				duration: 0.7,
				ease: 'power2.out',
				delay: i * 0.02,
			});
		});

		drag?.setBounds(next.slots, field, SCATTER_PAD, bottomBand());
	};

	/* Route activation through the card's own button so the dialog keeps exactly
	   one entry point, whether the click came from Draggable or the browser. */
	const activate = (card: HTMLElement): void => {
		card.querySelector<HTMLElement>('[data-project-open]')?.click();
	};

	const liftCard = (card: HTMLElement): void => {
		card.dataset.dragging = 'true';
		if (!scatter || mode !== 'scatter') return;
		gsap.to(card, { scale: scatter.scale * DRAG_LIFT, duration: 0.25, ease: 'power2.out' });
	};

	const dropCard = (card: HTMLElement): void => {
		delete card.dataset.dragging;
		if (!scatter || mode !== 'scatter') return;
		gsap.to(card, { scale: scatter.scale, duration: 0.35, ease: 'power2.out' });
	};

	const enterScatter = (animate: boolean): void => {
		if (mode === 'scatter') return;
		dealer?.kill();
		dealer = null;
		active?.kill();
		active = null;
		stopTimer();

		/* The fan is measured against the stack stage, the scatter against the whole
		   field. Read both centres across the size change and re-base the cards onto
		   the new origin, so nothing moves on the first frame of the deal. */
		const before = centreOf(stage);
		root.classList.add('is-scatter');
		const field = fieldBox();
		const after = centreOf(stage);
		scatterShift = { x: after.x - before.x, y: after.y - before.y };

		const next = scatterLayout(scatterOptions(field));
		scatter = next;
		cards.forEach((card) => {
			gsap.set(card, {
				x: (gsap.getProperty(card, 'x') as number) + scatterShift.x,
				y: (gsap.getProperty(card, 'y') as number) + scatterShift.y,
			});
			card.dataset.compact = String(next.compact);
		});

		mode = 'scatter';
		updateDock();
		setActive();

		const startDragging = (): void => {
			dealer = null;
			drag = createDrag({
				cards,
				slots: next.slots,
				field,
				pad: SCATTER_PAD,
				bottomBand: bottomBand(),
				onActivate: activate,
				onPress: liftCard,
				onRelease: dropCard,
			});
		};

		if (!animate) {
			next.slots.forEach((slot, i) => {
				gsap.set(cards[i]!, {
					x: slot.x,
					y: slot.y,
					z: 0,
					skewY: 0,
					rotation: slot.rotation,
					scale: next.scale,
					zIndex: slot.zIndex,
				});
			});
			startDragging();
			return;
		}

		next.slots.forEach((slot, i) => gsap.set(cards[i]!, { zIndex: slot.zIndex }));
		dealer = gsap.timeline({ onComplete: startDragging });
		dealer.to(cards, {
			x: (i: number) => next.slots[i]!.x,
			y: (i: number) => next.slots[i]!.y,
			rotation: (i: number) => next.slots[i]!.rotation,
			z: 0,
			skewY: 0,
			scale: next.scale,
			duration: DEAL_DURATION,
			ease: 'power3.out',
			stagger: DEAL_STAGGER,
		});
	};

	const leaveScatter = (animate: boolean): void => {
		if (mode !== 'scatter' || !scatter) return;
		dealer?.kill();
		dealer = null;
		drag?.kill();
		drag = null;
		stopTimer();

		const slotOfCard = new Map<number, number>();
		order.forEach((cardIndex, slot) => slotOfCard.set(cardIndex, slot));
		const target = (i: number) => slotAt(slotOfCard.get(i) ?? 0);

		cards.forEach((card) => {
			delete card.dataset.compact;
			delete card.dataset.dragging;
		});

		const finish = (): void => {
			root.classList.remove('is-scatter');
			mode = 'stack';
			scatter = null;
			layout();
			setActive();
			updateDock();
			sync();
		};

		if (!animate) {
			finish();
			return;
		}

		dealer = gsap.timeline({ onComplete: finish });
		dealer.to(cards, {
			x: (i: number) => target(i).x + scatterShift.x,
			y: (i: number) => target(i).y + scatterShift.y,
			z: (i: number) => target(i).z,
			rotation: 0,
			scale: 1,
			skewY: options.skew,
			duration: 0.9,
			ease: 'power3.inOut',
			stagger: 0.02,
		});
	};

	/* Deals itself once, and only when nothing is in the way — hovering, a focused
	   card or an open dialog pushes it back rather than yanking the deck away. */
	const armDeal = (): void => {
		if (options.scatterAfter <= 0 || autoDealt || mode === 'scatter' || reduced) return;
		window.clearTimeout(dealTimer);
		dealTimer = window.setTimeout(
			() => {
				if (autoDealt || mode === 'scatter') return;
				if (!idle()) {
					armDeal();
					return;
				}
				autoDealt = true;
				enterScatter(!reduced);
			},
			idle() ? options.scatterAfter : DEAL_RETRY,
		);
	};

	/* Touch devices fire mouseenter on tap and never fire mouseleave, which
	   would leave the cycle held forever after the first tap. */
	if (options.pauseOnHover && window.matchMedia('(hover: hover)').matches) {
		stage.addEventListener('mouseenter', () => {
			hovered = true;
			hold();
		});
		stage.addEventListener('mouseleave', () => {
			hovered = false;
			release();
		});
	}

	/* Only the cards hold the cycle, and only for keyboard focus: the dock is
	   explicit control, and pausing for mouse click-focus would leave the
	   carousel frozen once the pointer walked away. */
	stage.addEventListener('focusin', (event) => {
		focused = (event.target as Element | null)?.matches(':focus-visible') ?? false;
		if (!focused) return;
		hold();
	});
	stage.addEventListener('focusout', (event) => {
		if (stage.contains(event.relatedTarget as Node | null)) return;
		focused = false;
		release();
	});

	ticks.forEach((tick, i) => {
		tick.addEventListener('click', () => {
			jumpTo(i);
			restart();
		});
	});
	root.querySelector('[data-swap-next]')?.addEventListener('click', () => {
		jumpTo(order[1] ?? order[0]!);
		restart();
	});
	root.querySelector('[data-swap-prev]')?.addEventListener('click', () => {
		jumpTo(order[order.length - 1]!);
		restart();
	});

	modeButton?.addEventListener('click', () => {
		if (mode === 'scatter') leaveScatter(!reduced);
		else enterScatter(!reduced);
	});

	shuffleButton?.addEventListener('click', () => {
		if (mode !== 'scatter') return;
		seed = Math.floor(Math.random() * 1e9);
		relayoutScatter(!reduced);
	});

	document.addEventListener('visibilitychange', sync);
	window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
		reduced = options.motion === 'system' && event.matches;
		sync();
	});

	document.addEventListener(HOLD_EVENT, () => {
		covered = true;
		hold();
	});
	document.addEventListener(RELEASE_EVENT, () => {
		covered = false;
		release();
	});

	/* Only re-lay-out when the column width changes: the stage drives the clip
	   height, so watching height too would feed back into this observer. */
	const scheduleLayout = (): void => {
		if (frame) cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			frame = 0;
			lastClipWidth = Math.round(clip.clientWidth);
			lastViewportHeight = window.innerHeight;
			/* A transition owns the cards right now; a resize can land when it's done. */
			if (dealer?.isActive()) return;
			if (mode === 'scatter') relayoutScatter();
			else layout();
		});
	};

	/* Width only: the stage drives the clip height, so reacting to that as well
	   would feed this observer its own output. */
	new ResizeObserver((entries) => {
		const width = Math.round(entries[0]?.contentRect.width ?? 0);
		if (width === lastClipWidth) return;
		scheduleLayout();
	}).observe(clip);

	window.addEventListener('resize', () => {
		if (Math.abs(window.innerHeight - lastViewportHeight) < HEIGHT_JITTER) return;
		scheduleLayout();
	});

	layout();
	setActive();
	lastClipWidth = Math.round(clip.clientWidth);
	lastViewportHeight = window.innerHeight;
	updateDock();

	if (options.startScattered) {
		enterScatter(false);
	} else {
		sync();
		armDeal();
	}
}

export function initCardSwaps(scope: ParentNode = document): void {
	scope.querySelectorAll<HTMLElement>('[data-card-swap]').forEach(initCardSwap);
}
