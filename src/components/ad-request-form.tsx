import type React from "react";
import { useState } from "react";
import { Loader2, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, serveAd } from "@/lib/api";
import {
  COUNTRIES,
  COUNTRY_LABELS,
  DEVICES,
  DEVICE_LABELS,
  PLACEMENTS,
  PLACEMENT_LABELS,
  SEGMENTS,
  SEGMENT_LABELS,
} from "@/lib/types";
import type { AdRequest, Country, DeliveryResponse, Device, Placement, Segment } from "@/lib/types";

interface AdRequestFormProps {
  onResult: (response: DeliveryResponse, request: AdRequest) => void;
}

const DEFAULTS: AdRequest = {
  placement: "feed",
  country: "US",
  device: "mobile",
  segment: "tech",
  interests: "",
};

export function AdRequestForm({ onResult }: AdRequestFormProps) {
  const [form, setForm] = useState<AdRequest>(DEFAULTS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof AdRequest>(key: K, value: AdRequest[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const request: AdRequest = {
      ...form,
      interests: form.interests?.trim() || undefined,
    };

    setSubmitting(true);
    setError(null);
    try {
      const response = await serveAd(request);
      onResult(response, request);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong serving the request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Placement" htmlFor="placement">
          <Select value={form.placement} onValueChange={(v) => update("placement", v as Placement)}>
            <SelectTrigger id="placement" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLACEMENTS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PLACEMENT_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Device" htmlFor="device">
          <Select value={form.device} onValueChange={(v) => update("device", v as Device)}>
            <SelectTrigger id="device" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEVICES.map((d) => (
                <SelectItem key={d} value={d}>
                  {DEVICE_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Country" htmlFor="country">
          <Select value={form.country} onValueChange={(v) => update("country", v as Country)}>
            <SelectTrigger id="country" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {COUNTRY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Audience segment" htmlFor="segment">
          <Select value={form.segment} onValueChange={(v) => update("segment", v as Segment)}>
            <SelectTrigger id="segment" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEGMENTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {SEGMENT_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Interest keywords" htmlFor="interests" hint="Optional — free-text signals that can nudge targeting (e.g. “gaming, esports”).">
        <Input
          id="interests"
          value={form.interests ?? ""}
          onChange={(e) => update("interests", e.target.value)}
          placeholder="kubernetes, devops"
          autoComplete="off"
        />
      </Field>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            Running auction…
          </>
        ) : (
          <>
            <Zap className="size-4" data-icon="inline-start" />
            Serve an ad
          </>
        )}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
