import { asset } from "@/lib/asset";

export function AboutPhoto() {
  return (
    <div className="relative z-10 flex items-center justify-center lg:col-start-2 lg:row-start-1 lg:items-start 2xl:col-span-2 2xl:col-start-2 3xl:col-span-1 3xl:col-start-2 3xl:items-center">
      <figure className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-3xl border-[6px] border-white shadow-[0_28px_60px_-20px_rgba(1,27,56,0.45)] sm:max-w-md md:max-w-lg 3xl:max-w-xl">
        <img
          src={asset("/assets/images/Pasig_Knowledge_Center.png")}
          alt="The Pasig Knowledge Center building on Caruncho Avenue, seen from the walkway"
          className="h-full w-full object-cover"
        />

        <figcaption className="absolute right-[5%] top-[5%] flex items-center gap-2">
          <img
            src={asset("/assets/images/Pasig_City_Seal_Logo.png")}
            alt=""
            aria-hidden
            className="size-9 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] sm:size-12"
          />
          <img
            src={asset("/assets/images/Pasig_Wordmark.png")}
            alt=""
            aria-hidden
            className="h-9 w-auto brightness-0 invert drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] sm:h-12"
          />
          <span className="sr-only">City Government of Pasig</span>
        </figcaption>
      </figure>
    </div>
  );
}
