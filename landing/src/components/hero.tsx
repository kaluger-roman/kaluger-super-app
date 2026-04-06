import Image from "next/image";
import type { TutorData } from "@/types";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

type HeroProps = {
  tutor: TutorData;
};

export const Hero = ({ tutor }: HeroProps) => {
  return (
    <AnimateOnScroll>
      <section id="about" className="px-4 pt-28 pb-16 md:pt-32 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
            {/* Left column — text content */}
            <div className="flex flex-1 flex-col gap-6">
              <h1 className="text-4xl leading-tight font-bold text-text md:text-5xl lg:text-6xl">
                {tutor.lastName}{" "}
                <span className="text-primary">{tutor.firstName}</span>{" "}
                {tutor.patronymic}
              </h1>

              <p className="text-xl leading-relaxed text-secondary md:text-2xl">
                {tutor.tagline}
              </p>

              <p className="max-w-xl leading-relaxed text-text-light">
                {tutor.about}
              </p>

              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {tutor.experience} лет опыта
                </span>
              </div>

              <div className="pt-2">
                <a
                  href="#contacts"
                  className="inline-block rounded-full bg-primary px-8 py-3 text-lg font-semibold text-white shadow-lg transition-all duration-200 hover:bg-primary-dark hover:shadow-xl"
                >
                  Связаться
                </a>
              </div>
            </div>

            {/* Right column — photo */}
            <div className="flex flex-shrink-0 justify-center lg:justify-end">
              <div className="relative aspect-square w-72 overflow-hidden rounded-2xl shadow-2xl md:w-80 lg:w-96">
                <Image
                  src={tutor.photo}
                  alt={`${tutor.lastName} ${tutor.firstName} ${tutor.patronymic}`}
                  fill
                  sizes="(max-width: 768px) 288px, (max-width: 1024px) 320px, 384px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </AnimateOnScroll>
  );
};
