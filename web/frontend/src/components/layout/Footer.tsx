import { Text } from "@/components/ui/Text";
import { NavLink } from "react-router-dom";
import { useAppSection } from "@/hooks/use-app-section";

export default function Footer() {
  const { isLMS, base } = useAppSection();
  const year = new Date().getFullYear();

  const helpPath = isLMS ? `${base}/documentation` : `${base}/help`;

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const targetPath = e.currentTarget.getAttribute("href");
    
    if (targetPath && targetPath.includes("#")) {
      return;
    }
    
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <footer className="w-full bg-white border-t border-gray-200 text-gray-700">
      <div className="mx-auto p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-8 items-start">
          <div className="flex flex-col items-center md:flex-row md:items-center text-center md:text-left gap-3 md:col-span-2 self-center">
            <img
              src="/assets/images/PKC_logo2.png"
              alt="Pasig Knowledge Center"
              className="w-[110px] h-auto"
            />

            <div>
              <Text className="text-sm font-[GothamMedium] text-gray-900 mb-1">
                Pasig Knowledge Center
              </Text>
              <Text className="text-xs text-gray-600 max-w-md mx-auto md:mx-0">
                A treasured public library with a fresh new look, serving the
                Pasig community with accessible learning, curated collections,
                and inclusive services.
              </Text>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8 md:contents">
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <Text className="text-xs md:text-sm font-[GothamMedium] text-gray-900 mb-2">
                Explore
              </Text>
              <ul className="text-xs md:text-sm space-y-1 text-gray-600">
                <li>
                  <NavLink
                    to={`${base}/home`}
                    onClick={(e) => handleLinkClick(e)}
                    className="hover:text-sky-600 transition"
                  >
                    Home
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to={`${base}/books`}
                    onClick={(e) => handleLinkClick(e)}
                    className="hover:text-sky-600 transition"
                  >
                    Collections
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to={`${base}/news_announcements`}
                    onClick={(e) => handleLinkClick(e)}
                    className="hover:text-sky-600 transition"
                  >
                    Updates
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to={`${base}/about`}
                    onClick={(e) => handleLinkClick(e)}
                    className="hover:text-sky-600 transition"
                  >
                    About
                  </NavLink>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <Text className="text-xs md:text-sm font-[GothamMedium] text-gray-900 mb-2">
                Support
              </Text>
              <ul className="text-xs md:text-sm space-y-1 text-gray-600">
                <li>
                  <NavLink
                    to={helpPath}
                    onClick={(e) => handleLinkClick(e)}
                    className="hover:text-sky-600 transition"
                  >
                    Help Center
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to={`${base}/about#visit-us`}
                    className="hover:text-sky-600 transition"
                  >
                    Contact Us
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="https://www.foi.gov.ph"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-sky-600 transition"
                  >
                    eFOI Portal
                  </NavLink>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <Text className="text-xs md:text-sm font-[GothamMedium] text-gray-900 mb-2">
                Services
              </Text>
              <ul className="text-xs md:text-sm space-y-1 text-gray-600">
                <li>Reading Rooms</li>
                <li>Digital Collection</li>
                <li>Events</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end text-center md:text-right self-center">
            <Text className="text-xs md:text-sm font-[GothamMedium] text-gray-900 mb-2 md:mb-0">
              Contact
            </Text>
            <div className="text-xs md:text-sm text-gray-600 mb-3">
              City Hall, Pasig • (02) 8-809-0498
            </div>
            <div className="flex gap-3 justify-center md:justify-end">
              <NavLink
                aria-label="facebook"
                to="https://www.facebook.com/profile.php?id=61583288685740"
                target="_blank"
                rel="noreferrer noopener"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-sky-50 transition text-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-4 h-4 fill-current"
                  aria-hidden
                >
                  <path d="M22 12.07C22 6.48 17.52 2 11.93 2S2 6.48 2 12.07c0 4.99 3.66 9.12 8.44 9.93v-7.03H7.9v-2.9h2.53V9.41c0-2.5 1.49-3.87 3.77-3.87 1.09 0 2.23.2 2.23.2v2.45h-1.25c-1.23 0-1.61.76-1.61 1.54v1.86h2.74l-.44 2.9h-2.3v7.03C18.34 21.19 22 17.06 22 12.07z" />
                </svg>
              </NavLink>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full border-t border-gray-100 bg-white/50 text-center py-3 text-xs text-gray-500">
        © {year} Pasig Knowledge Center. All rights reserved.
      </div>
    </footer>
  );
}
