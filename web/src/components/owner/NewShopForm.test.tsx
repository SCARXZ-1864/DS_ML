// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ActionState } from "@/lib/data/schemas";
import { NewShopForm } from "./NewShopForm";

describe("NewShopForm", () => {
  it("shows the name error the action returns", async () => {
    const action = async (): Promise<ActionState> => ({ ok: false, fieldErrors: { name: "Give the shop a name" } });
    render(<NewShopForm action={action} />);
    fireEvent.submit(screen.getByRole("button", { name: "Create shop" }).closest("form")!);
    expect(await screen.findByText("Give the shop a name")).toBeTruthy();
    expect(screen.getByLabelText("Shop name").getAttribute("aria-invalid")).toBe("true");
  });

  it("offers every shop type", () => {
    render(<NewShopForm action={async () => ({ ok: true })} />);
    const options = [...(screen.getByLabelText("Type of shop") as HTMLSelectElement).options].map((o) => o.value);
    expect(options).toEqual(["restaurant", "grocery", "electronics", "clothing", "salon", "other"]);
  });
});
