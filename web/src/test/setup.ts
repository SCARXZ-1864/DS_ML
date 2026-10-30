import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount whatever a component test rendered, so tests never see each other's DOM.
afterEach(() => cleanup());
