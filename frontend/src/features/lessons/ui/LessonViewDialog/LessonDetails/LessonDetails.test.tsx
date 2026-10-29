import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider } from "effector-react";
import { beforeEach, describe, it, expect, vi } from "vitest";

import { lessonCallsModel, userModel } from "@entities";
import { getLessonCalls } from "@entities/callRecord/api";
import { theme } from "@shared";
import type { Lesson, User } from "@shared";

import { LessonDetails } from "./LessonDetails";

vi.mock("@entities/callRecord/api", () => ({
  getCallHistory: vi.fn(),
  getLessonCalls: vi.fn(),
}));

const mockedGetLessonCalls = vi.mocked(getLessonCalls);

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("LessonDetails", () => {
  beforeEach(() => {
    mockedGetLessonCalls.mockReset();
    mockedGetLessonCalls.mockResolvedValue([]);
  });

  const mockLesson: Lesson = {
    id: "1",
    subject: "PHYSICS",
    lessonType: "EGE",
    description: "Test description",
    startTime: "2026-01-15T10:00:00.000Z",
    endTime: "2026-01-15T11:00:00.000Z",
    price: 1500,
    isPaid: false,
    status: "SCHEDULED",
    homework: "Do exercises 1-10",
    notes: "Important notes",
    studentId: "student-1",
    student: {
      archived: false,
      id: "student-1",
      name: "Иван Иванов",
      phone: "+79991234567",
      contactMethod: "WHATSAPP",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("should render student name", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText("👤")).toBeInTheDocument();
    expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
  });

  it("should render subject and lesson type", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText(/Физика.*ЕГЭ/)).toBeInTheDocument();
  });

  it("should render price when provided", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText(/1500 ₽/)).toBeInTheDocument();
  });

  it("should render free when no price", () => {
    const lessonWithoutPrice = { ...mockLesson, price: undefined };
    renderWithTheme(<LessonDetails lesson={lessonWithoutPrice} />);
    expect(screen.getByText(/Бесплатно/)).toBeInTheDocument();
  });

  it("should render start time", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText(/Начало:/)).toBeInTheDocument();
  });

  it("should render end time", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText(/Окончание:/)).toBeInTheDocument();
  });

  it("should render description when provided", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText("📝 Описание")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("should not render description section when not provided", () => {
    const lessonWithoutDescription = { ...mockLesson, description: undefined };
    renderWithTheme(<LessonDetails lesson={lessonWithoutDescription} />);
    expect(screen.queryByText("📝 Описание")).not.toBeInTheDocument();
  });

  it("should render homework when provided", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText("📖 Домашнее задание")).toBeInTheDocument();
    expect(screen.getByText("Do exercises 1-10")).toBeInTheDocument();
  });

  it("should not render homework section when not provided", () => {
    const lessonWithoutHomework = { ...mockLesson, homework: undefined };
    renderWithTheme(<LessonDetails lesson={lessonWithoutHomework} />);
    expect(screen.queryByText("📖 Домашнее задание")).not.toBeInTheDocument();
  });

  it("should render notes when provided", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText("🗒️ Заметки")).toBeInTheDocument();
    expect(screen.getByText("Important notes")).toBeInTheDocument();
  });

  it("should not render notes section when not provided", () => {
    const lessonWithoutNotes = { ...mockLesson, notes: undefined };
    renderWithTheme(<LessonDetails lesson={lessonWithoutNotes} />);
    expect(screen.queryByText("🗒️ Заметки")).not.toBeInTheDocument();
  });

  it("should render grade when provided", () => {
    const lessonWithGrade = { ...mockLesson, grade: 5 };
    renderWithTheme(<LessonDetails lesson={lessonWithGrade} />);
    expect(screen.getByText("⭐ Оценка")).toBeInTheDocument();
  });

  it("should not render grade section when not provided", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.queryByText("⭐ Оценка")).not.toBeInTheDocument();
  });

  it("should render time section", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);
    expect(screen.getByText("📅 Время")).toBeInTheDocument();
  });

  it("should render mathematics subject correctly", () => {
    const mathLesson = { ...mockLesson, subject: "MATHEMATICS" as const };
    renderWithTheme(<LessonDetails lesson={mathLesson} />);
    expect(screen.getByText(/Математика/)).toBeInTheDocument();
  });

  it("should render different lesson types", () => {
    const ogeLesson = { ...mockLesson, lessonType: "OGE" as const };
    renderWithTheme(<LessonDetails lesson={ogeLesson} />);
    expect(screen.getByText(/ОГЭ/)).toBeInTheDocument();
  });

  it("should render recurring lesson indicator when applicable", () => {
    const recurringLesson = { ...mockLesson, isRecurring: true };
    renderWithTheme(<LessonDetails lesson={recurringLesson} />);
    // Component should show some indication of recurring status
  });
  it("should render the full commission badge for a fact credit", () => {
    renderWithTheme(
      <LessonDetails
        lesson={{ ...mockLesson, commissionCredit: { amount: 1000, state: "FACT" } }}
      />
    );

    expect(screen.getByText(/^в счёт комиссии: /)).toBeInTheDocument();
    expect(screen.getByTestId("HandshakeIcon")).toBeInTheDocument();
  });

  it("should render the full commission badge for a forecast credit", () => {
    renderWithTheme(
      <LessonDetails
        lesson={{ ...mockLesson, commissionCredit: { amount: 500, state: "FORECAST" } }}
      />
    );

    expect(screen.getByText(/^план, в счёт комиссии: ~/)).toBeInTheDocument();
    expect(screen.getByTestId("HandshakeOutlinedIcon")).toBeInTheDocument();
  });

  it("should render no commission badge without a credit", () => {
    renderWithTheme(<LessonDetails lesson={mockLesson} />);

    expect(screen.queryByTestId("HandshakeIcon")).toBeNull();
    expect(screen.queryByTestId("HandshakeOutlinedIcon")).toBeNull();
  });

  describe("received amount mark", () => {
    it("should show the received amount next to the price when it differs", () => {
      renderWithTheme(
        <LessonDetails lesson={{ ...mockLesson, isPaid: true, receivedAmount: 1800 }} />
      );

      expect(screen.getByText(/^получено 1\s800\s₽$/)).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: /^Получено 1\s800\s₽, стоимость урока 1\s500\s₽$/ })
      ).toBeInTheDocument();
    });

    it("should show nothing received for a paid lesson with zero received amount", () => {
      renderWithTheme(
        <LessonDetails lesson={{ ...mockLesson, isPaid: true, receivedAmount: 0 }} />
      );

      expect(screen.getByText(/^получено 0\s₽$/)).toBeInTheDocument();
    });

    it("should not show the mark when the received amount equals the price", () => {
      renderWithTheme(
        <LessonDetails lesson={{ ...mockLesson, isPaid: true, receivedAmount: 1500 }} />
      );

      expect(screen.queryByText(/получено/i)).not.toBeInTheDocument();
    });

    it("should not show the mark for an unpaid lesson", () => {
      renderWithTheme(
        <LessonDetails lesson={{ ...mockLesson, isPaid: false, receivedAmount: 1800 }} />
      );

      expect(screen.queryByText(/получено/i)).not.toBeInTheDocument();
    });
  });

  describe("tax-exempt switch", () => {
    const tutor = (taxEnabled: boolean): User => ({
      id: "user-1",
      email: "tutor@test.local",
      name: "Учитель",
      createdAt: "2026-01-01T00:00:00.000Z",
      isEmailVerified: true,
      taxEnabled,
    });

    const renderWithTax = (taxEnabled: boolean, lesson: Lesson) =>
      render(
        <Provider value={fork({ values: [[userModel.$user, tutor(taxEnabled)]] })}>
          <ThemeProvider theme={theme}>
            <LessonDetails lesson={lesson} />
          </ThemeProvider>
        </Provider>
      );

    it.each([true, false])(
      "should show the switch with isTaxExempt = %s when tax accounting is enabled",
      (isTaxExempt) => {
        renderWithTax(true, { ...mockLesson, isTaxExempt });

        const control = screen.getByRole("switch", { name: "Не облагается налогом" });
        expect((control as HTMLInputElement).checked).toBe(isTaxExempt);
      }
    );

    it("should hide the switch when tax accounting is disabled", () => {
      renderWithTax(false, { ...mockLesson, isTaxExempt: true });

      expect(screen.queryByRole("switch", { name: "Не облагается налогом" })).toBeNull();
    });
  });

  it("should show the calls of the lesson when there are any", async () => {
    mockedGetLessonCalls.mockResolvedValue([
      {
        id: "call-1",
        peerName: "Иван Иванов",
        direction: "outgoing",
        startedAt: "2026-01-15T10:01:00.000Z",
        durationSeconds: 1800,
        status: "COMPLETED",
        lesson: null,
      },
    ]);
    render(
      <Provider value={fork()}>
        <ThemeProvider theme={theme}>
          <LessonDetails lesson={mockLesson} />
        </ThemeProvider>
      </Provider>
    );

    expect(await screen.findByRole("list", { name: "Звонки по уроку" })).toBeInTheDocument();
    expect(mockedGetLessonCalls).toHaveBeenCalledWith("1");
  });

  it("should not show a calls block for a lesson without calls", async () => {
    const scope = fork();
    render(
      <Provider value={scope}>
        <ThemeProvider theme={theme}>
          <LessonDetails lesson={mockLesson} />
        </ThemeProvider>
      </Provider>
    );

    await vi.waitFor(() => {
      expect(mockedGetLessonCalls).toHaveBeenCalledWith("1");
      expect(scope.getState(lessonCallsModel.loadLessonCallsFx.inFlight)).toBe(0);
    });
    expect(screen.queryByText("📞 Звонки по уроку")).not.toBeInTheDocument();
  });
});
