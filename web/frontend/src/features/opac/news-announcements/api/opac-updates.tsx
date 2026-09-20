import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/use-auth';
import { useNotificationSummary } from '@/hooks/use-notification-summary';
import type { NewsItem, AnnouncementItem } from '@/features/opac/news-announcements/types/news-announcements-types';
import { callCirculation as callable } from "@/lib/api/callables";

function useUnreadUpdateIds(): [string[], () => void] {
	const { user, userType } = useAuth();
	const [ids, setIds] = useState<string[]>([]);

	const isPatron = Boolean(user) && userType === 'Patron';
	const uid = user?.uid ?? '';

	const refresh = useCallback(async () => {
		if (!isPatron || !uid) {
			setIds([]);
			return;
		}
		try {
						const res = await callable({ case: 'unread_update_ids', uid });
			const list = ((res.data as { ids?: unknown })?.ids ?? []) as unknown[];
			setIds(list.map((id) => String(id)));
		} catch (error) {
			console.error('Could not read which updates are unread:', error);
		}
	}, [isPatron, uid]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return [ids, refresh];
}

export default function useOpacUpdates() {
	const [loading, setLoading] = useState(true);

	const [news, setNews] = useState<NewsItem[]>([]);
	const [showNewsModal, setShowNewsModal] = useState(false);
	const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

	const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
	const [showAnnModal, setShowAnnModal] = useState(false);
	const [selectedAnn, setSelectedAnn] = useState<AnnouncementItem | null>(null);

	const [unreadUpdateIds, refreshUnreadUpdates] = useUnreadUpdateIds();

	const [locallyRead, setLocallyRead] = useState<string[]>([]);
	const unreadIds = unreadUpdateIds.filter((id) => !locallyRead.includes(id));

	const dropUnread = useCallback((id: string) => {
		setLocallyRead((current) => (current.includes(id) ? current : [...current, id]));
	}, []);

	const { markUpdateRead, markAllRead } = useNotificationSummary();

	const [searchModalOpen, setSearchModalOpen] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	const location = useLocation();
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	const load = useCallback(async (force = false) => {
			try {
				const { cachedFetch } = await import('@/lib/fetching-data-cache');

				const [newsData, annData] = await Promise.all([
					cachedFetch('fetchNewsData', {}, { force }),
					cachedFetch('fetchAnnouncementData', {}, { force }),
				]);

				const newsDataArr = Array.isArray(newsData) ? newsData : [];
				const mappedNews: NewsItem[] = newsDataArr.map((n: any) => ({
					id: String(n.id || ''),
					title: String(n.Title ?? n.title ?? ''),
					description: String(n.Description ?? n.description ?? ''),
					imageUrl: (n.ImageURL ?? n.imageUrl) || undefined,
					tags: Array.isArray(n.Tags) ? n.Tags : [],
					createdOn: { toDate: () => new Date(Number(n.CreatedOn ?? n.createdOn ?? Date.now())) },
					url: (n.URL ?? n.url) || undefined,
					mainAuthor: (n.MainAuthor ?? n.mainAuthor) || undefined,
					location: (n.Location ?? n.location) || undefined,
					viewCount: Number(n.ViewCount ?? n.viewCount ?? 0),
				} as NewsItem));

				const annDataArr = Array.isArray(annData) ? annData : [];
				const topLevel: AnnouncementItem[] = [];
				const replies: AnnouncementItem[] = [];
				annDataArr.forEach((x: any) => {
					if (!x) return;
					const parentId = String(x.ParentID ?? x.parentId ?? '');
					if (!parentId) {
						topLevel.push({
							id: String(x.id || ''),
							subject: String(x.Subject ?? x.subject ?? ''),
							message: String(x.Message ?? x.message ?? ''),
							files: Array.isArray(x.Files) ? x.Files.map((f: any) => ({ url: String(f.URL ?? f.url ?? ''), name: String(f.Name ?? f.name ?? '') })) : [],
							createdOn: (x.CreatedOn ?? x.createdOn) != null ? { toDate: () => new Date(Number(x.CreatedOn ?? x.createdOn)) } : undefined,
							authorName: String(x.AuthorName ?? x.authorName ?? ''),
							authorUid: String(x.AuthorUID ?? x.UID ?? x.uid ?? ''),
							parentId: undefined,
							editedBy: String(x.ModifiedBy ?? x.modifiedBy ?? x.editedBy ?? '') || undefined,
							editedOn: (x.ModifiedOn ?? x.modifiedOn) != null ? { toDate: () => new Date(Number(x.ModifiedOn ?? x.modifiedOn)) } : undefined,
						} as AnnouncementItem);
					}
					const rawReplies = Array.isArray(x.Replies ?? x.replies) ? (x.Replies ?? x.replies) : [];
					rawReplies.forEach((r: any, idx: number) => {
						replies.push({
							id: `${String(x.id || '')}_reply_${String(r.ReplyID ?? r.replyID ?? idx)}`,
							subject: String(r.Subject ?? r.subject ?? ''),
							message: String(r.Message ?? r.message ?? ''),
							files: Array.isArray(r.Files ?? r.files) ? (r.Files ?? r.files).map((f: any) => ({ url: String(f.URL ?? f.url ?? ''), name: String(f.Name ?? f.name ?? '') })) : [],
							createdOn: (r.CreatedOn ?? r.createdOn) != null ? { toDate: () => new Date(Number(r.CreatedOn ?? r.createdOn)) } : undefined,
							authorName: String(r.AuthorName ?? r.authorName ?? ''),
							authorUid: String(r.AuthorUID ?? r.UID ?? r.uid ?? ''),
							parentId: String(x.id || ''),
							editedBy: String(r.ModifiedBy ?? r.modifiedBy ?? r.editedBy ?? '') || undefined,
							editedOn: (r.ModifiedOn ?? r.modifiedOn) != null ? { toDate: () => new Date(Number(r.ModifiedOn ?? r.modifiedOn)) } : undefined,
						} as AnnouncementItem);
					});
				});

				if (!mounted.current) return;
				setNews(mappedNews);
				setAnnouncements([...topLevel, ...replies]);
				setLoading(false);
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('fetching updates failed', err);
				if (mounted.current) setLoading(false);
			}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const refresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await load(true);
		} finally {
			if (mounted.current) setRefreshing(false);
		}
	}, [load]);

	const handleViewNews = async (item: NewsItem) => {
		dropUnread(item.id);
		void markUpdateRead(item.id);
		setSelectedNews({ ...item, viewCount: (item.viewCount || 0) + 1 });
		setShowNewsModal(true);
		try {
			const { httpsCallable } = await import('firebase/functions');
			const mod = await import('@/lib/firebase');
			const fn = httpsCallable(mod.functions, 'editRecordAttempt');
			fn({ case: 'incrementNewsViewCount', id: item.id }).catch(() => {});
		} catch {
		}
	};

	const repliesByParent: { [parentId: string]: AnnouncementItem[] } = {};
	announcements.forEach((a) => {
		if (a.parentId) {
			if (!repliesByParent[a.parentId]) repliesByParent[a.parentId] = [];
			repliesByParent[a.parentId].push(a);
		}
	});

	const topLevelAnnouncements = announcements.filter((a) => !a.parentId);

	const markAllAnnouncementsRead = async () => {
		announcements.forEach((item) => dropUnread(item.id));
		await markAllRead('announcements');
		refreshUnreadUpdates();
	};

	const markAllNewsRead = async () => {
		news.forEach((item) => dropUnread(item.id));
		await markAllRead('news');
		refreshUnreadUpdates();
	};

	const openAnnouncement = (item: AnnouncementItem) => {
		dropUnread(item.id);
		void markUpdateRead(item.id);
		setSelectedAnn(item);
		setShowAnnModal(true);
	};

	useEffect(() => {
		if (location.state?.openNewsId && news.length > 0) {
			const found = news.find((n) => n.id === location.state.openNewsId);
			if (found) handleViewNews(found);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.state, news]);

	return {
		loading,
		refreshing,
		refresh,
		news,
		announcements,
		topLevelAnnouncements,
		repliesByParent,
		unreadIds,
		markAllAnnouncementsRead,
		markAllNewsRead,
		openAnnouncement,
		handleViewNews,
		showNewsModal,
		selectedNews,
		setShowNewsModal,
		setSelectedNews,
		showAnnModal,
		selectedAnn,
		setShowAnnModal,
		setSelectedAnn,
		searchModalOpen,
		setSearchModalOpen,
	} as const;
}
