import { asset } from "@/lib/asset";

export function AboutSkylineBand() {
  return (
    <div
      aria-hidden
      className="pointer-events-none -mx-6 flex w-[calc(100%+3rem)] select-none sm:-mx-8 sm:w-[calc(100%+4rem)] lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:-mx-12 lg:w-[calc(100%+6rem)] 2xl:hidden"
    >
      {COPIES.map(({ key, className }) => (
        <img
          key={key}
          src={asset("/assets/images/opac_about_vector3.png")}
          alt=""
          draggable={false}
          className={`shrink-0 object-contain object-bottom ${className}`}
        />
      ))}
    </div>
  );
}

const COPIES = [
  { key: "left", className: "w-full sm:w-1/2 lg:w-1/3" },
  { key: "middle", className: "hidden w-1/2 sm:block lg:w-1/3" },
  { key: "right", className: "hidden w-1/3 lg:block" },
];
