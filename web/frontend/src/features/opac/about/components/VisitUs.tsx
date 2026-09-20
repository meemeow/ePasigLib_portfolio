import type { ReactNode } from "react";
import { Link2, Mail, MapPin, Phone } from "lucide-react";
import { Text } from "@/components/ui/Text";

function FacebookMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S2 6.48 2 12.07c0 4.99 3.66 9.12 8.44 9.93v-7.03H7.9v-2.9h2.53V9.41c0-2.5 1.49-3.87 3.77-3.87 1.09 0 2.23.2 2.23.2v2.45h-1.25c-1.23 0-1.61.76-1.61 1.54v1.86h2.74l-.44 2.9h-2.3v7.03C18.34 21.19 22 17.06 22 12.07z" />
    </svg>
  );
}

const FACEBOOK_PAGE =
  "https://www.facebook.com/profile.php?id=61583288685740";

function ContactIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#0b1b33] sm:size-11 md:size-9 lg:size-11 2xl:size-12">
      {children}
    </span>
  );
}

function ContactBlock({
  icon,
  title,
  className = "",
  children,
}: {
  icon: ReactNode;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <ContactIcon>{icon}</ContactIcon>
      <div className="min-w-0">
        <Text
          as="h3"
          className="text-xs font-[gothamMedium] text-[#0b1b33] sm:text-sm lg:text-base 2xl:text-lg"
        >
          {title}
        </Text>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  );
}

interface VisitUsProps {
  highlighted?: boolean;
}

export function VisitUs({ highlighted = false }: VisitUsProps) {
  return (
    <section
      id="visit-us"
      className={`relative z-10 rounded-2xl border border-blue-100 p-5 shadow-sm transition-colors duration-500 sm:p-6 md:px-10 md:py-9 ${
        highlighted ? "bg-yellow-50/80" : "bg-white"
      }`}
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 xl:gap-5 2xl:gap-0">
        <div className="flex items-start sm:col-span-2 xl:col-span-1">
          <Text
            as="h2"
            className="text-sm font-[gothamMedium] text-[#0b1b33] sm:text-xl lg:text-lg 2xl:text-xl 3xl:text-lg"
          >
            Visit Us
          </Text>
        </div>
          <ContactBlock
            icon={<MapPin className="size-4 sm:size-5" />}
            title="Location"
          >
            <Text className="text-xs leading-relaxed text-gray-600 2xl:text-sm">
              Caruncho Ave., Brgy. San Nicolas
            </Text>
            <Text className="text-[11px] leading-relaxed text-gray-400 sm:text-xs">
              (Beside Pasig Elementary School and Pasig Schools Division Office)
            </Text>
            <Text className="text-xs leading-relaxed text-gray-600 2xl:text-sm">
              Pasig City, Metro Manila
            </Text>
          </ContactBlock>

          <ContactBlock
            icon={<Phone className="size-4 sm:size-5" />}
            title="Contact"
          >
            <a
              href="tel:+63288090498"
              className="block text-xs text-gray-600 hover:text-[#128CF1] hover:underline 2xl:text-sm"
            >
              (02) 8-809-0498
            </a>
            <a
              href="mailto:pasigcitylibrary@gmail.com"
              className="mt-1.5 flex items-center gap-1.5 text-xs break-all text-[#128CF1] hover:underline 2xl:text-sm"
            >
              <Mail className="size-3.5 shrink-0 sm:size-4" />
              pasigcitylibrary@gmail.com
            </a>
          </ContactBlock>

          <ContactBlock
            className="sm:col-span-2 sm:justify-self-center xl:col-span-1 xl:justify-self-start"
            icon={<Link2 className="size-4 sm:size-5" />}
            title="Connect"
          >
            <Text className="text-xs leading-relaxed text-gray-600 2xl:text-sm">
              Follow us on Facebook for updates
            </Text>
            <a
              href={FACEBOOK_PAGE}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-1.5 text-xs text-[#128CF1] hover:underline 2xl:text-sm"
            >
              <FacebookMark className="size-4 shrink-0 fill-current sm:size-5" />
              Pasig Knowledge Center
            </a>
          </ContactBlock>
      </div>
    </section>
  );
}
