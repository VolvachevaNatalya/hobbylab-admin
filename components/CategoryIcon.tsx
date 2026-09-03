"use client";

import Image from "next/image";
import { useState } from "react";

interface Props {
  url: string;
}

export default function CategoryIcon({ url }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <Image
      src={url}
      alt=""
      width={24}
      height={24}
      unoptimized
      className="h-6 w-6 rounded object-contain"
      onError={() => setFailed(true)}
    />
  );
}
