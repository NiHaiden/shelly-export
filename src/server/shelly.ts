import DigestFetch from "digest-fetch";

export interface ShellyStatus {
  id: number;
  source?: string;
  output: boolean;
  apower?: number;
  voltage?: number;
  freq?: number;
  current?: number;
  pf?: number;
  aenergy?: {
    total: number;
    by_minute?: Array<number>;
    minute_ts?: number;
  };
  ret_aenergy?: {
    total: number;
    by_minute?: Array<number>;
    minute_ts?: number;
  };
  temperature?: {
    tC: number;
    tF: number;
  };
  errors?: Array<string>;
}

export interface ShellyError {
  error: string;
  message: string;
}

export async function fetchShellyStatus(
  hostname: string,
  switchId: number,
  password?: string | null
): Promise<ShellyStatus> {
  const url = `http://${hostname}/rpc/Switch.GetStatus?id=${switchId}`;

  let response: Response;

  try {
    if (password) {
      // Use DigestFetch for authenticated requests
      // Username is always "admin" for Shelly Gen2+ devices
      const client = new DigestFetch("admin", password, {
        algorithm: "SHA-256",
      });
      const res = await client.fetch(url, {});
      response = res as unknown as Response;
    } else {
      // No password - use simple fetch
      response = await fetch(url);
    }
  } catch (error) {
    // Provide more helpful error messages for common network errors
    const errMsg = error instanceof Error ? error.message : String(error);

    if (errMsg.includes("ECONNREFUSED")) {
      throw new Error(
        `Connection refused to ${hostname} - is the Shelly device powered on and connected?`
      );
    }
    if (errMsg.includes("ENOTFOUND") || errMsg.includes("getaddrinfo")) {
      throw new Error(
        `Could not resolve hostname ${hostname} - check the hostname/IP address`
      );
    }
    if (errMsg.includes("ETIMEDOUT") || errMsg.includes("timeout")) {
      throw new Error(
        `Connection to ${hostname} timed out - check network connectivity`
      );
    }
    if (errMsg.includes("ENETUNREACH")) {
      throw new Error(
        `Network unreachable for ${hostname} - check your network connection`
      );
    }
    throw new Error(`Failed to connect to Shelly at ${hostname}: ${errMsg}`);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        `Authentication required for ${hostname} - please set the password`
      );
    }
    throw new Error(
      `Shelly API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data as ShellyStatus;
}

export function formatPrometheusMetrics(
  status: ShellyStatus,
  _plugId: number,
  _plugName: string
): string {
  const lines: Array<string> = [];

  // Power (Watts)
  lines.push("# HELP power Current real AC power being drawn, in Watts");
  lines.push("# TYPE power gauge");
  lines.push(`power ${status.apower ?? 0}`);
  lines.push("");

  // Is valid (no errors)
  const isValid = !status.errors || status.errors.length === 0;
  lines.push("# HELP is_valid Whether power metering self-checks OK");
  lines.push("# TYPE is_valid gauge");
  lines.push(`is_valid ${isValid ? 1 : 0}`);
  lines.push("");

  // Total energy (Watt-minutes)
  lines.push("# HELP total Total energy consumed by the attached electrical appliance in Watt-minute");
  lines.push("# TYPE total gauge");
  lines.push(`total ${status.aenergy?.total ?? 0}`);

  return lines.join("\n");
}
