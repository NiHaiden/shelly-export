import { definePlugin as defineNitroPlugin } from "nitro";
import { db } from "../../src/db";
import { shellyPlugs, shellyMetrics } from "../../src/db/schema";
import { fetchShellyStatus } from "../../src/server/shelly";

let pollingInterval: ReturnType<typeof setInterval> | null = null;

async function pollAllPlugs() {
  try {
    const plugs = await db.select().from(shellyPlugs);

    for (const plug of plugs) {
      try {
        const status = await fetchShellyStatus(
          plug.hostname,
          plug.switchId,
          plug.password
        );

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
      } catch (error) {
        console.error(`Failed to poll plug ${plug.name} (${plug.hostname}):`, error);
      }
    }
  } catch (error) {
    console.error("Failed to poll plugs:", error);
  }
}

export default defineNitroPlugin(() => {
  const disabled = process.env.DISABLE_POLLING === "true" || process.env.DISABLE_POLLING === "1";

  if (disabled) {
    console.log("[Polling] Background polling is disabled via DISABLE_POLLING env var");
    return;
  }

  console.log("[Polling] Starting background polling service...");

  // Poll immediately on startup
  pollAllPlugs();

  // Then poll every second
  pollingInterval = setInterval(pollAllPlugs, 1000);

  // Cleanup on shutdown
  process.on("SIGINT", () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      console.log("[Polling] Stopped background polling service");
    }
  });

  process.on("SIGTERM", () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      console.log("[Polling] Stopped background polling service");
    }
  });
});
