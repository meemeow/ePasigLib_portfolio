import { Text } from "@/components/ui/Text";

export default function RegisterBrandSection() {
  return (
    <div className="mx-auto space-y-2 text-center text-white xl:text-left">
      <Text
        font="black"
        className="text-3xl leading-tight tracking-[.23em] sm:text-4xl"
      >
        PASIG KNOWLEDGE CENTER
      </Text>

      <div className="mx-auto w-full xl:mx-0">
        <div className="h-px w-full bg-white/85" />
      </div>

      <Text font="medium" className="text-xl tracking-[.25em] sm:text-2xl">
        REGISTER
      </Text>
    </div>
  );
}
