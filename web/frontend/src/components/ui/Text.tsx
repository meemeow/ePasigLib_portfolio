import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textVariants = cva("text-base", {
  variants: {
    font: {
      inherit: "",
      light: "font-[gothamLight]",
      medium: "font-[gothamMedium]",
      black: "font-[GothamBlack]",
    },
  },
  defaultVariants: {
    font: "inherit",
  },
});

type TextElement =
  | "p"
  | "span"
  | "div"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "label";

function Text({
  className,
  font,
  as = "p",
  ...props
}: React.ComponentProps<"p"> &
  VariantProps<typeof textVariants> & {
    as?: TextElement;
    htmlFor?: string;
  }) {
  const Comp = as as React.ElementType;

  return (
    <Comp
      data-slot="text"
      className={cn(textVariants({ font }), className)}
      {...props}
    />
  );
}

export { Text };
