import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  real,
  index,
} from "drizzle-orm/pg-core";

export const shellyPlugs = pgTable("shelly_plugs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  hostname: varchar("hostname", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }),
  switchId: integer("switch_id").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shellyMetrics = pgTable(
  "shelly_metrics",
  {
    time: timestamp("time", { withTimezone: true }).notNull().defaultNow(),
    plugId: integer("plug_id")
      .notNull()
      .references(() => shellyPlugs.id, { onDelete: "cascade" }),
    power: real("power"),
    voltage: real("voltage"),
    current: real("current"),
    energy: real("energy"),
    temperature: real("temperature"),
    output: integer("output"),
    isValid: integer("is_valid"),
  },
  (table) => [
    index("shelly_metrics_plug_id_time_idx").on(table.plugId, table.time),
  ]
);

export type ShellyPlug = typeof shellyPlugs.$inferSelect;
export type NewShellyPlug = typeof shellyPlugs.$inferInsert;
export type ShellyMetric = typeof shellyMetrics.$inferSelect;
export type NewShellyMetric = typeof shellyMetrics.$inferInsert;
