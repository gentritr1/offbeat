"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  CubeIcon,
  HandGrabbingIcon,
  SpeakerHighIcon,
  RadioIcon,
  BatteryHighIcon,
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
    body: "Knurled aluminum. A tactile turn. The volume control is right where your hand expects it to be.",
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
          <p className="small-label">Good design should feel good.</p>
          <h1>
            Made to
            <br />
            be played.
          </h1>
          <p className="body-copy">
            Nothing extra. Nothing missing.
            <br />A little object with a lot of thought behind it.
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
              Take a closer look
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
            Fits the room.
            <br />
            Sets the mood.
          </h2>
          <p>Easy to live with. Hard to leave behind.</p>
        </div>
      </section>
      <section className="specs-section">
        <div>
          <h2>
            The little
            <br />
            details.
          </h2>
          <p className="body-copy">A big idea, in a small package.</p>
          <span className="concept-specs">Concept specifications</span>
        </div>
        <dl className="spec-table">
          {[
            ["Sound", "2 × 10 W full-range drivers"],
            ["Battery", "Up to 24 hours of listening"],
            ["Connection", "Bluetooth 5.3 + stereo pairing"],
            ["Protection", "IP67 dust & water resistance"],
            ["Dimensions", "230 × 150 × 100 mm"],
            ["Weight", "740 g"],
            ["Charging", "USB-C, approximately 3 hours"],
            ["Controls", "Volume dial, play/pause, pairing"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="design-ending">
        <BatteryHighIcon size={42} />
        <h2>
          Ready for your
          <br />
          next good thing.
        </h2>
        <Link className="button" href="/#make-it-yours">
          Choose your finish
        </Link>
      </section>
    </>
  );
}
