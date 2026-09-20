import { Text } from "@/components/ui/Text";

const SIDE_FADE =
  "linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%)";

interface GreetingBannerProps {
  greeting: string;
  greetingEmoji: string;
  firstName: string;
  railOpen: boolean;
}

export default function GreetingBanner({
  greeting,
  greetingEmoji,
  firstName,
  railOpen,
}: GreetingBannerProps) {
  return (
    <section className="relative flex min-h-[150px] items-center sm:min-h-[170px] lg:min-h-[190px] xl:min-h-[220px] 2xl:min-h-[262px]">
      <div className="relative z-10 mt-2 ml-4 max-w-[62%] sm:mt-4 sm:ml-6 sm:max-w-xl xl:ml-9 xl:max-w-none">
        <Text
          as="h1"
          className="text-2xl font-[gothamMedium] leading-tight text-[#011b38] min-[750px]:text-3xl xl:text-4xl"
        >
          {greeting}, <span className="font-[gothamBlack]">{firstName}!</span>{" "}
          <span aria-hidden>{greetingEmoji}</span>
        </Text>
        <Text
          className={`mt-1 text-sm font-bold text-[#011b38] sm:mt-2 xl:whitespace-nowrap xl:text-xl 2xl:text-2xl ${
            railOpen ? "min-[950px]:text-base" : "min-[950px]:text-lg"
          }`}
        >
          Welcome to Pasig Knowledge Center LMS.
        </Text>
      </div>

      <img
        src="/assets/images/city_hall_vector.png"
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute -bottom-6 left-[70%] w-[clamp(100px,50%,200px)] max-w-none -translate-x-1/2 select-none object-contain object-bottom sm:left-[73%] sm:w-[clamp(180px,45%,700px)] xl:left-[74%]"
      />

      <div
        aria-hidden
        style={{
          maskImage: SIDE_FADE,
          WebkitMaskImage: SIDE_FADE,
        }}
        className="pointer-events-none absolute -bottom-6 left-[70%] h-12 w-[clamp(100px,50%,200px)] -translate-x-1/2 bg-gradient-to-t from-[#003067]/40 via-[#0F57B5]/8 to-transparent sm:left-[73%] sm:h-20 sm:w-[clamp(180px,45%,700px)] xl:left-[74%] xl:h-24"
      />
    </section>
  );
}
