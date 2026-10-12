import { Dialog, ThemeProvider } from "@mui/material";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { theme } from "../../themeConfig";
import { ReceivedAmountHint } from "../ReceivedAmountHint";
import {
  RECEIVED_MISMATCH_FIX_HINT,
  RECEIVED_MISMATCH_REASON,
} from "../ReceivedAmountHint.constants";

const MISMATCH_LABEL = /^Получено 2\s000\s₽, стоимость урока 2\s500\s₽$/;

const renderHint = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const hint = () => screen.getByRole("img", { name: MISMATCH_LABEL });

describe("ReceivedAmountHint", () => {
  it("should render nothing when the received amount equals the price", () => {
    const { container } = renderHint(<ReceivedAmountHint receivedAmount={2000} price={2000} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should render nothing when the amounts differ by less than a kopeck", () => {
    const { container } = renderHint(<ReceivedAmountHint receivedAmount={0.1 + 0.2} price={0.3} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should render nothing without a received amount", () => {
    const { container } = renderHint(<ReceivedAmountHint receivedAmount={null} price={2000} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should render an icon labelled with both amounts on a mismatch", () => {
    renderHint(<ReceivedAmountHint receivedAmount={2000} price={2500} />);

    expect(hint()).toBeInTheDocument();
    expect(screen.queryByText(/получено/)).not.toBeInTheDocument();
  });

  it("should show the received amount in the full variant", () => {
    renderHint(<ReceivedAmountHint receivedAmount={0} price={2000} variant="full" />);

    expect(screen.getByText(/^получено 0\s₽$/)).toBeInTheDocument();
  });

  it("should open the hint with the reason and the fix on mouse hover", async () => {
    const user = userEvent.setup();
    renderHint(<ReceivedAmountHint receivedAmount={2000} price={2500} />);

    await user.hover(hint());

    expect(await screen.findByText(RECEIVED_MISMATCH_REASON)).toBeInTheDocument();
    expect(screen.getByText(RECEIVED_MISMATCH_FIX_HINT)).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent(/Получено 2\s000\s₽/);
  });

  it("should open the hint on keyboard focus", async () => {
    renderHint(<ReceivedAmountHint receivedAmount={2000} price={2500} />);

    fireEvent.focus(hint());

    expect(await screen.findByText(RECEIVED_MISMATCH_REASON)).toBeInTheDocument();
  });

  it("should open the hint on tap without opening the lesson behind it", async () => {
    const parentClick = vi.fn();
    renderHint(
      <div onClick={parentClick}>
        <ReceivedAmountHint receivedAmount={2000} price={2500} />
      </div>
    );

    const element = hint();
    fireEvent.pointerEnter(element, { pointerType: "touch" });
    fireEvent.click(element);
    fireEvent.pointerLeave(element, { pointerType: "touch" });

    expect(await screen.findByText(RECEIVED_MISMATCH_REASON)).toBeInTheDocument();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it.each(["Enter", " "])("should not pass the %j activation key to the row behind it", (key) => {
    const parentKeyDown = vi.fn();
    renderHint(
      <div role="presentation" onKeyDown={parentKeyDown}>
        <ReceivedAmountHint receivedAmount={2000} price={2500} />
      </div>
    );

    fireEvent.keyDown(hint(), { key });

    expect(parentKeyDown).not.toHaveBeenCalled();
  });

  it("should not scroll the page on Space", () => {
    renderHint(<ReceivedAmountHint receivedAmount={2000} price={2500} />);

    const isNotCancelled = fireEvent.keyDown(hint(), { key: " " });

    expect(isNotCancelled).toBe(false);
  });

  it("should keep the default action of Enter", () => {
    renderHint(<ReceivedAmountHint receivedAmount={2000} price={2500} />);

    expect(fireEvent.keyDown(hint(), { key: "Enter" })).toBe(true);
  });

  it("should let Escape close the dialog it sits in", () => {
    const onClose = vi.fn();
    renderHint(
      <Dialog open onClose={onClose}>
        <ReceivedAmountHint receivedAmount={2000} price={2500} />
      </Dialog>
    );

    fireEvent.keyDown(hint(), { key: "Escape" });

    expect(onClose).toHaveBeenCalledWith(expect.anything(), "escapeKeyDown");
  });
});
