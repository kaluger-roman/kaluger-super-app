"use client";

import { useState } from "react";
import Image from "next/image";
import type { Certificate } from "@/types";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

type CertificatesSectionProps = {
  items: Certificate[];
};

export const CertificatesSection = ({ items }: CertificatesSectionProps) => {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (items.length === 0) {
    return null;
  }

  return (
    <section id="certificates" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl font-bold text-center mb-12">Сертификаты</h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, index) => (
            <AnimateOnScroll key={index} delay={index * 150}>
              <div className="bg-white rounded-xl shadow-sm border border-border p-4 h-full flex flex-col">
                {item.image ? (
                  <button
                    type="button"
                    className="cursor-zoom-in"
                    onClick={() => setLightboxSrc(item.image!)}
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={400}
                      height={300}
                      className="w-full aspect-[4/3] rounded-lg object-cover mb-4"
                    />
                  </button>
                ) : (
                  <div className="bg-surface-dark rounded-lg flex items-center justify-center aspect-[4/3] mb-4">
                    <span className="text-text-light text-center px-4">
                      {item.title}
                    </span>
                  </div>
                )}

                <p className="font-semibold mt-auto">{item.title}</p>
                <p className="text-text-light">{item.year}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white text-4xl leading-none cursor-pointer"
            onClick={() => setLightboxSrc(null)}
            aria-label="Закрыть"
          >
            &times;
          </button>
          <Image
            src={lightboxSrc}
            alt="Сертификат"
            width={1200}
            height={900}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg pointer-events-none"
          />
        </div>
      )}
    </section>
  );
};
