import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { TextField } from "../TextField";

describe("TextField", () => {
  it("should render text field with label", () => {
    render(<TextField label="Email" />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("should update value when typing", async () => {
    const handleChange = vi.fn();
    render(<TextField label="Name" onChange={handleChange} />);

    const input = screen.getByLabelText(/name/i);
    await userEvent.type(input, "John");

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue("John");
  });

  it("should display error message", () => {
    render(<TextField label="Email" error helperText="Invalid email" />);
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", () => {
    render(<TextField label="Disabled" disabled />);
    expect(screen.getByLabelText(/disabled/i)).toBeDisabled();
  });

  it("should render with different variants", () => {
    const { rerender } = render(<TextField label="Field" variant="outlined" />);
    expect(screen.getByLabelText(/field/i)).toBeInTheDocument();

    rerender(<TextField label="Field" variant="filled" />);
    expect(screen.getByLabelText(/field/i)).toBeInTheDocument();

    rerender(<TextField label="Field" variant="standard" />);
    expect(screen.getByLabelText(/field/i)).toBeInTheDocument();
  });

  it("should handle required field", () => {
    render(<TextField label="Required" required />);
    expect(screen.getByLabelText(/required/i)).toBeInTheDocument();
  });

  it("should render with placeholder", () => {
    render(<TextField placeholder="Enter text..." />);
    expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument();
  });

  it("should render multiline text field", () => {
    render(<TextField label="Notes" multiline rows={4} />);
    const textarea = screen.getByLabelText(/notes/i);
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("should pass through value prop", () => {
    render(<TextField label="Email" value="test@example.com" onChange={vi.fn()} />);
    expect(screen.getByLabelText(/email/i)).toHaveValue("test@example.com");
  });
});
