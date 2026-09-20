import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useLibraryStatus } from "@/features/opac/about/api/use-library-status";
import { AboutIntro } from "@/features/opac/about/components/AboutIntro";
import { AboutPhoto } from "@/features/opac/about/components/AboutPhoto";
import { AboutSkylineBand } from "@/features/opac/about/components/AboutSkylineBand";
import { AreaCards } from "@/features/opac/about/components/AreaCards";
import { OperatingHoursCard } from "@/features/opac/about/components/OperatingHoursCard";
import { VisitUs } from "@/features/opac/about/components/VisitUs";
import { Seo } from "@/lib/seo/Seo";
import { breadcrumbNode, graph, libraryNode } from "@/lib/seo/structured-data";

export default function About() {
  const status = useLibraryStatus();
  const location = useLocation();

  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    if (location.hash !== "#visit-us") return;

    let fade: number | undefined;
    const jump = window.setTimeout(() => {
      document
        .getElementById("visit-us")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });

      window.history.replaceState(null, "", window.location.pathname);

      setHighlighted(true);
      fade = window.setTimeout(() => setHighlighted(false), 1000);
    }, 200);

    return () => {
      window.clearTimeout(jump);
      if (fade !== undefined) window.clearTimeout(fade);
    };
  }, [location.key, location.hash]);

  return (
    <div className="flex w-full flex-1 flex-col font-[gothamLight]">
      <Seo
        description="Pasig Knowledge Center, formerly the Pasig City Library and Discovery Centrum — opening hours, reading areas, and how to visit."
        canonical="/opac/about"
        structuredData={graph(
          libraryNode(),
          breadcrumbNode([
            { name: "Home", path: "/opac/home" },
            { name: "About", path: "/opac/about" },
          ]),
        )}
      />
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-5 px-6 py-8 sm:gap-6 sm:px-8 lg:gap-12 lg:px-12 lg:py-10 2xl:px-16">
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 lg:gap-10 2xl:grid-cols-[4fr_3fr_3fr] 2xl:gap-12">
          <AboutIntro />
          <AboutPhoto />
          <AboutSkylineBand />

          <div className="flex flex-col gap-5 sm:gap-6 md:grid md:grid-cols-2 lg:col-span-2 lg:col-start-1 lg:row-start-3 lg:gap-10 2xl:col-span-2 2xl:col-start-2 2xl:row-start-2 2xl:gap-6 3xl:col-span-1 3xl:col-start-3 3xl:row-start-1 3xl:flex 3xl:flex-col">
            <OperatingHoursCard status={status} />
            <AreaCards />
          </div>
        </div>

        <VisitUs highlighted={highlighted} />
      </div>
    </div>
  );
}
