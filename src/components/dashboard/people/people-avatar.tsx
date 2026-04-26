"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { type Contact, statusColor } from "./people-data";

interface PeopleAvatarProps {
  contact: Contact;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
}

const sizeMap = {
  sm: { wrap: "w-7 h-7",  text: "text-[10px]", dot: "w-2 h-2",   img: 28 },
  md: { wrap: "w-8 h-8",  text: "text-xs",     dot: "w-2.5 h-2.5", img: 32 },
  lg: { wrap: "w-10 h-10", text: "text-sm",    dot: "w-3 h-3",   img: 40 },
};

export function PeopleAvatar({ contact, size = "md", showStatus = true }: PeopleAvatarProps) {
  const s = sizeMap[size];

  return (
    <div className="relative shrink-0">
      {contact.avatar ? (
        <Image
          src={contact.avatar}
          alt={contact.name}
          width={s.img}
          height={s.img}
          unoptimized
          className={cn("rounded-full object-cover", s.wrap)}
        />
      ) : (
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-semibold select-none",
            s.wrap,
            s.text,
            contact.avatarColor
          )}
        >
          {contact.initials}
        </div>
      )}

      {showStatus && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background",
            s.dot,
            statusColor[contact.status]
          )}
        />
      )}
    </div>
  );
}
