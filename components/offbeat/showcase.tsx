"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CubeIcon, HandGrabbingIcon } from "@phosphor-icons/react";
import { Configurator } from "./configurator";
import { finishes, readPreference } from "@/lib/offbeat/finishes";
const Speaker = dynamic(() => import("./speaker"), {
  ssr: false,
  loading: () => (
    <div className="canvas-loading" role="status">
      Setting the stage
      <span className="loading-line" />
    </div>
  ),
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
          <p className="hero-intro">Meet your new plus-one.</p>
          <h1>
            Small speaker.
            <br />
            Big personality.
          </h1>
          <p className="hero-description">
            For kitchen discos, off-grid weekends, and everything in between.
            Take your sound a little less seriously.
          </p>
          <div className="hero-buttons">
            <a href="#make-it-yours" className="button">
              Find your color
            </a>
            <Link href="/studio/" className="text-link">
              Take it for a spin <span className="mini-record" />
            </Link>
          </div>
        </div>
        <div
          className="product-stage"
          style={
            { "--finish-field": finishes[finish].bg } as React.CSSProperties
          }
        >
          <div className="product-orbit" />
          <span className="product-watermark" aria-hidden="true">
            ob.
          </span>
          <Speaker color={finishes[finish].color} exploded={exploded} />
          <div className="scene-bottom">
            <span>
              <HandGrabbingIcon size={17} /> Drag to discover
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
          <span>Pick your personality</span>
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
      <div className="feature-strip">
        <span>A proper little powerhouse.</span>
        <p>
          <strong>24 h</strong> of good company
        </p>
        <p>
          <strong>20 W</strong> full-range sound
        </p>
        <p>
          <strong>IP67</strong> adventure ready
        </p>
      </div>
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
            Life sounds
            <br />
            better out loud.
          </h2>
          <p>
            Not every moment needs headphones. Let your favorite record fill the
            room. Share the good bit. Stay for one more song.
          </p>
          <Link href="/design/" className="button button-outline">
            Get to know OFFBEAT
          </Link>
        </div>
      </section>
      <section className="manifesto">
        <span className="manifesto-note">
          Less screen time. More good times.
        </span>
        <h2>
          Your phone can
          <br />
          stay in your pocket.
        </h2>
        <p>
          A real dial. A satisfying click. Your favorite song.
          <br />
          Some things are better kept simple.
        </p>
        <Link href="/studio/" className="button">
          Make a little noise
        </Link>
      </section>
      <Configurator finish={finish} onFinishChange={changeFinish} />
      <section className="faq-section">
        <h2>A few good questions.</h2>
        <div className="faq-list">
          {[
            [
              "Does it need an app?",
              "No app, no account, no fuss. The concept pairs directly over Bluetooth. Use the top dial for volume and the physical buttons for play and pairing.",
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
