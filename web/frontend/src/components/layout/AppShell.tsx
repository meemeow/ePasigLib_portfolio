import Header from "@/components/layout/Header";
import Navbar from "@/components/layout/Navbar";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Footer from "@/components/layout/Footer";
import FullscreenSpinner from "@/components/ui/FullscreenSpinner";
import { useAuth } from "@/lib/auth/use-auth";
import { useAppSection } from "@/hooks/use-app-section";
import ChatWidget from "@/features/opac/chat/ChatWidget";
import { BreadcrumbLabelProvider } from "@/hooks/breadcrumb-label";
import { Outlet } from "react-router-dom";

export default function AppShell() {
	const { pathname, isLMS } = useAppSection();
	const { loading } = useAuth();

	const isOPACHome = pathname === "/opac/home";
	const backdrop = isOPACHome
		? "bg-[url('/assets/images/pasigLib_bg.jpg')]"
		: "bg-[url('/assets/images/pasigLib_bgLMS.jpg')]";

	if (loading) return <FullscreenSpinner />;

	return (
		<BreadcrumbLabelProvider>
		<div className="relative min-h-screen w-full flex flex-col">
			<Header />
			<Navbar />
			<div className="w-full shadow-sm">
				<Breadcrumbs />
			</div>

			<div
				className={`flex-grow w-full flex flex-col ${backdrop} bg-cover bg-center bg-no-repeat bg-fixed`}
			>
				<Outlet />
			</div>

			{!isLMS && <Footer />}

			{!isLMS && <ChatWidget />}
		</div>
		</BreadcrumbLabelProvider>
	);
}
