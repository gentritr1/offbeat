"use client";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useWebTool, stringArgument } from "@/lib/offbeat/web-tools";
import dynamic from "next/dynamic";
import {
  CheckIcon,
  CopyIcon,
  SpeakerHighIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { finishes, savePreference } from "@/lib/offbeat/finishes";
const Speaker = dynamic(() => import("./speaker"), { ssr: false });
export function Configurator({
  finish,
  onFinishChange,
}: {
  finish: number;
  onFinishChange: (index: number) => void;
}) {
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [shareLink, setShareLink] = useState("");
  useEffect(() => {
    setSaved(false);
    setShareLink("");
    setNotice("");
  }, [finish]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(t);
  }, [notice]);
  function select(i: number) {
    onFinishChange(i);
    setSaved(false);
  }
  function save() {
    const success = savePreference("offbeat-finish", String(finish));
    setSaved(success);
    setNotice(
      success
        ? `${finishes[finish].name} saved on this device.`
        : "Your browser could not save this preference. Copy a color link instead.",
    );
  }
  async function share() {
    const url = new URL(location.href);
    url.searchParams.set(
      "color",
      finishes[finish].name.toLowerCase().replaceAll(" ", "-"),
    );
    url.hash = "make-it-yours";
    try {
      await navigator.clipboard.writeText(url.toString());
      setShareLink("");
      setNotice("Your color link is copied.");
    } catch {
      setShareLink(url.toString());
      setNotice("Your color link is ready to copy below.");
    }
  }
  useWebTool({
    name: "configure_offbeat_color",
    description:
      "Select an OFFBEAT finish in the visible configurator. This does not save a preference or make a purchase.",
    inputSchema: {
      type: "object",
      properties: {
        color: { type: "string", enum: finishes.map((f) => f.name) },
      },
      required: ["color"],
      additionalProperties: false,
    },
    execute(input) {
      const name = stringArgument(input, "color");
      const index = finishes.findIndex((f) => f.name === name);
      if (index < 0)
        throw new Error("Choose one of the four available finishes.");
      flushSync(() => select(index));
      return { color: name, saved: false };
    },
  });
  return (
    <section id="make-it-yours" className="configurator">
      <div className="config-copy">
        <p className="small-label">A sound choice.</p>
        <h2>
          Find your
          <br />
          kind of loud.
        </h2>
        <p className="body-copy">
          Four finishes. One little character. Choose the one that feels like
          you.
        </p>
        <div
          className="config-finishes"
          role="group"
          aria-label="Choose your speaker color"
        >
          {finishes.map((f, i) => (
            <button
              onClick={() => select(i)}
              key={f.name}
              className={
                finish === i ? "finish-option chosen" : "finish-option"
              }
              aria-pressed={finish === i}
            >
              <span style={{ background: f.color }} />
              {f.name}
              {finish === i && <CheckIcon size={16} weight="bold" />}
            </button>
          ))}
        </div>
        <div className="config-summary">
          <span>OFFBEAT One</span>
          <span aria-live="polite">{finishes[finish].name}</span>
        </div>
        <div className="config-actions">
          <button className="button" onClick={save}>
            {saved ? (
              <>
                <CheckIcon size={18} />
                Color saved
              </>
            ) : (
              "Keep this color"
            )}
          </button>
          <button
            className="icon-button share-button"
            aria-label="Copy a link to this color"
            onClick={share}
          >
            <CopyIcon size={21} />
          </button>
        </div>
        <p className="device-note">
          A little inspiration, saved on your device.
        </p>
        {shareLink && (
          <div className="share-fallback">
            <label htmlFor="color-link">Your color link</label>
            <input
              id="color-link"
              value={shareLink}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
        )}
      </div>
      <div
        className="config-stage"
        style={{ "--finish": finishes[finish].color } as React.CSSProperties}
      >
        <div className="config-color-field" />
        <Speaker color={finishes[finish].color} compact />
        <div className="config-product-name" aria-live="polite">
          {finishes[finish].name}
        </div>
        <div className="config-detail">
          <span>
            <SpeakerHighIcon size={17} />
            Big sound
          </span>
          <span>
            <SlidersHorizontalIcon size={17} />
            No app needed
          </span>
        </div>
      </div>
      <div className={notice ? "toast visible" : "toast"} role="status">
        {notice}
      </div>
    </section>
  );
}
