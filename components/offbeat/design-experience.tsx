"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  CubeIcon,
  HandGrabbingIcon,
  SpeakerHighIcon,
  RadioIcon,
  DropIcon,
} from "@phosphor-icons/react";
const Speaker = dynamic(() => import("./speaker"), {
  ssr: false,
  loading: () => (
    <div className="canvas-loading">
      Getting under the grille
      <span className="loading-line" />
    </div>
  ),
});
const anatomy = [
  {
    title: "Sound you can feel.",
    body: "Two full-range drivers and a passive bass radiator. A small footprint, with a little more weight behind every note.",
    label: "Full-range drivers",
  },
  {
    title: "A dial worth touching.",
    body: "Knurled aluminum with a firm detent every step. It sets the level, and it is the only control you need while a loop plays.",
    label: "Aluminum volume dial",
  },
  {
    title: "Built for the encore.",
    body: "Soft-touch housing, a woven carry loop, and a replaceable front grille. Materials chosen to feel good long after the first play.",
    label: "Soft-touch enclosure",
  },
];
export function DesignExperience() {
  const [inside, setInside] = useState(true);
  const [detail, setDetail] = useState(0);
  return (
    <>
      <section className="design-hero">
        <div className="design-heading">
          <h1>
            Made to
            <br />
            be played.
          </h1>
          <p className="body-copy">
            Pull it apart: two drivers, a passive radiator, a knurled dial and
            three step keys.
          </p>
        </div>
        <div className="anatomy-stage">
          <div className="anatomy-field" />
          <Speaker
            color="#ee512d"
            exploded={inside}
            rotation={detail === 1 ? 0.3 : detail === 2 ? -1.3 : 0}
          />
          <div className="anatomy-controls">
            <div className="segmented" role="group" aria-label="Product view">
              <button
                onClick={() => setInside(false)}
                className={!inside ? "selected" : ""}
                aria-pressed={!inside}
              >
                Together
              </button>
              <button
                onClick={() => setInside(true)}
                className={inside ? "selected" : ""}
                aria-pressed={inside}
              >
                <CubeIcon size={17} />
                Inside
              </button>
            </div>
            <span>
              <HandGrabbingIcon size={16} />
              Drag to turn
            </span>
          </div>
        </div>
      </section>
      <section className="anatomy-description">
        <div
          className="anatomy-index"
          role="group"
          aria-label="Explore speaker details"
        >
          {anatomy.map((item, i) => (
            <button
              key={item.label}
              onClick={() => {
                setDetail(i);
                setInside(i === 0);
              }}
              className={detail === i ? "selected" : ""}
              aria-pressed={detail === i}
            >
              <span>{item.label}</span>
              <span className="detail-circle">
                {i === 0 ? (
                  <SpeakerHighIcon size={24} />
                ) : i === 1 ? (
                  <RadioIcon size={24} />
                ) : (
                  <DropIcon size={24} />
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="anatomy-copy" key={detail} aria-live="polite">
          <h2>{anatomy[detail].title}</h2>
          <p>{anatomy[detail].body}</p>
        </div>
      </section>
      <section className="design-lifestyle">
        <img
          src="/images/listening-room.webp"
          alt="The OFFBEAT concept with a tactile orange enclosure and woven front grille in a sunlit listening room"
          width="1536"
          height="1024"
          loading="lazy"
        />
        <div>
          <h2>
            Fits on a shelf.
            <br />
            Fills the room.
          </h2>
          <p>740 g, 24 hours a charge, and a loop on the strap.</p>
        </div>
      </section>
      <section className="specs-section">
        <div>
          <h2>
            The back
            <br />
            of the sleeve.
          </h2>
          <p className="body-copy">
            Everything on one side of a record. Fictional, but consistent.
          </p>
          <span className="concept-specs">Concept specifications</span>
        </div>
        <div className="spec-sleeve">
          <header>
            <b>offbeat One</b>
            <span className="readout">Portable speaker / drum machine</span>
          </header>
          {[
            [
              "Side A",
              "A",
              [
                ["Sound", "2 × 10 W"],
                ["Battery", "24 h"],
                ["Connection", "Bluetooth 5.3"],
                ["Protection", "IP67"],
              ],
            ],
            [
              "Side B",
              "B",
              [
                ["Size", "230 × 150 × 100 mm"],
                ["Weight", "740 g"],
                ["Charging", "USB-C, 3 h"],
                ["Controls", "Dial, 3 step keys"],
              ],
            ],
          ].map(([side, letter, rows]) => (
            <div className="spec-side" key={side as string}>
              <h3>{side as string}</h3>
              <dl>
                {(rows as string[][]).map(([label, value], n) => (
                  <div key={label} data-track={`${letter}${n + 1}`}>
                    <dt>{label}</dt>
                    <span className="spec-leader" aria-hidden="true" />
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>
      <section className="design-ending">
        <h2>Seen inside. Now pick the outside.</h2>
        <Link className="button" href="/#make-it-yours">
          Pick a finish
        </Link>
      </section>
    </>
  );
}
