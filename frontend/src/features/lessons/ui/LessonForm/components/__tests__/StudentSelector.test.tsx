import { ThemeProvider } from "@mui/material";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider } from "effector-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { studentModel } from "@entities";
import { theme } from "@shared";
import type { Student } from "@shared";

import type { LessonFormData } from "../../types";
import { StudentSelector } from "../StudentSelector";

const makeStudent = (over: Partial<Student> = {}): Student => ({
  id: "s-1",
  name: "Иван Иванов",
  phone: "+79991234567",
  contactMethod: "WHATSAPP",
  archived: false,
  hourlyRate: 2000,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const baseFormData: LessonFormData = {
  studentId: "",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  description: "",
  startTime: new Date("2026-03-01T10:00:00.000Z"),
  endTime: new Date("2026-03-01T11:30:00.000Z"),
  price: "2000",
  homework: "",
  notes: "",
  isRecurring: false,
  isPaid: false,
  isHomeworkSentByTeacher: false,
};

const renderWith = (
  students: Student[],
  archived: Student[],
  props: Partial<React.ComponentProps<typeof StudentSelector>> = {},
) => {
  const scope = fork({
    values: [
      [studentModel.$students, students],
      [studentModel.$archivedStudents, archived],
    ],
  });

  const onChange = props.onChange ?? vi.fn();

  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>
        <StudentSelector
          formData={baseFormData}
          errors={{}}
          isLoading={false}
          isMobile={false}
          {...props}
          onChange={onChange}
        />
      </ThemeProvider>
    </Provider>,
  );

  return { onChange };
};

describe("StudentSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should filter options by case-insensitive substring of student name", async () => {
    const user = userEvent.setup();
    const ivan = makeStudent({ id: "s-1", name: "Иван Иванов" });
    const petya = makeStudent({ id: "s-2", name: "Пётр Петров" });
    const masha = makeStudent({ id: "s-3", name: "Маша Сидорова" });

    renderWith([ivan, petya, masha], []);

    const input = screen.getByRole("combobox", { name: /ученик/i });
    await user.click(input);
    await user.type(input, "пет");

    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Пётр Петров")).toBeInTheDocument();
    expect(within(listbox).queryByText("Иван Иванов")).not.toBeInTheDocument();
    expect(within(listbox).queryByText("Маша Сидорова")).not.toBeInTheDocument();
  });

  it("should show 'Учеников не найдено' when no match", async () => {
    const user = userEvent.setup();
    renderWith([makeStudent({ name: "Иван" })], []);

    const input = screen.getByRole("combobox", { name: /ученик/i });
    await user.click(input);
    await user.type(input, "xyz");

    expect(await screen.findByText("Учеников не найдено")).toBeInTheDocument();
  });

  it("should call onChange with selected student id when option is picked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockReturnValue(vi.fn());
    const inner = vi.fn();
    onChange.mockReturnValue(inner);

    const ivan = makeStudent({ id: "s-1", name: "Иван Иванов" });
    const petya = makeStudent({ id: "s-2", name: "Пётр Петров" });

    renderWith([ivan, petya], [], { onChange });

    const input = screen.getByRole("combobox", { name: /ученик/i });
    await user.click(input);
    const option = await screen.findByText("Пётр Петров");
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith("studentId");
    expect(inner).toHaveBeenCalledWith({ target: { value: "s-2" } });
  });

  it("should show the student grade in the option when present", async () => {
    const user = userEvent.setup();
    const ivan = makeStudent({ id: "s-1", name: "Иван Иванов", grade: 9 });

    renderWith([ivan], []);

    const input = screen.getByRole("combobox", { name: /ученик/i });
    await user.click(input);

    expect(await screen.findByText("9 класс")).toBeInTheDocument();
  });

  it("should not show a grade row when grade is not set", async () => {
    const user = userEvent.setup();
    const ivan = makeStudent({ id: "s-1", name: "Иван Иванов", grade: null });

    renderWith([ivan], []);

    const input = screen.getByRole("combobox", { name: /ученик/i });
    await user.click(input);

    expect(screen.queryByText(/класс$/)).not.toBeInTheDocument();
  });

  it("should use archived students when editing a completed lesson", async () => {
    const user = userEvent.setup();
    const active = makeStudent({ id: "active-1", name: "Активный" });
    const archived = makeStudent({ id: "arch-1", name: "Архивный", archived: true });

    renderWith([active], [archived], {
      lesson: {
        id: "lesson-1",
        status: "COMPLETED",
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z",
        price: 1000,
        isPaid: false,
        isRecurring: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        studentId: "arch-1",
      },
      formData: { ...baseFormData, studentId: "arch-1" },
    });

    const input = screen.getByRole("combobox", { name: /ученик/i });
    expect(input).toBeDisabled();
    await user.click(input);

    expect(screen.queryByText("Активный")).not.toBeInTheDocument();
  });
});
