
export type TimestampLike = { toDate: () => Date };

export interface NewsItem {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    tags: string[];
    createdOn: TimestampLike;
    url?: string;
    mainAuthor?: string;
    location?: string;
    viewCount: number;
}

export interface AnnouncementFile {
    url: string;
    name: string;
}

export interface AnnouncementItem {
    id: string;
    subject: string;
    message: string;
    fileUrl?: string;
    fileName?: string;
    files?: AnnouncementFile[];
    createdOn?: TimestampLike;
    authorName?: string;
    authorUid?: string;
    parentId?: string;
    editedBy?: string;
    editedOn?: TimestampLike;
}

export function toTimestampLike(ms?: number | null | undefined): TimestampLike | undefined {
    if (ms == null) return undefined;
    const n = Number(ms);
    if (Number.isNaN(n)) return undefined;
    return { toDate: () => new Date(n) };
}
