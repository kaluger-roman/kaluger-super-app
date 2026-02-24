import type { Education } from "@/types";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

type EducationSectionProps = {
  items: Education[];
};

export const EducationSection = ({ items }: EducationSectionProps) => {
  return (
    <section id="education" className="bg-surface py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl font-bold text-center mb-12">Образование</h2>
        </AnimateOnScroll>

        <div className="relative">
          {items.map((item, index) => (
            <AnimateOnScroll key={index} delay={index * 150}>
              <div className="flex gap-6 mb-8 last:mb-0">
                <div className="flex flex-col items-center w-28 shrink-0">
                  <span className="text-primary font-bold text-lg whitespace-nowrap">
                    {item.year}
                  </span>
                  <div className="w-px bg-border flex-1 mt-2" />
                </div>

                <div className="pb-8 last:pb-0">
                  <p className="font-semibold text-lg">{item.institution}</p>
                  <p className="text-text-light">{item.degree}</p>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
