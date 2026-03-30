"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks";

type AnimateOnScrollProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export const AnimateOnScroll = ({
  children,
  className = "",
  delay = 0,
}: AnimateOnScrollProps) => {
  const { ref, isInView } = useInView();

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};
