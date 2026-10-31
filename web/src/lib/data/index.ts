import type { MonthRange } from "./derive";
import { mockDataSource } from "./mock";
import type {
  AlertEvent, AlertRule, Aspect, ChatChunk, GoogleLocation, NewShopInput, Overview, Prediction, Review, Report, ReviewPage, ReviewQuery, ShareInput, ShareLink, Shop, Source,
  Topic, Upload, UploadRequest, User,
} from "./schemas";

// The single entry point every page uses for data. Server-side only: client
// components receive plain data as props and must never import this module.
export interface DataSource {
  /** Demo shops plus the shops the given user owns (demo shops only when null). */
  listShops(userId: string | null): Promise<Shop[]>;
  getShop(id: string): Promise<Shop | null>;
  /** The owning user's id, or null for demo shops. Access decisions use this (see lib/auth/access.ts). */
  getShopOwner(id: string): Promise<string | null>;
  createShop(userId: string, input: NewShopInput): Promise<Shop>;
  getUser(id: string): Promise<User | null>;
  saveUser(user: User): Promise<User>;
  getOverview(id: string, range?: Partial<MonthRange>): Promise<Overview | null>;
  getAspects(id: string, range?: Partial<MonthRange>): Promise<Aspect[] | null>;
  getReviewsByIds(id: string, ids: string[]): Promise<Review[]>;
  getTopics(id: string): Promise<Topic[] | null>;
  getReviews(id: string, query: ReviewQuery): Promise<ReviewPage | null>;
  ask(id: string, question: string): Promise<AsyncIterable<ChatChunk> | null>;
  predict(id: string, text: string): Promise<Prediction | null>;

  // Uploads: newest first. Processing runs in the background; poll getUpload for progress.
  listUploads(shopId: string): Promise<Upload[]>;
  startUpload(shopId: string, req: UploadRequest): Promise<Upload>;
  getUpload(shopId: string, uploadId: string): Promise<Upload | null>;

  // Review sources. A Google sync runs in the background; the source shows "syncing" meanwhile.
  listSources(shopId: string): Promise<Source[]>;
  listGoogleLocations(shopId: string): Promise<GoogleLocation[]>;
  /** Null when the location isn't one of the account's. */
  connectGoogle(shopId: string, input: { locationId: string; accountLabel: string }): Promise<Source | null>;
  syncSource(shopId: string, sourceId: string): Promise<Source | null>;
  disconnectSource(shopId: string, sourceId: string): Promise<Source | null>;

  // Alerts: rules an owner sets, and the alerts they raised (newest first).
  listAlertRules(shopId: string): Promise<AlertRule[]>;
  /** Adds the rule when its id is empty, otherwise replaces the rule with that id. */
  saveAlertRule(rule: AlertRule): Promise<AlertRule>;
  deleteAlertRule(shopId: string, ruleId: string): Promise<void>;
  listAlertEvents(shopId: string): Promise<AlertEvent[]>;
  markAlertsRead(shopId: string): Promise<void>;

  // Share links: read-only reports anyone with the token can open.
  listShareLinks(shopId: string): Promise<ShareLink[]>;
  createShareLink(shopId: string, input: ShareInput): Promise<ShareLink>;
  /** Null when the token isn't one of this shop's links. */
  revokeShareLink(shopId: string, token: string): Promise<ShareLink | null>;
  /** Counts a view. Null for unknown and revoked tokens alike, so a link's history isn't revealed. */
  getReport(token: string): Promise<Report | null>;
}

// The one line later parts change: swap the mock for the real API-backed source.
export const data: DataSource = mockDataSource;

export type { MonthRange } from "./derive";
export type * from "./schemas";
