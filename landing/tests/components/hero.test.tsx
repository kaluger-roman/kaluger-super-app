import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "@/components/hero";
import type { TutorData } from "@/types";

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt as string} className={className as string} />
  ),
}));

vi.stubGlobal(
  "IntersectionObserver",
  vi.fn(function (this: unknown) {
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  })
);

const mockTutor: TutorData = {
  firstName: "Роман",
  lastName: "Калугер",
  patronymic: "Юрьевич",
  photo: "/images/photo.webp",
  tagline: "Репетитор по математике",
  about: "Текст о репетиторе",
  experience: 7,
  education: [],
  certificates: [],
  reviews: [],
  subjects: [],
  socials: [],
  seo: { title: "Title", description: "Desc", ogImage: "/og.webp" },
};

describe("Hero", () => {
  it("should render full name (lastName, firstName, patronymic)", () => {
    render(<Hero tutor={mockTutor} />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Калугер");
    expect(heading).toHaveTextContent("Роман");
    expect(heading).toHaveTextContent("Юрьевич");
  });

  it("should render tagline", () => {
    render(<Hero tutor={mockTutor} />);

    expect(screen.getByText("Репетитор по математике")).toBeInTheDocument();
  });

  it("should render photo with alt text", () => {
    render(<Hero tutor={mockTutor} />);

    const img = screen.getByAltText("Калугер Роман Юрьевич");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/photo.webp");
  });

  it('should render CTA button "Связаться" with href="#contacts"', () => {
    render(<Hero tutor={mockTutor} />);

    const ctaLink = screen.getByRole("link", { name: "Связаться" });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "#contacts");
  });

  it("should render experience text", () => {
    render(<Hero tutor={mockTutor} />);

    expect(screen.getByText("7 лет опыта")).toBeInTheDocument();
  });
});
