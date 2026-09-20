import { Text } from "@/components/ui/Text";

export function HomeQuote() {
  return (
    <div className="space-y-4">
      <Text className="italic text-xl md:text-2xl xl:text-3xl">
        "Tunay palang magigiting ang batampasig."
      </Text>
      <Text className="uppercase font-bold text-base md:text-lg xl:text-xl tracking-wider">
        Andres Bonifacio (1896)
      </Text>
      <Text className="text-base md:text-lg xl:text-xl text-gray-200 leading-relaxed max-w-3xl mx-auto">
        On August 29, 1896 the first battle of the Katipunan begins, an event
        called Nagsabado sa Pasig. The Pasigueños succeeded in capturing the
        Tribunal and the Guardia Civil Headquarters. When Bonifacio heard of the
        success of the first attack of the Spaniards in Pasig, he said, "Tunay
        pa lang magigiting ang BatamPasig."
      </Text>
    </div>
  );
}
