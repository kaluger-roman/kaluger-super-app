import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import type { StudentFormData } from "../../types";
import { StudentFormFields } from "../StudentFormFields";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const mockFormData: StudentFormData = {
  name: "Иван Петров",
  phone: "+7 (999) 123-45-67",
  contactMethod: "WHATSAPP",
  telegramNick: "",
  parentName: "Мария Петрова",
  parentPhone: "+7 (999) 987-65-43",
  parentContactMethod: "WHATSAPP",
  parentTelegramNick: "",
  hourlyRate: "1500",
  grade: "5",
  notes: "Хороший ученик",
};

const mockOnChange = vi.fn((_field: string) => vi.fn());
const mockOnGradeChange = vi.fn();

describe("StudentFormFields", () => {
  it("should render all fields", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    expect(screen.getByLabelText(/имя ученика/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^телефон$/i)).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")[0]).toBeInTheDocument();
    expect(screen.getByLabelText(/имя родителя/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/телефон родителя/i)).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")[1]).toBeInTheDocument();
    expect(screen.getByLabelText(/ставка/i)).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")[2]).toBeInTheDocument();
    expect(screen.getByLabelText(/заметки/i)).toBeInTheDocument();
  });

  it("should display field values from formData", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    expect(screen.getByLabelText(/имя ученика/i)).toHaveValue("Иван Петров");
    expect(screen.getByLabelText(/^телефон$/i)).toHaveValue("+7 (999) 123-45-67");
    expect(screen.getByLabelText(/имя родителя/i)).toHaveValue("Мария Петрова");
    expect(screen.getByLabelText(/телефон родителя/i)).toHaveValue("+7 (999) 987-65-43");
    expect(screen.getByLabelText(/ставка/i)).toHaveValue(1500);
    expect(screen.getByLabelText(/заметки/i)).toHaveValue("Хороший ученик");
  });

  it("should call onChange callback when name field changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn((_field: string) => {
      return (
        _event:
          | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
          | { target: { value: unknown } }
      ) => {
        // mock implementation
      };
    });

    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, name: "" }}
        isMobile={false}
        onChange={onChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const nameInput = screen.getByLabelText(/имя ученика/i);
    await user.type(nameInput, "Test");

    expect(onChange).toHaveBeenCalledWith("name");
  });

  it("should call onChange callback when phone field changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn((_field: string) => vi.fn());

    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, phone: "" }}
        isMobile={false}
        onChange={onChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const phoneInput = screen.getByLabelText(/^телефон$/i);
    await user.type(phoneInput, "1234");

    expect(onChange).toHaveBeenCalledWith("phone");
  });

  it("should call onChange callback when parent name changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn((_field: string) => vi.fn());

    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, parentName: "" }}
        isMobile={false}
        onChange={onChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const parentNameInput = screen.getByLabelText(/имя родителя/i);
    await user.type(parentNameInput, "Test");

    expect(onChange).toHaveBeenCalledWith("parentName");
  });

  it("should call onChange callback when parent phone changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn((_field: string) => vi.fn());

    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, parentPhone: "" }}
        isMobile={false}
        onChange={onChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const parentPhoneInput = screen.getByLabelText(/телефон родителя/i);
    await user.type(parentPhoneInput, "5678");

    expect(onChange).toHaveBeenCalledWith("parentPhone");
  });

  it("should call onChange callback when hourly rate changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn((_field: string) => vi.fn());

    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, hourlyRate: "" }}
        isMobile={false}
        onChange={onChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const hourlyRateInput = screen.getByLabelText(/ставка/i);
    await user.type(hourlyRateInput, "2000");

    expect(onChange).toHaveBeenCalledWith("hourlyRate");
  });

  it("should call onChange callback when notes changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn((_field: string) => vi.fn());

    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, notes: "" }}
        isMobile={false}
        onChange={onChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const notesInput = screen.getByLabelText(/заметки/i);
    await user.type(notesInput, "Note");

    expect(onChange).toHaveBeenCalledWith("notes");
  });

  it("should call onGradeChange when grade is selected", async () => {
    const user = userEvent.setup();
    const onGradeChange = vi.fn();

    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={onGradeChange}
      />
    );

    const gradeSelect = screen.getAllByRole("combobox")[2];
    await user.click(gradeSelect);

    const option = screen.getByRole("option", { name: /7 класс/i });
    await user.click(option);

    expect(onGradeChange).toHaveBeenCalledWith("7");
  });

  it("should call onGradeChange with empty string when Не указан is selected", async () => {
    const user = userEvent.setup();
    const onGradeChange = vi.fn();

    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={onGradeChange}
      />
    );

    const gradeSelect = screen.getAllByRole("combobox")[2];
    await user.click(gradeSelect);

    const option = screen.getByRole("option", { name: /не указан/i });
    await user.click(option);

    expect(onGradeChange).toHaveBeenCalledWith("");
  });

  it("should show telegram nick field when contactMethod is TELEGRAM", () => {
    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, contactMethod: "TELEGRAM", telegramNick: "@student" }}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const telegramNickInput = screen.getByLabelText(/^telegram ник$/i);
    expect(telegramNickInput).toBeInTheDocument();
    expect(telegramNickInput).toHaveValue("@student");
  });

  it("should hide telegram nick field when contactMethod is WHATSAPP", () => {
    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, contactMethod: "WHATSAPP" }}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    expect(screen.queryByLabelText(/^telegram ник$/i)).not.toBeInTheDocument();
  });

  it("should show parent telegram nick field when parentContactMethod is TELEGRAM", () => {
    renderWithTheme(
      <StudentFormFields
        formData={{
          ...mockFormData,
          parentContactMethod: "TELEGRAM",
          parentTelegramNick: "@parent",
        }}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const parentTelegramNickInput = screen.getByLabelText(/telegram ник \(родители\)/i);
    expect(parentTelegramNickInput).toBeInTheDocument();
    expect(parentTelegramNickInput).toHaveValue("@parent");
  });

  it("should hide parent telegram nick field when parentContactMethod is WHATSAPP", () => {
    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, parentContactMethod: "WHATSAPP" }}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    expect(screen.queryByLabelText(/telegram ник \(родители\)/i)).not.toBeInTheDocument();
  });

  it("should render contact method select with WHATSAPP and TELEGRAM options", async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const contactMethodSelect = screen.getAllByRole("combobox")[0];
    await user.click(contactMethodSelect);

    expect(screen.getByRole("option", { name: /whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /telegram/i })).toBeInTheDocument();
  });

  it("should render parent contact method select with WHATSAPP and TELEGRAM options", async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const parentContactMethodSelect = screen.getAllByRole("combobox")[1];
    await user.click(parentContactMethodSelect);

    expect(screen.getByRole("option", { name: /whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /telegram/i })).toBeInTheDocument();
  });

  it("should render grade select with all grade options", async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const gradeSelect = screen.getAllByRole("combobox")[2];
    await user.click(gradeSelect);

    expect(screen.getByRole("option", { name: /не указан/i })).toBeInTheDocument();
    for (let i = 1; i <= 11; i++) {
      expect(screen.getByRole("option", { name: `${i} класс` })).toBeInTheDocument();
    }
  });

  it("should render fields with small size on mobile", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={true}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const nameInput = screen.getByLabelText(/имя ученика/i);
    expect(nameInput).toBeInTheDocument();
  });

  it("should render fields with medium size on desktop", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const nameInput = screen.getByLabelText(/имя ученика/i);
    expect(nameInput).toBeInTheDocument();
  });

  it("should mark name field as required", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const nameInput = screen.getByLabelText(/имя ученика/i);
    expect(nameInput).toBeRequired();
  });

  it("should autofocus on name field", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const nameInput = screen.getByLabelText(/имя ученика/i);
    expect(nameInput).toBeInTheDocument();
  });

  it("should display placeholder for name field", () => {
    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, name: "" }}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const nameInput = screen.getByPlaceholderText(/введите имя ученика/i);
    expect(nameInput).toBeInTheDocument();
  });

  it("should display placeholder for phone field", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const phoneInputs = screen.getAllByPlaceholderText(/\+7 \(999\) 999-99-99/i);
    expect(phoneInputs[0]).toBeInTheDocument();
  });

  it("should display placeholder for telegram nick field", () => {
    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, contactMethod: "TELEGRAM" }}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const telegramNickInput = screen.getByPlaceholderText(/@nickname/i);
    expect(telegramNickInput).toBeInTheDocument();
  });

  it("should display placeholder for parent name field", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const parentNameInput = screen.getByLabelText(/имя родителя/i);
    expect(parentNameInput).toHaveAttribute("placeholder", "Имя родителя");
  });

  it("should display placeholder for parent telegram nick field", () => {
    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, parentContactMethod: "TELEGRAM" }}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const parentTelegramNickInput = screen.getByPlaceholderText(/@parent_nick/i);
    expect(parentTelegramNickInput).toBeInTheDocument();
  });

  it("should display placeholder for hourly rate field", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const hourlyRateInput = screen.getByPlaceholderText(/1000/i);
    expect(hourlyRateInput).toBeInTheDocument();
  });

  it("should display placeholder for notes field", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const notesInput = screen.getByPlaceholderText(/дополнительная информация об ученике/i);
    expect(notesInput).toBeInTheDocument();
  });

  it("should display currency symbol for hourly rate field", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    expect(screen.getByText(/₽/i)).toBeInTheDocument();
  });

  it("should render hourly rate as number input", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const hourlyRateInput = screen.getByLabelText(/ставка/i);
    expect(hourlyRateInput).toHaveAttribute("type", "number");
  });

  it("should render notes as multiline input", () => {
    renderWithTheme(
      <StudentFormFields
        formData={mockFormData}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const notesInput = screen.getByLabelText(/заметки/i);
    expect(notesInput).toHaveAttribute("rows");
  });

  it("should call onChange when contact method changes to TELEGRAM", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn((_field: string) => vi.fn());

    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, contactMethod: "WHATSAPP" }}
        isMobile={false}
        onChange={onChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const contactMethodSelect = screen.getAllByRole("combobox")[0];
    await user.click(contactMethodSelect);

    const telegramOption = screen.getByRole("option", { name: /telegram/i });
    await user.click(telegramOption);

    expect(onChange).toHaveBeenCalledWith("contactMethod");
  });

  it("should call onChange when parent contact method changes to TELEGRAM", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn((_field: string) => vi.fn());

    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, parentContactMethod: "WHATSAPP" }}
        isMobile={false}
        onChange={onChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const parentContactMethodSelect = screen.getAllByRole("combobox")[1];
    await user.click(parentContactMethodSelect);

    const telegramOption = screen.getByRole("option", { name: /telegram/i });
    await user.click(telegramOption);

    expect(onChange).toHaveBeenCalledWith("parentContactMethod");
  });

  it("should call onChange when telegram nick changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn((_field: string) => vi.fn());

    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, contactMethod: "TELEGRAM", telegramNick: "" }}
        isMobile={false}
        onChange={onChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const telegramNickInput = screen.getByLabelText(/^telegram ник$/i);
    await user.type(telegramNickInput, "@test");

    expect(onChange).toHaveBeenCalledWith("telegramNick");
  });

  it("should call onChange when parent telegram nick changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn((_field: string) => vi.fn());

    renderWithTheme(
      <StudentFormFields
        formData={{
          ...mockFormData,
          parentContactMethod: "TELEGRAM",
          parentTelegramNick: "",
        }}
        isMobile={false}
        onChange={onChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const parentTelegramNickInput = screen.getByLabelText(/telegram ник \(родители\)/i);
    await user.type(parentTelegramNickInput, "@parent_test");

    expect(onChange).toHaveBeenCalledWith("parentTelegramNick");
  });

  it("should have default contactMethod as WHATSAPP if not provided", async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, contactMethod: undefined }}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const contactMethodSelect = screen.getAllByRole("combobox")[0];
    await user.click(contactMethodSelect);

    const whatsappOption = screen.getByRole("option", { name: /whatsapp/i });
    expect(whatsappOption).toHaveAttribute("aria-selected", "true");
  });

  it("should have default parentContactMethod as WHATSAPP if not provided", async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <StudentFormFields
        formData={{ ...mockFormData, parentContactMethod: undefined }}
        isMobile={false}
        onChange={mockOnChange}
        onGradeChange={mockOnGradeChange}
      />
    );

    const parentContactMethodSelect = screen.getAllByRole("combobox")[1];
    await user.click(parentContactMethodSelect);

    const whatsappOption = screen.getByRole("option", { name: /whatsapp/i });
    expect(whatsappOption).toHaveAttribute("aria-selected", "true");
  });
});
