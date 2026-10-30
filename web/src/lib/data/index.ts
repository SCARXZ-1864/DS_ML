import type { MonthRange } from "./derive";
import { mockDataSource } from "./mock";
import type { Aspect, Overview, Review, Shop } from "./schemas";

// The single entry point every page uses for data. Server-side only: client
// components receive plain data as props and must never import this module.
export interface DataSource {
  listShops(): Promise<Shop[]>;
  getShop(id: string): Promise<Shop | null>;
  getOverview(id: string, range?: Partial<MonthRange>): Promise<Overview | null>;
  getAspects(id: string, range?: Partial<MonthRange>): Promise<Aspect[] | null>;
  getReviewsByIds(id: string, ids: string[]): Promise<Review[]>;
}

// The one line later parts change: swap the mock for the real API-backed source.
export const data: DataSource = mockDataSource;

export type { MonthRange } from "./derive";
export type * from "./schemas";
