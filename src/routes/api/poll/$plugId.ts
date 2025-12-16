import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shellyMetrics, shellyPlugs } from "@/db/schema";
import { fetchShellyStatus } from "@/server/shelly";

export const Route = createFileRoute("/api/poll/$plugId")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const plugId = parseInt(params.plugId, 10);

        const [plug] = await db
          .select()
          .from(shellyPlugs)
          .where(eq(shellyPlugs.id, plugId));

        if (!plug) {
          return Response.json({ error: "Plug not found" }, { status: 404 });
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

          return Response.json(status);
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
          );
        }
      },
    },
  },
});
