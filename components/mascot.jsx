"use client";

import { Mascot } from "page-mascot";
import { cn } from "@/lib/utils";

export function CatMascot({ className }) {
  return (
    <div className={cn("select-none", className)}>
      <Mascot
        directions="/mascots/cat-directions.webp"
        reactions="/mascots/cat-reactions.webp"
        size={110}
        label="kucing maskot"
      />
    </div>
  );
}
