import type { TutorData } from "@/types";
import {
  Header,
  Hero,
  EducationSection,
  CertificatesSection,
  Conditions,
  ReviewsSection,
  Contacts,
  Footer,
} from "@/components";
import tutorData from "@/data/tutor.json";

const tutor = tutorData as TutorData;

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero tutor={tutor} />
        <EducationSection items={tutor.education} />
        <CertificatesSection items={tutor.certificates} />
        <Conditions items={tutor.subjects} />
        <ReviewsSection items={tutor.reviews} />
        <Contacts items={tutor.socials} />
      </main>
      <Footer
        firstName={tutor.firstName}
        lastName={tutor.lastName}
        patronymic={tutor.patronymic}
      />
    </>
  );
}
