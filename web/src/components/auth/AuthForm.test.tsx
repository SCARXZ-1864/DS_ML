// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ActionState } from "@/lib/data/schemas";
import { AuthForm } from "./AuthForm";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const rejectPassword = async (): Promise<ActionState> => ({ ok: false, fieldErrors: { password: "Use at least 8 characters" } });

describe("AuthForm", () => {
  it("shows a field error next to its input and marks the input invalid", async () => {
    render(<AuthForm mode="signup" action={rejectPassword} next="/app" />);
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);
    expect(await screen.findByText("Use at least 8 characters")).toBeTruthy();
    expect(screen.getByLabelText("Password").getAttribute("aria-invalid")).toBe("true");
  });

  it("explains the mock sign-in on the login form", () => {
    render(<AuthForm mode="login" action={rejectPassword} next="/app" />);
    expect(screen.getByText(/any email and password work/)).toBeTruthy();
    expect(screen.getByText(/owner@demo\.test/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create an account" }).getAttribute("href")).toBe("/signup?next=%2Fapp");
  });

  it("carries where to go next in a hidden field", () => {
    const { container } = render(<AuthForm mode="login" action={rejectPassword} next="/shops/a/overview" />);
    expect((container.querySelector('input[name="next"]') as HTMLInputElement).value).toBe("/shops/a/overview");
  });
});
