import { z } from "zod";

// The data contract: every screen receives data in exactly these shapes, whether it
// comes from mock files (now) or the real API (later parts). One definition gives
// both the TypeScript types and runtime validation.

export const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthKey = z.string().regex(MONTH_KEY, "expected YYYY-MM");
const isoDate = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "expected YYYY-MM-DD");
const count = z.number().int().nonnegative();
const percent = z.number().min(0).max(100);

export const ShopTypeSchema = z.enum(["restaurant", "grocery", "electronics", "clothing", "salon", "other"]);
export const ToneSchema = z.enum(["positive", "negative", "neutral"]);

export const ShopSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: ShopTypeSchema,
  isDemo: z.boolean(),
  reviewCount: count,
  dateRange: z.object({ from: monthKey, to: monthKey }),
  lastUploadAt: isoDate.optional(),
  unreadAlerts: count,
});

// Structured parts, never HTML: owner-uploaded text must not be able to inject markup.
export const HeadlineSchema = z.object({
  parts: z.array(z.object({ text: z.string().min(1), tone: ToneSchema.optional() })).min(1),
});

export const MonthPointSchema = z
  .object({
    month: monthKey,
    count,
    pos: count,
    neg: count,
    neu: count,
    // Review counts for 1★..5★; null when the data has no star ratings.
    stars: z.array(count).length(5).nullable().optional(),
  })
  .refine((p) => p.pos + p.neg + p.neu === p.count, { message: "pos + neg + neu must equal count" })
  .refine((p) => !p.stars || p.stars.reduce((a, b) => a + b, 0) === p.count, {
    message: "star counts must add up to count",
  });

export const KpisSchema = z.object({
  reviews: count,
  positivePct: percent.nullable(),
  negativePct: percent.nullable(),
  avgStars: z.number().min(1).max(5).nullable(),
});

export const OverviewSchema = z.object({
  shopId: z.string().min(1),
  headline: HeadlineSchema,
  kpis: KpisSchema,
  monthly: z.array(MonthPointSchema).min(1),
  starMix: z.array(count).length(5).nullable(),
  topComplaints: z.array(
    z.object({ aspectId: z.string().min(1), negPct: percent, quoteReviewId: z.string().nullable() }),
  ),
});

export const AspectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  group: z.string().optional(),
  mentions: count,
  posPct: percent,
  negPct: percent,
  neuPct: percent,
  monthly: z.array(MonthPointSchema),
  isNew: z.boolean().optional(),
  exampleReviewIds: z.array(z.string()),
});

export const ReviewSchema = z
  .object({
    id: z.string().min(1),
    date: isoDate,
    stars: z.number().int().min(1).max(5).nullable(),
    text: z.string().min(1),
    sentiment: ToneSchema,
    confidence: z.number().min(0).max(1),
    helpful: count.optional(),
    aspectMentions: z.array(
      z.object({ aspectId: z.string().min(1), start: count, end: count, sentiment: ToneSchema }),
    ),
  })
  .refine((r) => r.aspectMentions.every((m) => m.start < m.end && m.end <= r.text.length), {
    message: "aspect mention span must fall inside the text",
  });

export const TopicSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
  size: count,
  negShare: z.number().min(0).max(1),
  monthly: z.array(MonthPointSchema),
  representativeReviewIds: z.array(z.string()),
});

export const ReviewSortSchema = z.enum(["newest", "oldest", "lowest", "highest"]);

// Query parameters arrive as strings, so numbers are coerced. Callers drop empty values first.
export const ReviewQuerySchema = z.object({
  sentiment: ToneSchema.optional(),
  stars: z.coerce.number().int().min(1).max(5).optional(),
  aspectId: z.string().min(1).max(64).optional(),
  search: z.string().trim().max(200).optional(),
  sort: ReviewSortSchema.default("newest"),
  cursor: z.string().regex(/^\d+$/, "cursor must be a number").optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const ReviewPageSchema = z.object({
  items: z.array(ReviewSchema),
  nextCursor: z.string().nullable(),
  total: count,
});

export const ChatChunkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("citation"), reviewId: z.string().min(1) }),
  z.object({ type: z.literal("done") }),
  z.object({ type: z.literal("error"), message: z.string().min(1) }),
]);

export const PredictionSchema = z.object({
  sentiment: ToneSchema,
  score: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  tokens: z.array(z.object({ text: z.string(), tone: ToneSchema.optional(), aspectId: z.string().optional() })),
  aspects: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), sentiment: ToneSchema })),
});

export const AskRequestSchema = z.object({
  question: z.string().trim().min(1, "Ask a question first").max(500, "Keep questions under 500 characters"),
});

export const PredictRequestSchema = z.object({
  text: z.string().trim().min(1, "Type a review first").max(2000, "Reviews are limited to 2,000 characters"),
});

// ---- Owner area (checkpoint 3) ----

const isoDateTime = z.iso.datetime();
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

export const UserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().min(1),
  alertEmail: z.string().min(1),
});

export const StageStatusSchema = z.enum(["pending", "running", "done", "failed"]);
export const UploadStageSchema = z.object({ name: z.string().min(1), status: StageStatusSchema, seconds: z.number().optional() });

export const ChangeSchema = z.object({
  kind: z.enum(["rise", "fall", "new_aspect"]),
  aspectId: z.string().min(1),
  deltaPct: z.number().optional(),
  note: z.string().min(1),
});

const SkippedSchema = z.object({ empty: count, duplicate: count, invalid: count });

export const UploadSchema = z.object({
  id: z.string().min(1),
  shopId: z.string().min(1),
  fileName: z.string().min(1),
  createdAt: isoDateTime,
  status: z.enum(["processing", "done", "failed"]),
  rowsAccepted: count,
  rowsSkipped: SkippedSchema,
  stages: z.array(UploadStageSchema),
  changes: z.array(ChangeSchema),
  error: z.string().optional(),
});

export const UploadRowSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  stars: z.number().int().min(1).max(5).optional(),
  date: isoDate.optional(),
});

export const UploadRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  rows: z.array(UploadRowSchema).min(1, "The file has no reviews to import").max(5000, "The limit is 5,000 reviews per upload"),
  skipped: SkippedSchema,
});

export const ColumnRoleSchema = z.enum(["text", "stars", "date", "ignore"]);
export const ColumnGuessSchema = z.object({ column: z.string(), role: ColumnRoleSchema, samples: z.array(z.string()) });

export const SourceSchema = z.object({
  id: z.string().min(1),
  shopId: z.string().min(1),
  kind: z.enum(["google", "csv"]),
  status: z.enum(["connected", "syncing", "error", "disconnected"]),
  accountLabel: z.string().optional(),
  locationName: z.string().optional(),
  lastSyncAt: isoDateTime.optional(),
  reviewsImported: count,
  error: z.string().optional(),
});

export const GoogleLocationSchema = z.object({ id: z.string().min(1), name: z.string().min(1), address: z.string().min(1) });

export const WeekdaySchema = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
const ruleBase = { id: z.string().min(1), shopId: z.string().min(1), enabled: z.boolean() };

export const AlertRuleSchema = z.discriminatedUnion("kind", [
  z.object({
    ...ruleBase,
    kind: z.literal("aspect_rise"),
    params: z.object({ aspectId: z.string().min(1), thresholdPts: z.number().int().min(1).max(50) }),
  }),
  z.object({ ...ruleBase, kind: z.literal("rating_below"), params: z.object({ stars: z.number().min(1).max(5) }) }),
  z.object({ ...ruleBase, kind: z.literal("new_aspect"), params: z.object({}) }),
  z.object({ ...ruleBase, kind: z.literal("digest"), params: z.object({ weekday: WeekdaySchema }) }),
]);

export const AlertEventSchema = z.object({
  id: z.string().min(1),
  shopId: z.string().min(1),
  ruleId: z.string().min(1),
  createdAt: isoDateTime,
  title: z.string().min(1),
  detail: z.string(),
  tone: ToneSchema,
  read: z.boolean(),
});

export const SharePeriodSchema = z.enum(["30d", "90d", "all"]);
export const ShareSectionSchema = z.enum(["overview", "aspects", "quotes"]);

export const ShareLinkSchema = z.object({
  token: z.string().min(1),
  shopId: z.string().min(1),
  period: SharePeriodSchema,
  sections: z.array(ShareSectionSchema).min(1),
  createdAt: isoDateTime,
  views: count,
  revokedAt: isoDateTime.nullable(),
});

export const ReportSchema = z.object({
  shop: ShopSchema,
  period: SharePeriodSchema,
  sections: z.array(ShareSectionSchema).min(1),
  headline: HeadlineSchema,
  kpis: KpisSchema,
  aspects: z.array(AspectSchema),
  quotes: z.array(ReviewSchema),
});

export const ComparisonSchema = z.object({
  shops: z.array(ShopSchema).length(2),
  rows: z.array(z.object({ group: z.string().min(1), name: z.string().min(1), net: z.array(z.number().nullable()).length(2) })),
});

// Form inputs. Messages are shown to the user as they are.
export const LoginSchema = z.object({ email, password: z.string().min(1, "Enter your password") });

export const SignupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60, "Keep your name under 60 characters"),
  email,
  password: z.string().min(8, "Use at least 8 characters"),
});

export const NewShopSchema = z.object({
  name: z.string().trim().min(1, "Give the shop a name").max(60, "Keep the name under 60 characters"),
  type: ShopTypeSchema,
});

export const SettingsSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60, "Keep your name under 60 characters"),
  alertEmail: email,
});

export const ShareInputSchema = z.object({
  period: SharePeriodSchema,
  sections: z.array(ShareSectionSchema).min(1, "Pick at least one section"),
});

/** What a form's Server Action returns: a message for the form and/or one per field. */
export type ActionState = { ok: boolean; message?: string; fieldErrors?: Partial<Record<string, string>> };

export type ShopType = z.infer<typeof ShopTypeSchema>;
export type Tone = z.infer<typeof ToneSchema>;
export type Shop = z.infer<typeof ShopSchema>;
export type Headline = z.infer<typeof HeadlineSchema>;
export type MonthPoint = z.infer<typeof MonthPointSchema>;
export type Kpis = z.infer<typeof KpisSchema>;
export type Overview = z.infer<typeof OverviewSchema>;
export type Aspect = z.infer<typeof AspectSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type ReviewSort = z.infer<typeof ReviewSortSchema>;
export type ReviewQuery = z.infer<typeof ReviewQuerySchema>;
export type ReviewPage = z.infer<typeof ReviewPageSchema>;
export type ChatChunk = z.infer<typeof ChatChunkSchema>;
export type Prediction = z.infer<typeof PredictionSchema>;
export type User = z.infer<typeof UserSchema>;
export type StageStatus = z.infer<typeof StageStatusSchema>;
export type UploadStage = z.infer<typeof UploadStageSchema>;
export type Change = z.infer<typeof ChangeSchema>;
export type Upload = z.infer<typeof UploadSchema>;
export type UploadRow = z.infer<typeof UploadRowSchema>;
export type UploadRequest = z.infer<typeof UploadRequestSchema>;
export type ColumnRole = z.infer<typeof ColumnRoleSchema>;
export type ColumnGuess = z.infer<typeof ColumnGuessSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type GoogleLocation = z.infer<typeof GoogleLocationSchema>;
export type Weekday = z.infer<typeof WeekdaySchema>;
export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type AlertEvent = z.infer<typeof AlertEventSchema>;
export type SharePeriod = z.infer<typeof SharePeriodSchema>;
export type ShareSection = z.infer<typeof ShareSectionSchema>;
export type ShareLink = z.infer<typeof ShareLinkSchema>;
export type ShareInput = z.infer<typeof ShareInputSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type Comparison = z.infer<typeof ComparisonSchema>;
export type NewShopInput = z.infer<typeof NewShopSchema>;
