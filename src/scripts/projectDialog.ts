import { HOLD_EVENT, RELEASE_EVENT } from './cardSwap';

/**
 * One dialog holds every project's details; opening swaps which panel is shown.
 * Keeping the panels in the markup means no data is serialised into JS and
 * there is no HTML injection step.
 */
export function initProjectDialog(): void {
	const dialog = document.querySelector<HTMLDialogElement>('[data-project-dialog]');
	if (!dialog) return;

	const panels = Array.from(dialog.querySelectorAll<HTMLElement>('[data-detail]'));
	let opener: HTMLElement | null = null;

	const close = (): void => {
		if (dialog.open) dialog.close();
	};

	const open = (slug: string, trigger: HTMLElement): void => {
		// A scattered card can report the same tap twice: once through Draggable's
		// click detection, once through the browser. showModal() throws on an open
		// dialog, so the second one has to be a no-op.
		if (dialog.open) return;
		const panel = panels.find((candidate) => candidate.dataset.detail === slug);
		if (!panel) return;
		panels.forEach((candidate) => {
			candidate.hidden = candidate !== panel;
		});
		opener = trigger;
		dialog.showModal();
		document.dispatchEvent(new CustomEvent(HOLD_EVENT));
	};

	document.addEventListener('click', (event) => {
		const target = event.target as HTMLElement | null;
		if (!target) return;

		const trigger = target.closest<HTMLElement>('[data-project-open]');
		if (trigger) {
			open(trigger.dataset.projectOpen ?? '', trigger);
			return;
		}
		if (target.closest('[data-project-close]')) close();
	});

	/* A modal dialog reports backdrop clicks as clicks on the dialog itself,
	   which is the only way to dismiss by clicking outside. */
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) close();
	});

	dialog.addEventListener('close', () => {
		document.dispatchEvent(new CustomEvent(RELEASE_EVENT));
		opener?.focus();
		opener = null;
	});
}
