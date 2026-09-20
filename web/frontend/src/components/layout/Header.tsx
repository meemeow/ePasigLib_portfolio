import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppSection } from "@/hooks/use-app-section";

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
};

function formatNow(): string {
    const now = new Date();
    const time = now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    });
    const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
    const formattedDate = now.toLocaleDateString(undefined, DATE_OPTIONS);
    return `${formattedDate} | ${weekday} | ${time}`;
}

export default function Header() {
    const [currentTime, setCurrentTime] = useState<string>(formatNow);
    const { isLMS, base } = useAppSection();

    const helpPath = isLMS ? `${base}/documentation` : `${base}/help`;
    const helpLabel = isLMS ? "Check our documentation" : "Visit the Help Center";

    useEffect(() => {
        const interval = setInterval(() => {
            const next = formatNow();
            setCurrentTime((prev) => (prev === next ? prev : next));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="font-[gothamLight] w-full h-10 flex justify-between items-center px-6 sm:px-8 md:px-8 xl:px-12 py-2 bg-[#002248] border-b border-gray-300 text-xs md:text-sm lg:text-base text-white">
            <div>{currentTime}</div>
            <div className="flex items-center gap-2">
                <span className="hidden sm:inline">
                    Having trouble?{" "}
                    <Link
                        to={helpPath}
                        className="underline text-white hover:text-blue-300 transition"
                    >
                        {helpLabel}
                    </Link>
                </span>

                <Link
                    to={helpPath}
                    aria-label={isLMS ? "Documentation" : "Help"}
                    className="sm:hidden inline-flex items-center justify-center w-5.5 h-5.5 rounded-full border-2 border-white text-white hover:bg-white/10 transition"
                >
                    <span className="text-sm font-extrabold">?</span>
                </Link>
            </div>
        </div>
    );
}
