export type Education = {
  institution: string;
  degree: string;
  year: number | string;
};

export type Certificate = {
  title: string;
  year: number;
  image?: string;
};

export type Review = {
  author: string;
  text: string;
  rating?: number;
  date?: string;
  source?: string;
};

export type Subject = {
  name: string;
  levels: string[];
  duration: number;
  price: number;
  priceNote?: string;
};

export type SocialLink = {
  type: "profi" | "vk" | "whatsapp" | "telegram" | "max";
  url: string;
  label?: string;
};

export type TutorData = {
  firstName: string;
  lastName: string;
  patronymic: string;
  photo: string;
  tagline: string;
  about: string;
  experience: number;
  education: Education[];
  certificates: Certificate[];
  reviews: Review[];
  subjects: Subject[];
  socials: SocialLink[];
  seo: {
    title: string;
    description: string;
    ogImage: string;
  };
};
