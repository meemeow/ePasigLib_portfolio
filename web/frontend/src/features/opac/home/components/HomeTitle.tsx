import { Text } from "@/components/ui/Text";

export function HomeTitle() {
  return (
    <div className="flex flex-col items-center space-y-5 lg:space-y-8">
      <img
        src="/assets/images/Pasig_City_Seal_Logo.png"
        alt="Pasig City seal"
        className="h-14 w-14 sm:h-20 sm:w-20"
      />
      <Text
        as="h1"
        className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-[GothamBlack] tracking-[.05em]"
      >
        PASIG KNOWLEDGE CENTER
      </Text>
    </div>
  );
}
