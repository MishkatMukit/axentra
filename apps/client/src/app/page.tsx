import { HealthResponseSchema } from "@axentra/contracts";
import Image from "next/image";

// Always render per request so the status reflects the API right now
export const dynamic = "force-dynamic";

async function getApiStatus(): Promise<"ok" | "degraded" | "down"> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set (see apps/client/.env.example)");

  try {
    const res = await fetch(`${baseUrl}/health`, { cache: "no-store" });
    const body: unknown = await res.json();
    const parsed = HealthResponseSchema.safeParse((body as { data?: unknown }).data);
    // 503 still carries a body, so a parsed "degraded" is reported as such
    return parsed.success ? parsed.data.status : "down";
  } catch {
    return "down";
  }
}

export default async function Home() {
  const status = await getApiStatus();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-6 px-4">
      <Image src="/axentra-logo.png" alt="Axentra" width={217} height={72} priority />
      <h1 className="font-display text-2xl font-semibold">Career operations, one loop.</h1>
      <p
        role="status"
        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm"
      >
        <span
          aria-hidden
          className={`size-2 rounded-full ${
            status === "ok" ? "bg-mint-500" : status === "degraded" ? "bg-amber-500" : "bg-red-600"
          }`}
        />
        API: {status}
      </p>
    </main>
  );
}
