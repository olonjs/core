import { describe, expect, it } from 'vitest';
import type { ProjectState } from '@olonjs/core';
import {
	buildCloudSaveStreamPlan,
	type CloudSaveBaseline,
} from './useCloudSave';

const baseline: CloudSaveBaseline = {
	pages: {
		home: {
			id: 'home-page',
			slug: 'home',
			sections: [],
		},
		'posts/[slug]': {
			id: 'post-detail-page',
			slug: 'posts/[slug]',
			collection: { source: 'posts', paramKey: 'slug' },
			sections: [
				{
					id: 'post-detail-body',
					type: 'post-detail',
					data: { item: { $ref: 'collection:current' } },
				},
			],
		},
	},
	site: { identity: { title: 'Inkwell' } },
	menu: { main: [] },
	collections: {
		posts: {
			'designing-with-constraints': {
				id: 'designing-with-constraints',
				title: 'Designing with constraints',
				tags: [{ $ref: '../tags/tags.json#/design' }],
			},
		},
		tags: {
			design: { id: 'design', name: 'Design' },
			engineering: { id: 'engineering', name: 'Engineering' },
		},
	},
};

function collectionBoundState(postsDoc: Record<string, unknown>): ProjectState {
	return {
		page: {
			id: 'post-detail-page',
			slug: 'posts/[slug]',
			collection: { source: 'posts', paramKey: 'slug' },
			sections: [
				{
					id: 'post-detail-body',
					type: 'post-detail',
					data: { item: { $ref: 'collection:current' } },
				},
			],
		},
		site: baseline.site as ProjectState['site'],
		menu: baseline.menu as ProjectState['menu'],
		theme: {} as ProjectState['theme'],
		collections: {
			posts: postsDoc,
			tags: baseline.collections.tags,
		},
	};
}

describe('buildCloudSaveStreamPlan', () => {
	it('sends only the changed collection document when tags are edited', () => {
		const nextPosts = {
			'designing-with-constraints': {
				id: 'designing-with-constraints',
				title: 'Designing with constraints',
				tags: [
					{ $ref: '../tags/tags.json#/design' },
					{ $ref: '../tags/tags.json#/engineering' },
				],
			},
		};

		const plan = buildCloudSaveStreamPlan({
			state: collectionBoundState(nextPosts),
			slug: 'posts/designing-with-constraints',
			baseline,
		});

		expect(plan.path).toBe('src/data/collections/posts/posts.json');
		expect(plan.content).toEqual(nextPosts);
		expect(plan.additionalFiles).toEqual([]);
		expect(plan.changedScopes).toEqual([]);
		expect(plan.message).toContain('posts');
		expect(plan.message).not.toContain('home');
	});

	it('includes page/site/menu only when they differ from baseline', () => {
		const state: ProjectState = {
			page: {
				id: 'home-page',
				slug: 'home',
				sections: [{ id: 'hero', type: 'hero', data: { title: 'Changed' } }],
			},
			site: baseline.site as ProjectState['site'],
			menu: baseline.menu as ProjectState['menu'],
			theme: {} as ProjectState['theme'],
			collections: baseline.collections,
		};

		const plan = buildCloudSaveStreamPlan({
			state,
			slug: 'home',
			baseline,
		});

		expect(plan.path).toBe('src/data/pages/home.json');
		expect(plan.additionalFiles).toEqual([]);
		expect(plan.changedScopes).toEqual(['page']);
	});
});
