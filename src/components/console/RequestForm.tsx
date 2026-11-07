import type { FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import {
  COUNTRIES,
  COUNTRY_LABELS,
  DEVICES,
  DEVICE_LABELS,
  INTERESTS_MAX_LENGTH,
  PLACEMENTS,
  PLACEMENT_LABELS,
  SEGMENTS,
  SEGMENT_LABELS,
} from "@shared/contract.ts";
import type { AdRequest } from "@shared/contract.ts";

interface Props {
  value: AdRequest;
  onChange: (next: AdRequest) => void;
  onRun: (request: AdRequest) => void;
  running: boolean;
  error: string | null;
}

export function RequestForm({ value, onChange, onRun, running, error }: Props) {
  const set = <K extends keyof AdRequest>(key: K, v: AdRequest[K]) => onChange({ ...value, [key]: v });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!running) onRun({ ...value, interests: value.interests.trim() });
  }

  return (
    <form onSubmit={submit} aria-labelledby="request-title" className="space-y-6">
      <div>
        <h2 id="request-title" className="heading text-2xl">
          Describe a slot
        </h2>
        <p className="mt-1 text-sm text-muted">Who is looking, and where the ad would go.</p>
      </div>

      <fieldset>
        <legend className="label">Audience</legend>
        <div className="mt-2 flex flex-wrap">
          {SEGMENTS.map((s) => (
            <label key={s} className="relative">
              <input
                type="radio"
                name="segment"
                value={s}
                checked={value.segment === s}
                onChange={() => set("segment", s)}
                className="peer absolute inset-0 opacity-0"
              />
              <span className="opt">{SEGMENT_LABELS[s]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
          <label htmlFor="country" className="label">
            Country
          </label>
          <select id="country" className="field mt-1.5" value={value.country} onChange={(e) => set("country", e.target.value as AdRequest["country"])}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {COUNTRY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
          <label htmlFor="device" className="label">
            Device
          </label>
          <select id="device" className="field mt-1.5" value={value.device} onChange={(e) => set("device", e.target.value as AdRequest["device"])}>
            {DEVICES.map((d) => (
              <option key={d} value={d}>
                {DEVICE_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor="placement" className="label">
            Placement
          </label>
          <select
            id="placement"
            className="field mt-1.5"
            value={value.placement}
            onChange={(e) => set("placement", e.target.value as AdRequest["placement"])}
          >
            {PLACEMENTS.map((p) => (
              <option key={p} value={p}>
                {PLACEMENT_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor="interests" className="label">
            Interests <span className="font-normal">(optional)</span>
          </label>
          <input
            id="interests"
            className="field mt-1.5"
            value={value.interests}
            onChange={(e) => set("interests", e.target.value)}
            maxLength={INTERESTS_MAX_LENGTH}
            placeholder="esports, investing"
            aria-describedby="interests-hint"
          />
          <p id="interests-hint" className="mt-1.5 text-xs text-muted">
            A word like esports or investing gives that advertiser an interest match.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className=" border border-spec px-3 py-2 text-sm text-spec">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-solid w-full" disabled={running}>
        {running ? "Running the auction…" : "Run auction"}
        <ArrowRight className="nudge size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
