import type { Subject } from "@/types";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

type ConditionsProps = {
  items: Subject[];
};

export const Conditions = ({ items }: ConditionsProps) => {
  return (
    <section id="conditions" className="bg-surface py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl font-bold text-center mb-4">
            Условия занятий
          </h2>
          <div className="text-center">
            <span className="inline-block bg-primary/10 text-primary text-sm px-3 py-1 rounded-full mb-6">
              Только онлайн
            </span>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((subject, index) => (
            <AnimateOnScroll key={subject.name} delay={index * 150}>
              <div className="bg-white rounded-xl shadow-sm border border-border p-6">
                <h3 className="font-bold text-xl mb-3">{subject.name}</h3>

                <div className="flex flex-wrap gap-2 mb-4">
                  {subject.levels.map((level) => (
                    <span
                      key={level}
                      className="bg-surface text-text-light text-sm px-3 py-1 rounded-full"
                    >
                      {level}
                    </span>
                  ))}
                </div>

                <div className="text-primary font-bold text-2xl mt-4">
                  {subject.priceNote ? `${subject.priceNote} ` : ""}{subject.price} ₽ / {subject.duration} мин.
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
