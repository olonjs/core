'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeployPhase, ProjectState, StepId } from '@olonjs/core';
import { DEPLOY_STEPS, startCloudSaveStream } from '@olonjs/core';

export interface CloudSaveUiState {
	isOpen: boolean;
	phase: DeployPhase;
	currentStepId: StepId | null;
	doneSteps: StepId[];
	progress: number;
	errorMessage?: string;
	deployUrl?: string;
}

export type CloudSaveBaseline = {
	pages: Record<string, unknown>;
	site: unknown;
	menu: unknown;
	collections: Record<string, unknown>;
};

type SaveScope = 'page' | 'site' | 'menu' | 'collections';

type SaveCandidate = {
	path: string;
	content: unknown;
	scope: SaveScope;
};

export type CloudSaveStreamPlan = {
	path: string;
	content: unknown;
	additionalFiles: Array<{ path: string; content: unknown }>;
	changedScopes: Array<'page' | 'site' | 'menu'>;
	message: string;
};

function getInitialCloudSaveUiState(): CloudSaveUiState {
	return {
		isOpen: false,
		phase: 'idle',
		currentStepId: null,
		doneSteps: [],
		progress: 0,
	};
}

function stepProgress(doneSteps: StepId[]): number {
	return Math.round((doneSteps.length / DEPLOY_STEPS.length) * 100);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function stableStringify(value: unknown): string {
	return JSON.stringify(value);
}

function contentEquals(left: unknown, right: unknown): boolean {
	return stableStringify(left) === stableStringify(right);
}

function normalizePathSegments(value: string): string {
	return value
		.split('/')
		.map((segment) => segment.trim())
		.filter(Boolean)
		.join('/');
}

function resolveAdminContentSlug(basePath = '/'): string | null {
	if (typeof window === 'undefined') return null;

	const normalizedBase = basePath.replace(/\/+$/, '');
	let path = window.location.pathname;
	if (normalizedBase && normalizedBase !== '/' && path.startsWith(normalizedBase)) {
		path = path.slice(normalizedBase.length) || '/';
	}

	const slug = normalizePathSegments(path.replace(/^\/admin\/?/, ''));
	return slug || null;
}

function resolveTemplateParamValue(
	templateSlug: string,
	concreteSlug: string,
	paramKey: string,
): string | null {
	const templateSegments = normalizePathSegments(templateSlug).split('/').filter(Boolean);
	const concreteSegments = normalizePathSegments(concreteSlug).split('/').filter(Boolean);
	if (templateSegments.length !== concreteSegments.length) return null;

	for (let index = 0; index < templateSegments.length; index += 1) {
		const templateSegment = templateSegments[index];
		const concreteSegment = concreteSegments[index];
		const paramMatch = templateSegment.match(/^\[([A-Za-z0-9_-]+)\]$/);
		if (paramMatch?.[1] === paramKey) return concreteSegment;
		if (!paramMatch && templateSegment !== concreteSegment) return null;
	}

	return null;
}

function hasCollectionCurrentRef(value: unknown): boolean {
	if (Array.isArray(value)) return value.some(hasCollectionCurrentRef);
	if (!isRecord(value)) return false;
	if (value.$ref === 'collection:current') return true;
	return Object.values(value).some(hasCollectionCurrentRef);
}

function replaceCollectionCurrentRefs(value: unknown, currentItem: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => replaceCollectionCurrentRefs(item, currentItem));
	}
	if (!isRecord(value)) return value;
	if (value.$ref === 'collection:current') return cloneJson(currentItem);
	return Object.fromEntries(
		Object.entries(value).map(([key, entryValue]) => [
			key,
			replaceCollectionCurrentRefs(entryValue, currentItem),
		]),
	);
}

export function buildSaveStreamPagePayload(
	state: ProjectState,
	fallbackSlug: string,
): { slug: string; page: ProjectState['page'] } {
	const page = state.page;
	const collection = page.collection;
	if (!collection || !hasCollectionCurrentRef(page)) {
		return { slug: fallbackSlug, page };
	}

	const concreteSlug = resolveAdminContentSlug();
	if (!concreteSlug) {
		throw new Error('Cannot resolve concrete admin route for collection page save.');
	}

	const paramValue = resolveTemplateParamValue(page.slug, concreteSlug, collection.paramKey);
	if (!paramValue) {
		throw new Error(
			`Cannot resolve collection param "${collection.paramKey}" from route "${concreteSlug}".`,
		);
	}

	const collectionDocument = state.collections?.[collection.source];
	const currentItem = isRecord(collectionDocument)
		? collectionDocument[paramValue]
		: undefined;
	if (!currentItem) {
		throw new Error(
			`Cannot resolve collection item "${collection.source}/${paramValue}" for save.`,
		);
	}

	const resolvedPage = replaceCollectionCurrentRefs(page, currentItem) as ProjectState['page'];
	return {
		slug: concreteSlug,
		page: {
			...resolvedPage,
			slug: concreteSlug,
		},
	};
}

function buildCollectionCandidates(
	collections: ProjectState['collections'],
): SaveCandidate[] {
	if (!collections) return [];
	return Object.entries(collections).flatMap(([source, content]) => {
		const sourceSlug = String(source).replace(/[^a-zA-Z0-9-_]/g, '_');
		if (!sourceSlug) return [];
		return [
			{
				path: `src/data/collections/${sourceSlug}/${sourceSlug}.json`,
				content,
				scope: 'collections' as const,
			},
		];
	});
}

function pageKeyFromPath(filePath: string): string {
	return filePath.replace(/^src\/data\/pages\//, '').replace(/\.json$/, '');
}

function collectionSourceFromPath(filePath: string): string | null {
	const match = filePath.match(
		/^src\/data\/collections\/([^/]+)\/\1\.json$/,
	);
	return match?.[1] ?? null;
}

/**
 * Builds the save-stream file bundle.
 * When `baseline` is provided, only files that differ are included
 * (collection edits → collections/*.json only).
 */
export function buildCloudSaveStreamPlan(input: {
	state: ProjectState;
	slug: string;
	baseline?: CloudSaveBaseline | null;
}): CloudSaveStreamPlan {
	const { state, slug, baseline } = input;
	const isCollectionBoundPage = Boolean(
		state.page.collection && hasCollectionCurrentRef(state.page),
	);

	const candidates: SaveCandidate[] = [...buildCollectionCandidates(state.collections)];

	if (isCollectionBoundPage) {
		// Item SOT is the collection document; keep the authored template page
		// (with collection:current) rather than inlining a concrete page file.
		const templateSlug = normalizePathSegments(state.page.slug);
		candidates.push({
			path: `src/data/pages/${templateSlug}.json`,
			content: state.page,
			scope: 'page',
		});
	} else {
		const savePage = buildSaveStreamPagePayload(state, slug);
		candidates.push({
			path: `src/data/pages/${savePage.slug}.json`,
			content: savePage.page,
			scope: 'page',
		});
	}

	candidates.push(
		{ path: 'src/data/config/site.json', content: state.site, scope: 'site' },
		{ path: 'src/data/config/menu.json', content: state.menu, scope: 'menu' },
	);

	const selected = candidates.filter((candidate) => {
		if (!baseline) return true;

		if (candidate.scope === 'collections') {
			const source = collectionSourceFromPath(candidate.path);
			if (!source) return true;
			return !contentEquals(candidate.content, baseline.collections?.[source]);
		}
		if (candidate.scope === 'site') {
			return !contentEquals(candidate.content, baseline.site);
		}
		if (candidate.scope === 'menu') {
			return !contentEquals(candidate.content, baseline.menu);
		}
		const pageKey = pageKeyFromPath(candidate.path);
		return !contentEquals(candidate.content, baseline.pages?.[pageKey]);
	});

	if (selected.length === 0) {
		throw new Error('Nothing to save — no changes detected.');
	}

	const primary =
		selected.find((candidate) => candidate.scope === 'collections') ??
		selected.find((candidate) => candidate.scope === 'page') ??
		selected[0];

	const additionalFiles = selected
		.filter((candidate) => candidate !== primary)
		.map(({ path, content }) => ({ path, content }));

	const changedScopes = [
		...new Set(
			selected
				.map((candidate) => candidate.scope)
				.filter((scope): scope is 'page' | 'site' | 'menu' =>
					scope === 'page' || scope === 'site' || scope === 'menu',
				),
		),
	];

	const labels = selected.map((candidate) => {
		if (candidate.scope === 'collections') {
			return collectionSourceFromPath(candidate.path) ?? 'collections';
		}
		if (candidate.scope === 'page') return pageKeyFromPath(candidate.path);
		return candidate.scope;
	});

	return {
		path: primary.path,
		content: primary.content,
		additionalFiles,
		changedScopes,
		message: `Content update for ${labels.join(', ')} via Visual Editor`,
	};
}

export function applySuccessfulSaveToBaseline(
	baseline: CloudSaveBaseline,
	state: ProjectState,
	savedPaths: string[],
): CloudSaveBaseline {
	const next: CloudSaveBaseline = {
		pages: { ...baseline.pages },
		site: baseline.site,
		menu: baseline.menu,
		collections: { ...baseline.collections },
	};

	for (const filePath of savedPaths) {
		if (filePath === 'src/data/config/site.json') {
			next.site = cloneJson(state.site);
			continue;
		}
		if (filePath === 'src/data/config/menu.json') {
			next.menu = cloneJson(state.menu);
			continue;
		}
		const collectionSource = collectionSourceFromPath(filePath);
		if (collectionSource && state.collections?.[collectionSource] != null) {
			next.collections[collectionSource] = cloneJson(
				state.collections[collectionSource],
			);
			continue;
		}
		if (filePath.startsWith('src/data/pages/')) {
			const pageKey = pageKeyFromPath(filePath);
			if (isCollectionBoundPageState(state) && pageKey === normalizePathSegments(state.page.slug)) {
				next.pages[pageKey] = cloneJson(state.page);
			} else if (!isCollectionBoundPageState(state)) {
				next.pages[pageKey] = cloneJson(state.page);
			}
		}
	}

	return next;
}

function isCollectionBoundPageState(state: ProjectState): boolean {
	return Boolean(state.page.collection && hasCollectionCurrentRef(state.page));
}

export type UseCloudSaveOptions = {
	apiUrl: string;
	apiKey: string;
	/** Authored snapshot used to send only changed files. */
	baseline?: CloudSaveBaseline | null;
};

/**
 * Slim Save2Repo cold-save hook (alpha useCloudSave pattern).
 * HotSave is intentionally not included.
 */
export function useCloudSave({ apiUrl, apiKey, baseline = null }: UseCloudSaveOptions) {
	const [cloudSaveUi, setCloudSaveUi] = useState<CloudSaveUiState>(getInitialCloudSaveUiState);
	const activeCloudSaveController = useRef<AbortController | null>(null);
	const pendingCloudSave = useRef<{ state: ProjectState; slug: string } | null>(null);
	const baselineRef = useRef<CloudSaveBaseline | null>(
		baseline ? cloneJson(baseline) : null,
	);

	useEffect(() => {
		return () => {
			activeCloudSaveController.current?.abort();
		};
	}, []);

	const runCloudSave = useCallback(
		async (payload: { state: ProjectState; slug: string }, rejectOnError: boolean): Promise<void> => {
			if (!apiUrl || !apiKey) {
				const noCloudError = new Error('Cloud mode is not configured.');
				if (rejectOnError) throw noCloudError;
				return;
			}

			pendingCloudSave.current = payload;
			activeCloudSaveController.current?.abort();
			const controller = new AbortController();
			activeCloudSaveController.current = controller;

			setCloudSaveUi({
				isOpen: true,
				phase: 'running',
				currentStepId: null,
				doneSteps: [],
				progress: 0,
			});

			try {
				const plan = buildCloudSaveStreamPlan({
					state: payload.state,
					slug: payload.slug,
					baseline: baselineRef.current,
				});

				await startCloudSaveStream({
					apiBaseUrl: apiUrl,
					apiKey,
					path: plan.path,
					content: plan.content,
					additionalFiles: plan.additionalFiles,
					changedScopes: plan.changedScopes,
					message: plan.message,
					signal: controller.signal,
					onStep: (event) => {
						setCloudSaveUi((prev) => {
							if (event.status === 'running') {
								return {
									...prev,
									isOpen: true,
									phase: 'running',
									currentStepId: event.id,
									errorMessage: undefined,
								};
							}

							if (prev.doneSteps.includes(event.id)) {
								return prev;
							}

							const nextDone = [...prev.doneSteps, event.id];
							return {
								...prev,
								isOpen: true,
								phase: 'running',
								currentStepId: event.id,
								doneSteps: nextDone,
								progress: stepProgress(nextDone),
							};
						});
					},
					onDone: (event) => {
						const savedPaths = [
							plan.path,
							...plan.additionalFiles.map((file) => file.path),
						];
						if (baselineRef.current) {
							baselineRef.current = applySuccessfulSaveToBaseline(
								baselineRef.current,
								payload.state,
								savedPaths,
							);
						}

						const completed = DEPLOY_STEPS.map((step) => step.id);
						setCloudSaveUi({
							isOpen: true,
							phase: 'done',
							currentStepId: 'live',
							doneSteps: completed,
							progress: 100,
							deployUrl: event.deployUrl,
						});
					},
				});
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : 'Cloud save failed.';
				setCloudSaveUi((prev) => ({
					...prev,
					isOpen: true,
					phase: 'error',
					errorMessage: message,
				}));
				if (rejectOnError) throw new Error(message);
			} finally {
				if (activeCloudSaveController.current === controller) {
					activeCloudSaveController.current = null;
				}
			}
		},
		[apiUrl, apiKey],
	);

	const closeCloudDrawer = useCallback(() => {
		setCloudSaveUi(getInitialCloudSaveUiState());
	}, []);

	const retryCloudSave = useCallback(() => {
		if (!pendingCloudSave.current) return;
		void runCloudSave(pendingCloudSave.current, false);
	}, [runCloudSave]);

	return { cloudSaveUi, runCloudSave, closeCloudDrawer, retryCloudSave };
}
