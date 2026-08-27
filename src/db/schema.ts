import {
  pgTable,
  text,
  varchar,
  bigint,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// ─── listings ─────────────────────────────────────────────────────────────────
// Every row is sourced from a real get_listing() call against the chain.
export const listings = pgTable(
  "listings",
  {
    id: integer("id").primaryKey(), // on-chain listing_id (index in DynArray)
    seller: varchar("seller", { length: 42 }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    floorPrice: text("floor_price").notNull(), // stored as string to preserve u256
    currentPrice: text("current_price").notNull(),
    supply: text("supply").notNull(),
    sold: text("sold").notNull(),
    cyclesRun: text("cycles_run").notNull(),
    active: boolean("active").notNull().default(true),
    imageUrl: text("image_url"),
    lastSyncedAt: timestamp("last_synced_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("listings_seller_idx").on(t.seller), index("listings_active_idx").on(t.active)]
);

// ─── price_history ─────────────────────────────────────────────────────────────
// One row per confirmed run_agent_cycle() transaction.
// tx_hash ties every row back to a real on-chain event.
export const priceHistory = pgTable(
  "price_history",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    txHash: varchar("tx_hash", { length: 66 }).notNull().unique(),
    priceBeforeWei: text("price_before_wei").notNull(),
    priceAfterWei: text("price_after_wei").notNull(),
    adjustmentPercent: integer("adjustment_percent"),
    reasoning: text("reasoning"),
    cycleNumber: integer("cycle_number").notNull(),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  },
  (t) => [
    index("price_history_listing_idx").on(t.listingId),
    index("price_history_tx_idx").on(t.txHash),
  ]
);

// ─── purchases ────────────────────────────────────────────────────────────────
// One row per confirmed buy() transaction receipt.
// Snapshot of title/price at the block the purchase confirmed (rule #5).
export const purchases = pgTable(
  "purchases",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id), // FK prevents orphan delete (rule #6)
    txHash: varchar("tx_hash", { length: 66 }).notNull().unique(),
    buyer: varchar("buyer", { length: 42 }).notNull(),
    seller: varchar("seller", { length: 42 }).notNull(),
    // Snapshot at purchase-block (rule #5)
    titleSnapshot: text("title_snapshot").notNull(),
    priceAtPurchaseWei: text("price_at_purchase_wei").notNull(),
    purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
  },
  (t) => [
    index("purchases_buyer_idx").on(t.buyer),
    index("purchases_listing_idx").on(t.listingId),
    index("purchases_tx_idx").on(t.txHash),
  ]
);

// ─── activity_events ──────────────────────────────────────────────────────────
// Unified feed: create_listing | buy | run_agent_cycle | delist events.
// Cascade-deleted before a listing row can be hard-deleted (rule #6).
export const activityEvents = pgTable(
  "activity_events",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    txHash: varchar("tx_hash", { length: 66 }).notNull(),
    eventType: varchar("event_type", { length: 32 }).notNull(), // 'create'|'buy'|'agent_cycle'|'delist'
    actor: varchar("actor", { length: 42 }),
    metadata: jsonb("metadata"), // flexible extra data per event type
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  },
  (t) => [
    index("activity_events_listing_idx").on(t.listingId),
    index("activity_events_type_idx").on(t.eventType),
    index("activity_events_occurred_idx").on(t.occurredAt),
  ]
);

// ─── sync_cursors ─────────────────────────────────────────────────────────────
// Tracks the last synced listing count so listingSync only pages new ones.
export const syncCursors = pgTable("sync_cursors", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
