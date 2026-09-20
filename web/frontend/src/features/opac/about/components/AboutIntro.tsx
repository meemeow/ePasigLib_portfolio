import { Text } from "@/components/ui/Text";
import { asset } from "@/lib/asset";

export function AboutIntro() {
  return (
    <div className="relative flex flex-col text-center lg:text-left lg:col-start-1 lg:row-start-1 2xl:row-span-2 3xl:row-span-1">
      <div className="relative z-10 pt-6 sm:pt-10 md:pt-14 lg:pt-8 xl:pt-10 2xl:pt-9 3xl:pt-10">
        <Text className="font-script text-[36px] leading-none text-[#0D3199] sm:text-[46px] md:text-[52px] lg:text-[40px] min-[1135px]:text-[52px] 2xl:text-[60px]">
          About Us
        </Text>

        <Text
          as="h1"
          className="font-[GothamBlack] text-3xl leading-[1.08] text-[#0b1b33] sm:text-4xl md:text-5xl lg:text-[2.5rem] min-[1135px]:text-[3rem] 2xl:text-[3.75rem]"
        >
          Pasig Knowledge Center
        </Text>

        <Text className="mt-3 text-base font-[gothamMedium] leading-snug text-[#0b1b33] sm:mt-3.5 md:mt-4 md:text-lg lg:mt-3 lg:text-base min-[1135px]:text-lg 2xl:mt-5 2xl:text-xl 3xl:mt-3">
          Formerly Pasig City Library and Discovery Centrum
        </Text>

        <Text className="mt-5 mx-auto max-w-sm font-bold text-sm leading-relaxed text-[#1E3A5F] sm:mt-6 sm:max-w-md sm:text-base md:mt-7 md:max-w-xl md:text-lg lg:mx-0 lg:mt-5 lg:max-w-none lg:text-base min-[1135px]:text-lg 2xl:mt-7 2xl:max-w-2xl 3xl:mt-5">
          A welcoming space for reading, studying, learning, and exploring. Whether you need a quiet place to focus or simply want to spend some time with a good book, there’s a seat waiting for you.
        </Text>
      </div>

      <img
        src={asset("/assets/images/opac_about_vector3.png")}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none hidden select-none object-contain object-bottom 2xl:absolute 2xl:-bottom-0 2xl:-left-16 2xl:block 2xl:w-[620px]"
      />
    </div>
  );
}
