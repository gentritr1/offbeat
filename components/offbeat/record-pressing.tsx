"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownIcon,
  CopyIcon,
  ImageIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import type { Pattern } from "@/lib/offbeat/audio";
import { cleanTitle, encodeGroove } from "@/lib/offbeat/session";

export function RecordPressing({
  pattern,
  tempo,
  playing,
  defaultTitle,
}: {
  pattern: Pattern;
  tempo: number;
  playing: boolean;
  defaultTitle: string;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<"loop" | "sleeve" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const sleeve = useRef<HTMLDivElement>(null);
  const working = useRef(false);
  const recordTitle = cleanTitle(title) || defaultTitle;
  const audible = pattern.some((row) => row.some(Boolean));
  useEffect(() => {
    setTitle(cleanTitle(new URL(location.href).searchParams.get("title")));
  }, []);
  useEffect(() => {
    const node = sleeve.current;
    if (!node) return;
    let inView = false;
    const sync = () => {
      node.dataset.spinning = String(playing && inView && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [playing]);
  useEffect(() => {
    setLink("");
    setNotice("");
    setError("");
  }, [pattern, tempo, title]);
  async function download(kind: "loop" | "sleeve") {
    if (working.current) return;
    working.current = true;
    setBusy(kind);
    setNotice("");
    setError("");
    try {
      const { pressLoop, pressSleeve, downloadBlob } =
        await import("@/lib/offbeat/pressing");
      const blob =
        kind === "loop"
          ? await pressLoop(pattern, tempo)
          : await pressSleeve(pattern, tempo, recordTitle);
      downloadBlob(
        blob,
        `offbeat-${tempo}bpm.${kind === "loop" ? "wav" : "png"}`,
      );
      setNotice(
        kind === "loop"
          ? "Your four-bar loop is ready. Keep it on repeat."
          : "Your sleeve is ready. A little artwork, all yours.",
      );
    } catch {
      setError(
        kind === "loop"
          ? "Your browser could not render this loop. Share your groove instead, or try another browser."
          : "Your browser could not save the sleeve. Try again or share your groove.",
      );
    } finally {
      working.current = false;
      setBusy(null);
    }
  }
  async function share() {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("groove", encodeGroove({ pattern, tempo }));
    url.searchParams.set("title", recordTitle);
    url.hash = "";
    setError("");
    try {
      await navigator.clipboard.writeText(url.toString());
      setLink("");
      setNotice("Groove link copied. Same beat, same tempo, ready to play.");
    } catch {
      setLink(url.toString());
      setNotice("Your groove link is ready to copy below.");
    }
  }
  return (
    <section className="record-pressing" aria-labelledby="pressing-title">
      <div className="record-sleeve" ref={sleeve} aria-hidden="true">
        <div className="vinyl">
          <div className="vinyl-label">
            <span>offbeat</span>
            <b>{tempo}</b>
            <span>BPM</span>
          </div>
        </div>
        <div className="sleeve-art">
          <div className="sleeve-brand">
            <b>offbeat</b>
            <span>Made by you</span>
          </div>
          <div className="sleeve-pattern">
            {pattern.map((row, track) =>
              row.map((on, step) => (
                <i key={`${track}-${step}`} data-track={track} data-on={on} />
              )),
            )}
          </div>
          <div className="sleeve-title">
            <strong>{recordTitle}</strong>
            <span>{tempo} BPM · Four bars · Your first pressing</span>
          </div>
        </div>
      </div>
      <div className="pressing-copy">
        <h2 id="pressing-title">
          Good noise.
          <br />
          Yours to keep.
        </h2>
        <p>
          Turn those eight steps into your own little record. Take the loop,
          keep the sleeve, or pass your groove to a friend.
        </p>
        <label htmlFor="record-title">
          Name your record <span>Optional</span>
        </label>
        <input
          id="record-title"
          type="text"
          maxLength={32}
          value={title}
          placeholder={defaultTitle}
          onChange={(event) => setTitle(event.target.value)}
          autoComplete="off"
        />
        <div className="pressing-actions" aria-busy={Boolean(busy)}>
          <button
            className="button"
            onClick={() => download("loop")}
            disabled={Boolean(busy) || !audible}
          >
            <ArrowDownIcon size={18} />
            {busy === "loop" ? "Pressing your loop…" : "Download loop"}
          </button>
          <button
            className="button button-outline"
            onClick={() => download("sleeve")}
            disabled={Boolean(busy)}
          >
            <ImageIcon size={18} />
            {busy === "sleeve" ? "Making the sleeve…" : "Save sleeve"}
          </button>
          <button
            className="icon-button share-button"
            onClick={share}
            aria-label="Copy a link to your groove"
          >
            <CopyIcon size={20} />
          </button>
        </div>
        <p className="pressing-note">
          {audible
            ? "WAV audio + PNG artwork. Made right here in your browser."
            : "All quiet. Switch on a step to press your first loop."}
        </p>
        <div className="pressing-feedback" role="status">
          {notice && (
            <>
              <CheckIcon size={18} />
              {notice}
            </>
          )}
        </div>
        {error && (
          <p className="audio-error" role="alert">
            {error}
          </p>
        )}
        {link && (
          <div className="share-fallback">
            <label htmlFor="groove-link">Your groove link</label>
            <input
              id="groove-link"
              value={link}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
        )}
      </div>
    </section>
  );
}
