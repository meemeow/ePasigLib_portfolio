import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/use-auth";
import { Loader2, X } from "lucide-react";
import { callCirculation as callable } from "@/lib/api/callables";

interface NotificationItem {
    id: string;
    title: string;
    content: string;
    date: any;
    read: boolean;
    pressable?: boolean;
    type?: "news" | "announcement" | "reply" | string;
    targetId?: string;
}

export default function OPACNotificationsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { user, userType } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [lastDoc, setLastDoc] = useState<string | null>(null);
    const loader = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();
    const [showInstructions, setShowInstructions] = useState(false);


    const fetchNotifications = useCallback(
        async (initial = false) => {
            if (!user || userType !== "Patron") {
                setNotifications([]);
                setLoading(false);
                setHasMore(false);
                return;
            }
            setLoading(true);
            try {
                                const res = await callable({ case: 'fetch_notifications', target: 'patrons', uid: user.uid, limit: 5, lastDocId: initial ? null : lastDoc });
                const d = (res.data as any) || {};
                const docs = Array.isArray(d.notifications) ? d.notifications : [];
                const notifs: NotificationItem[] = docs.map((doc: any) => ({
                    id: doc.id,
                    title: doc.title || '',
                    content: doc.content || '',
                    date: doc.date ? (new Date(doc.date)).toLocaleString() : '',
                    read: !!doc.read,
                    pressable: !!doc.pressable,
                    type: doc.type,
                    targetId: doc.targetId,
                }));
                if (initial) setNotifications(notifs);
                else setNotifications((prev) => [...prev, ...notifs]);
                setLastDoc(d.lastDocId || null);
                setHasMore(Boolean(d.hasMore));
            } catch (e) {
                if (initial) setNotifications([]);
                setHasMore(false);
            }
            setLoading(false);
        },
        [user, userType, lastDoc]
    );

    useEffect(() => {
        setNotifications([]);
        setLastDoc(null);
        setHasMore(true);
        if (user && userType === "Patron") {
            fetchNotifications(true);
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line
    }, [user, userType]);

    useEffect(() => {
        if (!hasMore || loading) return;
        const observer = new window.IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchNotifications();
                }
            },
            { threshold: 1 }
        );
        if (loader.current) {
            observer.observe(loader.current);
        }
        return () => {
            if (loader.current) observer.unobserve(loader.current);
        };
    }, [hasMore, loading, fetchNotifications]);

    const handleNotificationClick = async (n: NotificationItem) => {
        if (!n.read && user) {
            try {
                                await callable({ case: 'mark_notification_read', target: 'patrons', uid: user.uid, id: n.id });
            } catch (e) {
            }
        }

        if (n.pressable && n.type && n.type === "announcement" && n.targetId) {
            navigate(`/opac/news_announcements?olderAnnouncement=${n.targetId}`);
        }
        if (n.pressable && n.type && n.type === "account_verification_rejected") {
            navigate("/opac/profile", { state: { highlightReuploadID: true } });
        } else if (n.pressable && n.type && n.targetId && (n.type === "news" || n.type === "announcement" || n.type === "reply")) {
            if (n.type === "news") {
                navigate("/opac/news_announcements", { state: { openNewsId: n.targetId } });
            } else {
                navigate("/opac/news_announcements", { state: { type: n.type, targetId: n.targetId } });
            }
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                <div className="bg-gradient-to-r from-[#003067] to-[#128CF1] px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-white text-xl font-bold tracking-wide">NOTIFICATIONS</h2>
                        <div className="flex items-center gap-2">
                            <button
                                className="ml-2 px-3 py-1 rounded bg-white/10 text-white text-xs font-[gothamMedium] hover:brightness-95 transition flex items-center gap-2"
                                onClick={() => {
                                    setLastDoc(null);
                                    fetchNotifications(true);
                                }}
                                disabled={loading}
                                aria-label="Refresh"
                            >
                                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Refresh'}
                            </button>
                            <button
                                className="px-2 py-1 rounded text-white border border-white text-xs font-[gothamMedium] hover:brightness-95 transition"
                                onClick={() => setShowInstructions(true)}
                                aria-label="Instructions"
                            >
                                ?
                            </button>
                            <button className="text-white/90 hover:text-white transition" onClick={onClose} aria-label="Close">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {showInstructions && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
                            <button
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                                onClick={() => setShowInstructions(false)}
                                aria-label="Close"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <h2 className="text-xl font-[gothamBlack] mb-4">Notification Color Guide</h2>
                            <ul className="space-y-3 text-sm">
                                <li>
                                    <span className="inline-block w-4 h-4 mr-2 align-middle rounded bg-[#128CF1] border border-[#128CF1]"></span>
                                    <span className="align-middle">General notifications</span>
                                </li>

                                <li>
                                    <span className="inline-block w-4 h-4 mr-2 align-middle rounded bg-yellow-400 border border-yellow-400"></span>
                                    <span className="align-middle">Book Pickup / Due Date Reminder: Tomorrow</span>
                                </li>
                                <li>
                                    <span className="inline-block w-4 h-4 mr-2 align-middle rounded bg-orange-400 border border-orange-400"></span>
                                    <span className="align-middle">Book Pickup / Due Date Reminder: Today</span>
                                </li>
                                <li>
                                    <span className="inline-block w-4 h-4 mr-2 align-middle rounded bg-red-500 border border-red-500"></span>
                                    <span className="align-middle">Book Overdue Violation</span>
                                </li>
                                <li>
                                    <span className="inline-block w-4 h-4 mr-2 align-middle rounded bg-[#008000] border border-[#008000]"></span>
                                    <span className="align-middle">News, Announcement, or Reply (unread)</span>
                                </li>
                                <li>
                                    <span className="inline-block w-4 h-4 mr-2 align-middle rounded bg-gray-300 border border-gray-300"></span>
                                    <span className="align-middle">News, Announcement, or Reply (read)</span>
                                </li>
                                <li>
                                    <span className="inline-block w-4 h-4 mr-2 align-middle rounded bg-yellow-400 border border-yellow-400"></span>
                                    <span className="align-middle">Account Verification Rejected</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                <div className="px-6 py-5 max-h-[72vh] overflow-y-auto space-y-6">
                    {notifications.length === 0 && !loading ? (
                        <div className="text-gray-500 text-center py-12">No notifications at this time.</div>
                    ) : (
                        notifications.map((n) => {
                            let border = "border-[#128CF1]";
                            let bg = "bg-[#f5f8fb]";
                            let text = "text-[#128CF1]";
                            let badge = "bg-[#128CF1] text-white";
                            let hover = "hover:bg-[#eaf3fa]";

                            if (n.title === "Book Pickup Reminder: Tomorrow") {
                                border = "border-yellow-400";
                                bg = "bg-[#fffbe6]";
                                text = "text-yellow-700";
                                badge = "bg-yellow-400 text-black";
                                hover = "hover:bg-[#fffde7]";
                            } else if (n.title === "Book Pickup Reminder: Today") {
                                border = "border-orange-400";
                                bg = "bg-[#fff3e6]";
                                text = "text-orange-700";
                                badge = "bg-orange-400 text-white";
                                hover = "hover:bg-[#fff7ed]";
                            } else if (n.title === "Book Due Date Reminder: Tomorrow") {
                                border = "border-yellow-400";
                                bg = "bg-[#fffbe6]";
                                text = "text-yellow-700";
                                badge = "bg-yellow-400 text-black";
                                hover = "hover:bg-[#fffde7]";
                            } else if (n.title === "Book Due Date Reminder: Today") {
                                border = "border-orange-400";
                                bg = "bg-[#fff3e6]";
                                text = "text-orange-700";
                                badge = "bg-orange-400 text-white";
                                hover = "hover:bg-[#fff7ed]";
                            } else if (n.title === "Book Overdue Violation") {
                                border = "border-red-500";
                                bg = "bg-[#ffe6e6]";
                                text = "text-red-700";
                                badge = "bg-red-500 text-white";
                                hover = "hover:bg-[#fff5f5]";
                            } else if (n.pressable && ["news", "announcement", "reply"].includes(n.type || "")) {
                                if (!n.read) {
                                    border = "border-[#008000]";
                                    bg = "bg-[#f5f8fb]";
                                    text = "text-[#008000]";
                                    badge = "bg-[#008000] text-white";
                                    hover = "hover:bg-[#e6fbe6]";
                                } else {
                                    border = "border-[#008000]";
                                    bg = "bg-[#f5f8fb]";
                                    text = "text-gray-700";
                                    badge = "bg-gray-200 text-gray-700";
                                    hover = "hover:bg-[#f0f4fa]";
                                }
                            } else {
                                hover = !n.read ? "hover:bg-[#eaf3fa]" : "hover:bg-[#f5f8fb]";
                            }

                            if (n.pressable && n.type && n.type === "account_verification_rejected") {
                                hover = "hover:bg-[#fffde7]";
                                return (
                                    <div key={n.id} className={`bg-white p-6 rounded-lg shadow border-l-4 border-yellow-400 transition ${hover}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-xl font-[gothamMedium] text-red-600">{n.title}</h2>
                                                {!n.read && (
                                                    <span className="inline-block bg-yellow-400 text-black text-xs px-2 py-1 rounded font-[gothamMedium]">
                                                        Action Required
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2">{n.date}</div>
                                        <p className="text-gray-700 text-md mb-2 whitespace-pre-line">{n.content}</p>
                                        <span className="text-xs text-yellow-700 font-[gothamBlack]">Reupload ID</span>
                                        <div className="flex justify-end">
                                            <button
                                                className="px-4 py-1 border border-yellow-400 rounded text-yellow-700 font-[gothamMedium] hover:bg-yellow-400 hover:text-black transition"
                                                onClick={() => handleNotificationClick(n)}
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            if (n.pressable && n.type && n.targetId && ["news", "announcement", "reply"].includes(n.type)) {
                                return (
                                    <div key={n.id} className={`${bg} p-6 rounded-lg shadow border-l-4 ${border} transition flex flex-col gap-2 ${hover}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <h2 className={`text-xl font-[gothamMedium] ${text}`}>{n.title}</h2>
                                                {!n.read && <span className={`inline-block ${badge} text-xs px-2 py-1 rounded font-[gothamMedium]`}>New</span>}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2">{n.date}</div>
                                        <p className="text-md mb-2 whitespace-pre-line">{n.content}</p>
                                        <div className="flex justify-end">
                                            <button
                                                className="px-4 py-1 border border-[#128CF1] rounded text-[#128CF1] font-[gothamMedium] hover:bg-[#128CF1] hover:text-white transition"
                                                onClick={() => handleNotificationClick(n)}
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={n.id} className={`${bg} p-6 rounded-lg shadow border-l-4 ${border} flex flex-col gap-2 ${hover}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <h2 className={`text-xl font-[gothamMedium] ${text}`}>{n.title}</h2>
                                            {!n.read && <span className={`inline-block ${badge} text-xs px-2 py-1 rounded font-[gothamMedium]`}>New</span>}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2">{n.date}</div>
                                    <p className="text-md mb-2 whitespace-pre-line">{n.content}</p>
                                </div>
                            );
                        })
                    )}
                    <div ref={loader} />
                    {loading &&
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
                        </div>
                    }
                    {!hasMore && notifications.length > 0 && <div className="text-gray-400 text-center text-xs mt-4">No more notifications.</div>}
                </div>
            </div>
        </div>
    );
}
