import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getPlugs, createPlug, deletePlug } from "@/server/plugs";
import type { ShellyPlug } from "@/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, ExternalLink, Copy, Check, BarChart3 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  component: App,
  loader: async () => {
    const plugs = await getPlugs();
    return { plugs };
  },
});

function App() {
  const { plugs: initialPlugs } = Route.useLoaderData();
  const [plugs, setPlugs] = useState<ShellyPlug[]>(initialPlugs);
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    hostname: "",
    password: "",
    switchId: "0",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPlug = await createPlug({
      data: {
        name: formData.name,
        hostname: formData.hostname,
        password: formData.password || null,
        switchId: parseInt(formData.switchId, 10),
      },
    });
    setPlugs([...plugs, newPlug]);
    setFormData({ name: "", hostname: "", password: "", switchId: "0" });
    setIsAdding(false);
  };

  const handleDelete = async (id: number) => {
    await deletePlug({ data: { id } });
    setPlugs(plugs.filter((p) => p.id !== id));
  };

  const copyMetricsUrl = async (plugId: number) => {
    const url = `${window.location.origin}/api/metrics/${plugId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(plugId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Shelly Plug Exporter</h1>
            <p className="text-muted-foreground text-sm">
              Manage your Shelly plugs and export metrics to Prometheus
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-1 size-4" />
                Add Plug
              </Button>
            )}
          </div>
        </div>

        {isAdding && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Shelly Plug</CardTitle>
              <CardDescription>
                Configure a new Shelly Gen 2+ device to export metrics from
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Living Room Plug"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hostname">Hostname / IP</Label>
                    <Input
                      id="hostname"
                      placeholder="192.168.1.100"
                      value={formData.hostname}
                      onChange={(e) =>
                        setFormData({ ...formData, hostname: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password (optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Leave empty if no auth"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="switchId">Switch ID</Label>
                    <Input
                      id="switchId"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.switchId}
                      onChange={(e) =>
                        setFormData({ ...formData, switchId: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Add Plug</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAdding(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {plugs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No plugs configured yet. Add your first Shelly plug to get
                started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plugs.map((plug) => (
              <Card key={plug.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{plug.name}</CardTitle>
                      <CardDescription>
                        {plug.hostname} (Switch {plug.switchId})
                        {plug.password && " - Auth enabled"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        asChild
                        title="View chart"
                      >
                        <Link to="/plug/$plugId" params={{ plugId: String(plug.id) }}>
                          <BarChart3 className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => copyMetricsUrl(plug.id)}
                        title="Copy metrics URL"
                      >
                        {copiedId === plug.id ? (
                          <Check className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        asChild
                        title="Open metrics"
                      >
                        <a
                          href={`/api/metrics/${plug.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => handleDelete(plug.id)}
                        title="Delete plug"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <code className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs">
                    /api/metrics/{plug.id}
                  </code>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
