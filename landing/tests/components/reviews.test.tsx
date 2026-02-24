import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewsSection } from "@/components/reviews";
import type { Review } from "@/types";

// Mock IntersectionObserver (for AnimateOnScroll)
vi.stubGlobal(
  "IntersectionObserver",
  vi.fn(function () {
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  }),
);

const longText =
  "Замечательный преподаватель! Объясняет сложные темы простым и понятным языком. Мой сын значительно улучшил свои оценки по математике за последние полгода. Рекомендую всем, кто ищет опытного репетитора для подготовки к экзаменам.";

const mockReviews: Review[] = [
  {
    author: "Анна Петрова",
    text: "Отличный репетитор!",
    rating: 5,
    source: "Профи.ру",
    date: "15.01.2024",
  },
  {
    author: "Иван Сидоров",
    text: "Хороший преподаватель, рекомендую.",
    rating: 4,
  },
  {
    author: "Мария Иванова",
    text: longText,
    date: "10.03.2024",
  },
  {
    author: "Дмитрий Козлов",
    text: "Прекрасно готовит к ЕГЭ.",
    rating: 5,
    source: "Google",
  },
];

describe("ReviewsSection", () => {
  it("renders review cards with author and text", () => {
    render(<ReviewsSection items={mockReviews} />);

    expect(screen.getByText("Анна Петрова")).toBeInTheDocument();
    expect(screen.getByText("Отличный репетитор!")).toBeInTheDocument();
    expect(screen.getByText("Иван Сидоров")).toBeInTheDocument();
  });

  it("hides section when empty array", () => {
    const { container } = render(<ReviewsSection items={[]} />);

    expect(container.firstChild).not.toBeInTheDocument();
  });

  it("renders rating stars when rating exists", () => {
    render(<ReviewsSection items={[mockReviews[0]]} />);

    const stars = screen.getAllByText("★");
    expect(stars).toHaveLength(5);
  });

  it("does not render stars when rating is absent", () => {
    render(<ReviewsSection items={[mockReviews[2]]} />);

    expect(screen.queryByText("★")).not.toBeInTheDocument();
    expect(screen.queryByText("☆")).not.toBeInTheDocument();
  });

  it('shows "читать полностью" for text > 200 chars', () => {
    render(<ReviewsSection items={[mockReviews[2]]} />);

    expect(screen.getByText("читать полностью")).toBeInTheDocument();
    // Text should be truncated
    expect(screen.queryByText(longText)).not.toBeInTheDocument();
  });

  it("expands text when clicking \"читать полностью\"", () => {
    render(<ReviewsSection items={[mockReviews[2]]} />);

    fireEvent.click(screen.getByText("читать полностью"));

    expect(screen.getByText(longText)).toBeInTheDocument();
    expect(screen.queryByText("читать полностью")).not.toBeInTheDocument();
  });

  it('shows "Показать ещё" button when > 3 reviews', () => {
    render(<ReviewsSection items={mockReviews} />);

    expect(screen.getByText("Показать ещё")).toBeInTheDocument();
    // Only 3 cards visible initially
    expect(screen.getByText("Анна Петрова")).toBeInTheDocument();
    expect(screen.getByText("Иван Сидоров")).toBeInTheDocument();
    expect(screen.getByText("Мария Иванова")).toBeInTheDocument();
    expect(screen.queryByText("Дмитрий Козлов")).not.toBeInTheDocument();
  });

  it('clicking "Показать ещё" shows all reviews', () => {
    render(<ReviewsSection items={mockReviews} />);

    fireEvent.click(screen.getByText("Показать ещё"));

    expect(screen.getByText("Дмитрий Козлов")).toBeInTheDocument();
    expect(screen.queryByText("Показать ещё")).not.toBeInTheDocument();
  });

  it('renders heading "Отзывы"', () => {
    render(<ReviewsSection items={mockReviews} />);

    expect(
      screen.getByRole("heading", { name: "Отзывы" }),
    ).toBeInTheDocument();
  });

  it("renders source badge when source exists", () => {
    render(<ReviewsSection items={mockReviews} />);

    expect(screen.getByText("Профи.ру")).toBeInTheDocument();
  });

  it("renders date when date exists", () => {
    render(<ReviewsSection items={[mockReviews[0]]} />);

    expect(screen.getByText("15.01.2024")).toBeInTheDocument();
  });
});
