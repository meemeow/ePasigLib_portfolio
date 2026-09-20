import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const TRAVEL_MS = 300;

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

const DISMISS_FRACTION = 0.45;

const DISMISS_MAX_PX = 190;

const FLICK_VELOCITY = 0.9;

const SLOP_PX = 14;

interface CollectionSheetProps {
	onClose: () => void;
	children: (requestClose: () => void) => ReactNode;
}

export function CollectionSheet({ onClose, children }: CollectionSheetProps) {
	const shellRef = useRef<HTMLDivElement | null>(null);

	const [entered, setEntered] = useState(false);
	const [closing, setClosing] = useState(false);
	const [drag, setDrag] = useState(0);
	const [dragging, setDragging] = useState(false);

	const reduced =
		typeof window !== "undefined" &&
		window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

	useEffect(() => {
		const frame = requestAnimationFrame(() => setEntered(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	const close = useCallback(() => {
		if (closing) return;
		if (reduced) {
			onClose();
			return;
		}
		setClosing(true);
		window.setTimeout(onClose, TRAVEL_MS);
	}, [closing, onClose, reduced]);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") close();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [close]);

	const gesture = useRef<{
		startY: number;
		lastY: number;
		lastT: number;
		velocity: number;
		engaged: boolean;
	} | null>(null);

	const onPointerDown = (event: React.PointerEvent) => {
		if (closing || event.button !== 0) return;

		event.currentTarget.setPointerCapture(event.pointerId);

		gesture.current = {
			startY: event.clientY,
			lastY: event.clientY,
			lastT: event.timeStamp,
			velocity: 0,
			engaged: false,
		};
	};

	const onPointerMove = (event: React.PointerEvent) => {
		const state = gesture.current;
		if (!state) return;

		const dy = event.clientY - state.startY;

		if (!state.engaged) {
			if (dy < -SLOP_PX) {
				gesture.current = null;
				return;
			}
			if (dy < SLOP_PX) return;
			state.engaged = true;
			state.startY = event.clientY;
			setDragging(true);
			return;
		}

		const elapsed = event.timeStamp - state.lastT;
		if (elapsed > 0) {
			state.velocity = (event.clientY - state.lastY) / elapsed;
			state.lastY = event.clientY;
			state.lastT = event.timeStamp;
		}

		setDrag(Math.max(0, dy));
	};

	const endGesture = () => {
		const state = gesture.current;
		gesture.current = null;
		if (!state?.engaged) return;

		setDragging(false);

		const height = shellRef.current?.offsetHeight || 0;
		const threshold = Math.min(height * DISMISS_FRACTION, DISMISS_MAX_PX);

		if (drag > threshold || state.velocity > FLICK_VELOCITY) {
			close();
			return;
		}
		setDrag(0);
	};

	const height = shellRef.current?.offsetHeight || 1;
	const backdropOpacity =
		!entered || closing ? 0 : Math.max(0, 1 - drag / height);

	return (
		<>
			<div
				className="fixed inset-0 z-40 bg-black/40"
				style={{
					opacity: backdropOpacity,
					transition: dragging ? "none" : `opacity ${TRAVEL_MS}ms ${EASE}`,
				}}
				onClick={close}
				aria-hidden
			/>

			<div
				ref={shellRef}
				role="dialog"
				aria-modal="true"
				aria-label="Book preview"
				className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-white shadow-2xl"
				style={{
					transform:
						!entered || closing ? "translateY(100%)" : `translateY(${drag}px)`,
					transition: dragging ? "none" : `transform ${TRAVEL_MS}ms ${EASE}`,
				}}
			>
				<div
					className="flex h-11 shrink-0 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing"
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={endGesture}
					onPointerCancel={endGesture}
				>
					<div aria-hidden className="h-1 w-10 rounded-full bg-gray-300" />
				</div>

				<div
					className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 xs:px-5"
					style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
				>
					{children(close)}
				</div>
			</div>
		</>
	);
}
