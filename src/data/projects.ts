export interface Project {
	slug: string;
	title: string;
	description: string;
	tags: readonly string[];
	image: string;
	url: string;
	year: string;
	role: string;
}

/**
 * Placeholder content. Replace every entry with real work before showing this
 * to a client.
 *
 * To use a photo: drop the file in `public/images/projects/` and point `image`
 * at it, e.g. `image: '/images/projects/northwind.jpg'`. Anything that renders
 * in an `<img>` works, so SVG, JPG, PNG and WebP are all fine. Keep the files
 * around 1600px wide and compressed — all 15 load on one page.
 *
 * `url` is the "View project" link inside the details view.
 */
export const projects: readonly Project[] = [
	{
		slug: 'northwind',
		title: 'Northwind Analytics',
		description:
			'A reporting surface that turns dense operational data into decisions a non-technical team can act on.',
		tags: ['Product design', 'Web app'],
		image: '/images/projects/northwind.svg',
		url: 'https://example.com/northwind',
		year: '2025',
		role: 'Design and build',
	},
	{
		slug: 'harbor',
		title: 'Harbor Booking',
		description:
			'Replaced a phone-only booking process with a self-serve flow, cutting abandoned reservations by a third.',
		tags: ['UX', 'Front-end'],
		image: '/images/projects/harbor.svg',
		url: 'https://example.com/harbor',
		year: '2025',
		role: 'Lead designer',
	},
	{
		slug: 'lumen',
		title: 'Lumen Health',
		description:
			'A patient portal designed for the worst day of someone’s life: plain language, no dead ends, works offline.',
		tags: ['Accessibility', 'Design system'],
		image: '/images/projects/lumen.svg',
		url: 'https://example.com/lumen',
		year: '2024',
		role: 'Design and build',
	},
	{
		slug: 'ember',
		title: 'Ember Commerce',
		description:
			'Headless storefront for a small-batch maker, rebuilt around a single editorial page per product.',
		tags: ['E-commerce', 'Art direction'],
		image: '/images/projects/ember.svg',
		url: 'https://example.com/ember',
		year: '2024',
		role: 'Design and build',
	},
	{
		slug: 'meadow',
		title: 'Meadow Learning',
		description:
			'Course platform where teachers build a lesson in ten minutes and students can resume on any device.',
		tags: ['EdTech', 'Product design'],
		image: '/images/projects/meadow.svg',
		url: 'https://example.com/meadow',
		year: '2024',
		role: 'Product designer',
	},
	{
		slug: 'atlas',
		title: 'Atlas Freight',
		description:
			'Live shipment tracking for a mid-size carrier, replacing a spreadsheet that three people maintained by hand.',
		tags: ['Logistics', 'Data viz'],
		image: '/images/projects/atlas.svg',
		url: 'https://example.com/atlas',
		year: '2024',
		role: 'Design and build',
	},
	{
		slug: 'quarry',
		title: 'Quarry Studio',
		description:
			'An asset pipeline for a brand team: one source of truth for logos, type and colour across forty products.',
		tags: ['Design system', 'Tooling'],
		image: '/images/projects/quarry.svg',
		url: 'https://example.com/quarry',
		year: '2023',
		role: 'Design systems',
	},
	{
		slug: 'solstice',
		title: 'Solstice Energy',
		description:
			'Household usage dashboard that shows what a kilowatt actually costs, in the moment rather than at bill time.',
		tags: ['Energy', 'Product design'],
		image: '/images/projects/solstice.svg',
		url: 'https://example.com/solstice',
		year: '2023',
		role: 'Product designer',
	},
	{
		slug: 'beacon',
		title: 'Beacon Support',
		description:
			'Helpdesk console rebuilt around response time instead of ticket count, which changed how the team behaved.',
		tags: ['SaaS', 'Front-end'],
		image: '/images/projects/beacon.svg',
		url: 'https://example.com/beacon',
		year: '2023',
		role: 'UX and front-end',
	},
	{
		slug: 'kestrel',
		title: 'Kestrel Field',
		description:
			'Offline-first inspection app for site engineers, built to survive gloves, glare and no signal.',
		tags: ['Mobile', 'Offline'],
		image: '/images/projects/kestrel.svg',
		url: 'https://example.com/kestrel',
		year: '2023',
		role: 'Design and build',
	},
	{
		slug: 'orchard',
		title: 'Orchard Market',
		description:
			'A grocery marketplace that lets small producers share one basket without competing for the same shelf.',
		tags: ['Marketplace', 'Product design'],
		image: '/images/projects/orchard.svg',
		url: 'https://example.com/orchard',
		year: '2022',
		role: 'Product designer',
	},
	{
		slug: 'foundry',
		title: 'Foundry Docs',
		description:
			'Documentation system for a platform team: versioned, searchable and generated from the code that ships.',
		tags: ['Docs', 'Design system'],
		image: '/images/projects/foundry.svg',
		url: 'https://example.com/foundry',
		year: '2022',
		role: 'Design and build',
	},
	{
		slug: 'tidewater',
		title: 'Tidewater Marine',
		description:
			'Fleet scheduling for a harbour operator, where a thirty-minute delay costs a whole day of berthing.',
		tags: ['Operations', 'Data viz'],
		image: '/images/projects/tidewater.svg',
		url: 'https://example.com/tidewater',
		year: '2022',
		role: 'UX and front-end',
	},
	{
		slug: 'cinder',
		title: 'Cinder Studio',
		description:
			'A component library for a studio that was rebuilding the same table, modal and form every project.',
		tags: ['Design system', 'Front-end'],
		image: '/images/projects/cinder.svg',
		url: 'https://example.com/cinder',
		year: '2022',
		role: 'Design systems',
	},
	{
		slug: 'lantern',
		title: 'Lantern Legal',
		description:
			'Case management for a small firm, designed around the timeline of a matter rather than a folder tree.',
		tags: ['Legal', 'Product design'],
		image: '/images/projects/lantern.svg',
		url: 'https://example.com/lantern',
		year: '2021',
		role: 'Product designer',
	},
];
