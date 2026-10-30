// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

it("renders JSX into a jsdom document", () => {
  render(<p>tooling works</p>);
  expect(screen.getByText("tooling works")).toBeTruthy();
});
