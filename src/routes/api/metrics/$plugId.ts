import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { shellyPlugs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchShellyStatus, formatPrometheusMetrics } from "@/server/shelly";

export const Route = createFileRoute("/api/metrics/$plugId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const plugId = parseInt(params.plugId, 10);

        if (isNaN(plugId)) {
          return new Response("Invalid plug ID", { status: 400 });
        }

        const [plug] = await db
          .select()
          .from(shellyPlugs)
          .where(eq(shellyPlugs.id, plugId));

        if (!plug) {
          return new Response("Plug not found", { status: 404 });
        }

        try {
          const status = await fetchShellyStatus(
            plug.hostname,
            plug.switchId,
            plug.password
          );

          const metrics = formatPrometheusMetrics(status, plug.id, plug.name);

          return new Response(metrics, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
            },
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          return new Response(`# Error fetching metrics: ${message}\n`, {
            status: 502,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
            },
          });
        }
      },
    },
  },
});
