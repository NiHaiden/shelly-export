import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte } from "drizzle-orm";
import {  fetchShellyStatus } from "./shelly";
import type {ShellyStatus} from "./shelly";
import type {NewShellyPlug} from "@/db/schema";
import { db } from "@/db";
import {  shellyMetrics, shellyPlugs } from "@/db/schema";

export const getPlugs = createServerFn({ method: "GET" }).handler(async () => {
  const plugs = await db.select().from(shellyPlugs).orderBy(shellyPlugs.id);
  return plugs;
});

export const createPlug = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: NewShellyPlug }) => {
    const [plug] = await db.insert(shellyPlugs).values(ctx.data).returning();
    return plug;
  }
);

export const deletePlug = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { id: number } }) => {
    await db.delete(shellyPlugs).where(eq(shellyPlugs.id, ctx.data.id));
    return { success: true };
  }
);

export const getPlugById = createServerFn({ method: "GET" }).handler(
  async (ctx: { data: { id: number } }) => {
    const [plug] = await db
      .select()
      .from(shellyPlugs)
      .where(eq(shellyPlugs.id, ctx.data.id));
    return plug || null;
  }
);

export const getPlugMetrics = createServerFn({ method: "GET" }).handler(
  async (ctx: { data: { id: number } }): Promise<ShellyStatus | { error: string }> => {
    const [plug] = await db
      .select()
      .from(shellyPlugs)
      .where(eq(shellyPlugs.id, ctx.data.id));

    if (!plug) {
      return { error: "Plug not found" };
    }

    try {
      const status = await fetchShellyStatus(
        plug.hostname,
        plug.switchId,
        plug.password
      );
      return status;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
);

// Fetch metrics from Shelly and store in database
export const fetchAndStoreMetrics = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { id: number } }): Promise<ShellyStatus | { error: string }> => {
    const [plug] = await db
      .select()
      .from(shellyPlugs)
      .where(eq(shellyPlugs.id, ctx.data.id));

    if (!plug) {
      return { error: "Plug not found" };
    }

    try {
      const status = await fetchShellyStatus(
        plug.hostname,
        plug.switchId,
        plug.password
      );

      // Store the metrics in the database
      const isValid = !status.errors || status.errors.length === 0;
      await db.insert(shellyMetrics).values({
        plugId: plug.id,
        power: status.apower ?? null,
        voltage: status.voltage ?? null,
        current: status.current ?? null,
        energy: status.aenergy?.total ?? null,
        temperature: status.temperature?.tC ?? null,
        output: status.output ? 1 : 0,
        isValid: isValid ? 1 : 0,
      });

      return status;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
);

// Get historical metrics from database
export const getHistoricalMetrics = createServerFn({ method: "GET" }).handler(
  async (ctx: { data: { id: number; minutes?: number } }) => {
    const minutes = ctx.data.minutes ?? 5; // Default to last 5 minutes
    const since = new Date(Date.now() - minutes * 60 * 1000);
    // 30 minutes at 1s intervals = 1800 points max
    const limit = Math.min(minutes * 60, 2000);

    const metrics = await db
      .select()
      .from(shellyMetrics)
      .where(
        and(
          eq(shellyMetrics.plugId, ctx.data.id),
          gte(shellyMetrics.time, since)
        )
      )
      .orderBy(shellyMetrics.time)
      .limit(limit);

    return metrics;
  }
);
