// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Headline } from "./Headline";

describe("Headline", () => {
  it("highlights toned parts", () => {
    const { container } = render(
      <Headline headline={{ parts: [{ text: "Great food, but " }, { text: "slow service", tone: "negative" }, { text: "." }] }} />,
    );
    expect(container.textContent).toBe("Great food, but slow service.");
    expect(container.querySelector('[data-tone="negative"]')?.textContent).toBe("slow service");
  });

  it("renders markup inside data as plain text", () => {
    const { container } = render(
      <Headline headline={{ parts: [{ text: "<script>alert(1)</script>", tone: "negative" }] }} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toBe("<script>alert(1)</script>");
  });
});
