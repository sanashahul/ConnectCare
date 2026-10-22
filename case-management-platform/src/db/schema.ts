import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Columns ending in "Enc" hold AES-256-GCM ciphertext (see src/lib/crypto.ts).
// Everything identifying or narrative about a client lives in an Enc column.
// Plaintext columns are limited to what the app needs to filter and count:
// status, assignment, coarse location, and need categories.

export const roleEnum = pgEnum("role", ["supervisor", "case_manager"]);
export const clientStatusEnum = pgEnum("client_status", ["new", "active", "closed"]);
export const intakeSourceEnum = pgEnum("intake_source", ["public_form", "staff", "google_form"]);
export const contactTypeEnum = pgEnum("contact_type", ["in_person", "phone", "text", "outreach_site", "other"]);
// met = saw or talked with the guest; not_found = tried to reach them and couldn't;
// update = work done on their behalf without contact (e.g. called a shelter).
export const noteKindEnum = pgEnum("note_kind", ["met", "not_found", "update"]);
export const planStatusEnum = pgEnum("plan_status", ["todo", "referred", "connected", "done", "unable"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull(),
  passwordHash: text("password_hash").notNull(),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  totpSecretEnc: text("totp_secret_enc"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  totpLastStep: integer("totp_last_step"),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the cookie token, so a database leak does not leak live sessions.
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // "password" = password checked, waiting on 2FA. "full" = signed in.
    stage: text("stage", { enum: ["password", "full"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Short ID staff use in place of the client's name (see src/lib/client-code.ts).
    clientCode: text("client_code").notNull().unique(),
    status: clientStatusEnum("status").notNull().default("new"),
    source: intakeSourceEnum("source").notNull(),
    // Google Form response id, so a resent submission never creates a duplicate client.
    externalId: text("external_id").unique(),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    county: text("county"),
    city: text("city"),
    needs: text("needs").array().notNull().default([]),
    urgent: boolean("urgent").notNull().default(false),
    // Encrypted JSON: see ClientProfile in src/lib/clients.ts
    profileEnc: text("profile_enc").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    // When a case manager confirmed the need categories ("Getting started" step 2).
    needsConfirmedAt: timestamp("needs_confirmed_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [index("clients_assigned_idx").on(t.assignedToId), index("clients_status_idx").on(t.status)],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id),
    contactDate: date("contact_date").notNull(),
    kind: noteKindEnum("kind").notNull().default("met"),
    contactType: contactTypeEnum("contact_type").notNull(),
    // Where the guest was seen (met) or looked for (not_found), e.g. "St. James Park".
    whereEnc: text("where_enc"),
    needsAddressed: text("needs_addressed").array().notNull().default([]),
    bodyEnc: text("body_enc").notNull(),
    followUpDate: date("follow_up_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notes_client_idx").on(t.clientId)],
);

export const planItems = pgTable(
  "plan_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id").notNull().references(() => users.id),
    need: text("need").notNull(),
    resourceId: text("resource_id").references(() => resources.id),
    // Encrypted JSON: { title, details?, suggestion? } - see PlanItemBody in src/lib/plan.ts
    bodyEnc: text("body_enc").notNull(),
    status: planStatusEnum("status").notNull().default("todo"),
    // When status last changed; drives "steps connected / done this month" in reports.
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    dueDate: date("due_date"),
    // AI suggestions that are not in the vetted directory start unverified and are
    // kept off printouts until a case manager confirms them.
    aiSuggested: boolean("ai_suggested").notNull().default(false),
    verified: boolean("verified").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("plan_client_idx").on(t.clientId)],
);

export const resources = pgTable("resources", {
  id: text("id").primaryKey(),
  // Shape: Resource in src/lib/resource-types.ts. Public information, not encrypted.
  data: jsonb("data").notNull(),
  active: boolean("active").notNull().default(true),
  lastVerified: date("last_verified"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedById: uuid("updated_by_id").references(() => users.id),
});

export const resourceFlags = pgTable("resource_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceId: text("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  reportedById: uuid("reported_by_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  resolvedById: uuid("resolved_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Shared across server instances (Vercel runs many), so limits hold everywhere.
export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    key: text("key").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rate_limit_key_at_idx").on(t.key, t.at)],
);

// Append-only. Never store client names, contact info, or note text here.
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    clientId: uuid("client_id"),
    detail: jsonb("detail"),
    ip: text("ip"),
  },
  (t) => [index("audit_at_idx").on(t.at), index("audit_client_idx").on(t.clientId)],
);

// ---------- To-do list ----------

// A staff member's own tasks, alongside the plan steps and follow-ups pulled from their clients.
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // Optional client the task is about (must be one the user can access).
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    textEnc: text("text_enc").notNull(),
    dueDate: date("due_date"),
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tasks_user_idx").on(t.userId)],
);

// Each person's chosen order for their to-do list, and follow-ups they've ticked off.
// itemKey: "task:<id>", "plan:<id>", or "followup:<clientId>:<date>".
export const todoState = pgTable(
  "todo_state",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    position: integer("position"),
    // "urgent" | "high" | "medium"; null = default (urgent clients start as urgent, everything else medium)
    priority: text("priority", { enum: ["urgent", "high", "medium"] }),
    doneAt: timestamp("done_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemKey] })],
);

// ---------- Messages between case managers and supervisors ----------

export const messageThreads = pgTable(
  "message_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The case manager in the conversation. Supervisors see every thread.
    caseManagerId: uuid("case_manager_id").notNull().references(() => users.id),
    createdById: uuid("created_by_id").notNull().references(() => users.id),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    subjectEnc: text("subject_enc").notNull(),
    resolved: boolean("resolved").notNull().default(false),
    // Who wrote the latest message, so the other side sees it as unread.
    lastAuthorId: uuid("last_author_id").references(() => users.id),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("threads_cm_idx").on(t.caseManagerId), index("threads_last_idx").on(t.lastMessageAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id").notNull().references(() => messageThreads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id),
    bodyEnc: text("body_enc").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_thread_idx").on(t.threadId)],
);

export const threadReads = pgTable(
  "thread_reads",
  {
    threadId: uuid("thread_id").notNull().references(() => messageThreads.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.threadId, t.userId] })],
);
