import { ThemeProvider } from "@mui/material";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Lesson } from "@shared";

import { theme } from "../../../../../shared/ui/themeConfig";
import { LessonsList } from "../LessonsList";

vi.mock("../components", () => ({
  EmptyState: ({ type }: { type: string }) => (
    <div data-testid="empty-state">EmptyState: {type}</div>
  ),
  InfoMessage: () => <div data-testid="info-message">InfoMessage</div>,
  LessonContextMenu: ({
    anchorEl,
    selectedLesson,
  }: {
    anchorEl: HTMLElement | null;
    selectedLesson: Lesson;
  }) => (
    <div data-testid="lesson-context-menu">
      ContextMenu: {anchorEl ? "open" : "closed"} - {selectedLesson?.id}
    </div>
  ),
  LessonsYear: ({
    year,
    isCollapsed,
    onToggleYear,
    onToggleMonth,
    onCardClick,
    onMenuClick,
  }: {
    year: string;
    isCollapsed: boolean;
    onToggleYear: (year: string) => void;
    onToggleMonth: (year: string, month: string) => void;
    onCardClick: (lesson: Lesson) => void;
    onMenuClick: (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => void;
  }) => (
    <div data-testid={`lessons-year-${year}`}>
      <button onClick={() => onToggleYear(year)} aria-label={`toggle year ${year}`}>
        Year: {year} - {isCollapsed ? "collapsed" : "expanded"}
      </button>
      <button
        onClick={() => onToggleMonth(year, "January")}
        aria-label={`toggle month January`}
      >
        Toggle Month
      </button>
      <button
        onClick={() => onCardClick({ id: `lesson-${year}` } as Lesson)}
        aria-label="click card"
      >
        Click Card
      </button>
      <button
        onClick={(e) => onMenuClick(e, { id: `lesson-${year}` } as Lesson)}
        aria-label="open menu"
      >
        Open Menu
      </button>
    </div>
  ),
  WeeklyView: ({
    lessons,
    onCardClick,
    onMenuClick,
  }: {
    lessons: Lesson[];
    onCardClick?: (lesson: Lesson) => void;
    onMenuClick?: (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => void;
  }) => (
    <div data-testid="weekly-view">
      <div>Lessons: {lessons.length}</div>
      <button onClick={() => onCardClick?.(lessons[0])} aria-label="click weekly card">
        Click Weekly Card
      </button>
      <button onClick={(e) => onMenuClick?.(e, lessons[0])} aria-label="open weekly menu">
        Open Weekly Menu
      </button>
    </div>
  ),
}));

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const createMockLesson = (overrides?: Partial<Lesson>): Lesson => ({
  id: "lesson-1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2026-02-15T10:00:00.000Z",
  endTime: "2026-02-15T11:30:00.000Z",
  price: 2000,
  isPaid: false,
  status: "SCHEDULED",
  isRecurring: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  studentId: "student-1",
  student: {
    id: "student-1",
    name: "Иван Иванов",
    phone: "+79991234567",
    contactMethod: "WHATSAPP",
    archived: false,
  },
  ...overrides,
});

describe("LessonsList", () => {
  const mockOnCardClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("EmptyState rendering", () => {
    it("should show EmptyState when lessons array is empty", () => {
      renderWithTheme(<LessonsList lessons={[]} onCardClick={mockOnCardClick} type="scheduled" />);

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(screen.getByText("EmptyState: scheduled")).toBeInTheDocument();
    });

    it("should show EmptyState for completed type when no lessons", () => {
      renderWithTheme(<LessonsList lessons={[]} onCardClick={mockOnCardClick} type="completed" />);

      expect(screen.getByText("EmptyState: completed")).toBeInTheDocument();
    });

    it("should show EmptyState for cancelled type when no lessons", () => {
      renderWithTheme(<LessonsList lessons={[]} onCardClick={mockOnCardClick} type="cancelled" />);

      expect(screen.getByText("EmptyState: cancelled")).toBeInTheDocument();
    });

    it("should show EmptyState for rescheduled type when no lessons", () => {
      renderWithTheme(
        <LessonsList lessons={[]} onCardClick={mockOnCardClick} type="rescheduled" />
      );

      expect(screen.getByText("EmptyState: rescheduled")).toBeInTheDocument();
    });

    it("should show EmptyState when all lessons are filtered out", () => {
      const completedLesson = createMockLesson({ status: "COMPLETED" });
      renderWithTheme(
        <LessonsList lessons={[completedLesson]} onCardClick={mockOnCardClick} type="scheduled" />
      );

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });

  describe("Lessons rendering with paged view", () => {
    it("should render lessons in paged view by default", () => {
      const lesson1 = createMockLesson({
        id: "lesson-1",
        status: "SCHEDULED",
        startTime: "2026-02-15T10:00:00.000Z",
      });

      renderWithTheme(
        <LessonsList lessons={[lesson1]} onCardClick={mockOnCardClick} type="scheduled" />
      );

      expect(screen.getByTestId("lessons-year-2026")).toBeInTheDocument();
      expect(screen.queryByTestId("weekly-view")).not.toBeInTheDocument();
    });

    it("should render lessons grouped by year", () => {
      const lesson2026 = createMockLesson({
        id: "lesson-2026",
        status: "SCHEDULED",
        startTime: "2026-02-15T10:00:00.000Z",
      });
      const lesson2025 = createMockLesson({
        id: "lesson-2025",
        status: "SCHEDULED",
        startTime: "2025-12-15T10:00:00.000Z",
      });

      renderWithTheme(
        <LessonsList
          lessons={[lesson2026, lesson2025]}
          onCardClick={mockOnCardClick}
          type="scheduled"
        />
      );

      expect(screen.getByTestId("lessons-year-2026")).toBeInTheDocument();
      expect(screen.getByTestId("lessons-year-2025")).toBeInTheDocument();
    });

    it("should render only scheduled lessons when type is scheduled", () => {
      const scheduledLesson = createMockLesson({
        status: "SCHEDULED",
        startTime: "2026-02-15T10:00:00.000Z",
      });
      const completedLesson = createMockLesson({
        status: "COMPLETED",
        startTime: "2026-02-16T10:00:00.000Z",
      });

      renderWithTheme(
        <LessonsList
          lessons={[scheduledLesson, completedLesson]}
          onCardClick={mockOnCardClick}
          type="scheduled"
        />
      );

      expect(screen.getByTestId("lessons-year-2026")).toBeInTheDocument();
    });

    it("should render only completed lessons when type is completed", () => {
      const scheduledLesson = createMockLesson({
        status: "SCHEDULED",
        startTime: "2026-02-15T10:00:00.000Z",
      });
      const completedLesson = createMockLesson({
        status: "COMPLETED",
        startTime: "2026-02-16T10:00:00.000Z",
      });

      renderWithTheme(
        <LessonsList
          lessons={[scheduledLesson, completedLesson]}
          onCardClick={mockOnCardClick}
          type="completed"
        />
      );

      expect(screen.getByTestId("lessons-year-2026")).toBeInTheDocument();
    });
  });

  describe("Weekly view mode", () => {
    it("should render WeeklyView when viewMode is weekly", () => {
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList
          lessons={[lesson]}
          onCardClick={mockOnCardClick}
          type="scheduled"
          viewMode="weekly"
        />
      );

      expect(screen.getByTestId("weekly-view")).toBeInTheDocument();
      expect(screen.queryByTestId("lessons-year-2026")).not.toBeInTheDocument();
    });

    it("should pass filtered lessons to WeeklyView", () => {
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList
          lessons={[lesson]}
          onCardClick={mockOnCardClick}
          type="scheduled"
          viewMode="weekly"
        />
      );

      const weeklyView = screen.getByTestId("weekly-view");
      expect(within(weeklyView).getByText("Lessons: 1")).toBeInTheDocument();
    });

    it("should not render WeeklyView when viewMode is paged", () => {
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList
          lessons={[lesson]}
          onCardClick={mockOnCardClick}
          type="scheduled"
          viewMode="paged"
        />
      );

      expect(screen.queryByTestId("weekly-view")).not.toBeInTheDocument();
      expect(screen.getByTestId("lessons-year-2026")).toBeInTheDocument();
    });
  });

  describe("InfoMessage rendering", () => {
    it("should render InfoMessage when type is scheduled", () => {
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="scheduled" />
      );

      expect(screen.getByTestId("info-message")).toBeInTheDocument();
    });

    it("should not render InfoMessage when type is completed", () => {
      const lesson = createMockLesson({ status: "COMPLETED" });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="completed" />
      );

      expect(screen.queryByTestId("info-message")).not.toBeInTheDocument();
    });

    it("should not render InfoMessage when type is cancelled", () => {
      const lesson = createMockLesson({ status: "CANCELLED" });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="cancelled" />
      );

      expect(screen.queryByTestId("info-message")).not.toBeInTheDocument();
    });

    it("should not render InfoMessage when type is rescheduled", () => {
      const lesson = createMockLesson({ status: "RESCHEDULED" });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="rescheduled" />
      );

      expect(screen.queryByTestId("info-message")).not.toBeInTheDocument();
    });
  });

  describe("onCardClick callback", () => {
    it("should call onCardClick when card is clicked in paged view", async () => {
      const user = userEvent.setup();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="scheduled" />
      );

      await user.click(screen.getByRole("button", { name: "click card" }));

      expect(mockOnCardClick).toHaveBeenCalledTimes(1);
      expect(mockOnCardClick).toHaveBeenCalledWith(expect.objectContaining({ id: "lesson-2026" }));
    });

    it("should call onCardClick when card is clicked in weekly view", async () => {
      const user = userEvent.setup();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList
          lessons={[lesson]}
          onCardClick={mockOnCardClick}
          type="scheduled"
          viewMode="weekly"
        />
      );

      await user.click(screen.getByRole("button", { name: "click weekly card" }));

      expect(mockOnCardClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Year/Month collapsing", () => {
    it("should toggle year collapse state when year header is clicked", async () => {
      const user = userEvent.setup();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="scheduled" />
      );

      const yearButton = screen.getByRole("button", { name: "toggle year 2026" });
      expect(screen.getByText(/Year: 2026 - expanded/)).toBeInTheDocument();

      await user.click(yearButton);

      expect(screen.getByText(/Year: 2026 - collapsed/)).toBeInTheDocument();
    });

    it("should toggle month collapse state when month header is clicked", async () => {
      const user = userEvent.setup();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="scheduled" />
      );

      const monthButton = screen.getByRole("button", { name: "toggle month January" });

      await user.click(monthButton);

      expect(mockOnCardClick).not.toHaveBeenCalled();
    });

    it("should maintain separate collapse states for different years", async () => {
      const user = userEvent.setup();
      const lesson2026 = createMockLesson({
        status: "SCHEDULED",
        startTime: "2026-02-15T10:00:00.000Z",
      });
      const lesson2025 = createMockLesson({
        status: "SCHEDULED",
        startTime: "2025-12-15T10:00:00.000Z",
      });

      renderWithTheme(
        <LessonsList
          lessons={[lesson2026, lesson2025]}
          onCardClick={mockOnCardClick}
          type="scheduled"
        />
      );

      const year2026Button = screen.getByRole("button", { name: "toggle year 2026" });
      await user.click(year2026Button);

      expect(screen.getByText(/Year: 2026 - collapsed/)).toBeInTheDocument();
      expect(screen.getByText(/Year: 2025 - expanded/)).toBeInTheDocument();
    });
  });

  describe("Context menu functionality", () => {
    it("should not render context menu initially", () => {
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="scheduled" />
      );

      expect(screen.queryByTestId("lesson-context-menu")).not.toBeInTheDocument();
    });

    it("should open context menu when menu button is clicked in paged view", async () => {
      const user = userEvent.setup();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="scheduled" />
      );

      await user.click(screen.getByRole("button", { name: "open menu" }));

      expect(screen.getByTestId("lesson-context-menu")).toBeInTheDocument();
    });

    it("should open context menu when menu button is clicked in weekly view", async () => {
      const user = userEvent.setup();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList
          lessons={[lesson]}
          onCardClick={mockOnCardClick}
          type="scheduled"
          viewMode="weekly"
        />
      );

      await user.click(screen.getByRole("button", { name: "open weekly menu" }));

      expect(screen.getByTestId("lesson-context-menu")).toBeInTheDocument();
    });

    it("should pass selected lesson to context menu", async () => {
      const user = userEvent.setup();
      const lesson = createMockLesson({
        id: "test-lesson-id",
        status: "SCHEDULED",
      });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="scheduled" />
      );

      await user.click(screen.getByRole("button", { name: "open menu" }));

      expect(screen.getByText(/lesson-2026/)).toBeInTheDocument();
    });
  });

  describe("Component composition", () => {
    it("should render all components correctly in paged view", () => {
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="scheduled" />
      );

      expect(screen.getByTestId("lessons-year-2026")).toBeInTheDocument();
      expect(screen.getByTestId("info-message")).toBeInTheDocument();
    });

    it("should render all components correctly in weekly view", () => {
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList
          lessons={[lesson]}
          onCardClick={mockOnCardClick}
          type="scheduled"
          viewMode="weekly"
        />
      );

      expect(screen.getByTestId("weekly-view")).toBeInTheDocument();
      expect(screen.getByTestId("info-message")).toBeInTheDocument();
    });

    it("should handle multiple lessons across different years", () => {
      const lessons = [
        createMockLesson({
          id: "lesson-1",
          status: "SCHEDULED",
          startTime: "2026-01-15T10:00:00.000Z",
        }),
        createMockLesson({
          id: "lesson-2",
          status: "SCHEDULED",
          startTime: "2025-12-15T10:00:00.000Z",
        }),
        createMockLesson({
          id: "lesson-3",
          status: "SCHEDULED",
          startTime: "2024-11-15T10:00:00.000Z",
        }),
      ];

      renderWithTheme(
        <LessonsList lessons={lessons} onCardClick={mockOnCardClick} type="scheduled" />
      );

      expect(screen.getByTestId("lessons-year-2026")).toBeInTheDocument();
      expect(screen.getByTestId("lessons-year-2025")).toBeInTheDocument();
      expect(screen.getByTestId("lessons-year-2024")).toBeInTheDocument();
    });

    it("should handle lessons with different statuses correctly", () => {
      const scheduledLesson = createMockLesson({
        status: "SCHEDULED",
        startTime: "2026-02-15T10:00:00.000Z",
      });
      const inProgressLesson = createMockLesson({
        status: "IN_PROGRESS",
        startTime: "2026-02-16T10:00:00.000Z",
      });

      renderWithTheme(
        <LessonsList
          lessons={[scheduledLesson, inProgressLesson]}
          onCardClick={mockOnCardClick}
          type="scheduled"
        />
      );

      expect(screen.getByTestId("lessons-year-2026")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty lessons array with weekly view", () => {
      renderWithTheme(
        <LessonsList
          lessons={[]}
          onCardClick={mockOnCardClick}
          type="scheduled"
          viewMode="weekly"
        />
      );

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(screen.queryByTestId("weekly-view")).not.toBeInTheDocument();
    });

    it("should handle schedule viewMode as paged view", () => {
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList
          lessons={[lesson]}
          onCardClick={mockOnCardClick}
          type="scheduled"
          viewMode="schedule"
        />
      );

      expect(screen.getByTestId("lessons-year-2026")).toBeInTheDocument();
      expect(screen.queryByTestId("weekly-view")).not.toBeInTheDocument();
    });

    it("should not call onCardClick when year toggle is clicked", async () => {
      const user = userEvent.setup();
      const lesson = createMockLesson({ status: "SCHEDULED" });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="scheduled" />
      );

      await user.click(screen.getByRole("button", { name: "toggle year 2026" }));

      expect(mockOnCardClick).not.toHaveBeenCalled();
    });

    it("should handle lesson without student data", () => {
      const lesson = createMockLesson({
        status: "SCHEDULED",
        student: undefined,
      });

      renderWithTheme(
        <LessonsList lessons={[lesson]} onCardClick={mockOnCardClick} type="scheduled" />
      );

      expect(screen.getByTestId("lessons-year-2026")).toBeInTheDocument();
    });
  });
});
