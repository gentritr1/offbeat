"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SpeakerPoster } from "./speaker-poster";
import { CubeIcon, HandGrabbingIcon } from "@phosphor-icons/react";
import { Configurator } from "./configurator";
import { finishes, readPreference } from "@/lib/offbeat/finishes";
const Speaker = dynamic(() => import("./speaker"), {
  ssr: false,
  loading: () => <SpeakerPoster variant="hero" />,
});

export function Showcase() {
  const [finish, setFinish] = useState(0);
  const [exploded, setExploded] = useState(false);
  useEffect(() => {
    const query = new URL(location.href).searchParams.get("color");
    const index = finishes.findIndex(
      (f) => f.name.toLowerCase().replaceAll(" ", "-") === query,
    );
    const stored = Number(readPreference("offbeat-finish") || 0);
    setFinish(
      index >= 0
        ? index
        : Number.isInteger(stored) && stored >= 0 && stored < finishes.length
          ? stored
          : 0,
    );
  }, []);
  function changeFinish(i: number) {
    setFinish(i);
    const url = new URL(location.href);
    url.searchParams.set(
      "color",
      finishes[i].name.toLowerCase().replaceAll(" ", "-"),
    );
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-intro">Portable speaker. Pocket drum machine.</p>
          <h1>
            Plays your songs.
            <br />
            Makes its own.
          </h1>
          <p className="hero-description">
            A portable speaker with an eight-step drum machine inside. Three
            keys, one dial, no app.
          </p>
          <div className="hero-buttons">
            <a href="#make-it-yours" className="button">
              Find your color
            </a>
            <Link href="/studio/" className="text-link">
              Play the drum machine <span className="mini-record" />
            </Link>
          </div>
        </div>
        <div
          className="product-stage"
          style={{ "--finish": finishes[finish].color } as React.CSSProperties}
        >
          <div className="product-orbit" />
          <Speaker color={finishes[finish].color} exploded={exploded} />
          <div className="scene-bottom">
            <span>
              <HandGrabbingIcon size={17} /> Drag to turn
            </span>
            <button
              className={exploded ? "scene-tool active" : "scene-tool"}
              onClick={() => setExploded(!exploded)}
              aria-pressed={exploded}
            >
              <CubeIcon size={18} />
              {exploded ? "Put it together" : "Look inside"}
            </button>
          </div>
        </div>
        <div className="hero-color-bar">
          <span>Finish</span>
          <div className="swatches" role="group" aria-label="Speaker finish">
            {finishes.map((f, i) => (
              <button
                key={f.name}
                className={i === finish ? "swatch selected" : "swatch"}
                style={{ "--swatch": f.color } as React.CSSProperties}
                aria-label={f.name}
                aria-pressed={i === finish}
                onClick={() => changeFinish(i)}
              >
                <span />
              </button>
            ))}
          </div>
          <span className="finish-name" aria-live="polite">
            {finishes[finish].name}
          </span>
        </div>
      </section>
      <section className="listening-section">
        <div className="listening-image">
          <img
            src="/images/listening-room.webp"
            alt="Orange OFFBEAT speaker on a chrome table beside a record player, catching the afternoon light"
            loading="lazy"
            width="1536"
            height="1024"
          />
        </div>
        <div className="listening-copy">
          <h2>
            Built for the
            <br />
            kitchen table.
          </h2>
          <p>
            Two full-range drivers and a passive radiator, tuned to fill a room
            rather than win a spec sheet. 24 hours a charge, IP67 when the party
            moves outside.
          </p>
          <Link href="/design/" className="button button-outline">
            See how it is built
          </Link>
        </div>
      </section>
      <section className="manifesto">
        <span className="manifesto-note">No app. No account.</span>
        <h2>
          Three keys and a dial.
          <br />
          That is the whole interface.
        </h2>
        <p>
          Tap a key to set a step. Turn the dial to drag the off-beats late. The
          loop keeps playing while your phone stays in your pocket.
        </p>
        <Link href="/studio/" className="button">
          Try the drum machine
        </Link>
      </section>
      <Configurator finish={finish} onFinishChange={changeFinish} />
      <section className="faq-section">
        <h2>Questions.</h2>
        <div className="faq-list">
          {[
            [
              "Is the drum machine real?",
              "As real as the rest of OFFBEAT, which is a concept. The sound studio on this site is a working version: eight steps, four sounds, and a record you can download.",
            ],
            [
              "Does it need an app?",
              "No app and no account. It pairs over Bluetooth, and everything else happens on the three keys and the dial.",
            ],
            [
              "Can I take it outside?",
              "That is the idea. The concept combines a carry loop, a compact body, and an IP67 target for dust and water resistance. From the kitchen to the campsite.",
            ],
            [
              "Can I buy one?",
              "OFFBEAT is an independent product concept. You can explore the design, save your favorite finish, and play in the sound studio. There is no checkout or physical product for sale.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span className="faq-plus" aria-hidden="true" />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
