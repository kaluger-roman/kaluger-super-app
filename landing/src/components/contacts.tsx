import type { SocialLink } from "@/types";
import { SiVk, SiWhatsapp, SiTelegram } from "react-icons/si";
import { ProfiIcon, MaxIcon } from "./icons";
import { AnimateOnScroll } from "./animate-on-scroll";

type ContactsProps = {
  items: SocialLink[];
};

const iconMap = {
  profi: <ProfiIcon className="w-8 h-8" />,
  vk: <SiVk size={32} />,
  whatsapp: <SiWhatsapp size={32} />,
  telegram: <SiTelegram size={32} />,
  max: <MaxIcon className="w-8 h-8" />,
} as const;

export const Contacts = ({ items }: ContactsProps) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <section id="contacts" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl font-bold text-center mb-2">Контакты</h2>
          <p className="text-center text-muted mb-10">
            Свяжитесь со мной удобным способом
          </p>
        </AnimateOnScroll>
        <AnimateOnScroll delay={200}>
          <div className="flex flex-wrap justify-center gap-6">
            {items.map((item) => (
              <a
                key={item.type}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-surface hover:text-primary transition"
              >
                {iconMap[item.type]}
                {item.label && (
                  <span className="text-sm">{item.label}</span>
                )}
              </a>
            ))}
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
};
