"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MoonIcon, SunIcon, ListIcon, XIcon } from "@phosphor-icons/react";
import { readPreference, savePreference } from "@/lib/offbeat/finishes";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const keyboard = () => {
      document.documentElement.dataset.input = "keyboard";
    };
    const pointer = () => {
      document.documentElement.dataset.input = "pointer";
    };
    document.addEventListener("keydown", keyboard);
    document.addEventListener("pointerdown", pointer);
    return () => {
      document.removeEventListener("keydown", keyboard);
      document.removeEventListener("pointerdown", pointer);
    };
  }, []);
  useEffect(() => {
    const saved = readPreference("offbeat-theme");
    const mode = saved
      ? saved === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(mode);
    document.documentElement.dataset.theme = mode ? "dark" : "light";
  }, []);
  useEffect(() => {
    setMenu(false);
  }, [path]);
  useEffect(() => {
    if (!menu) return;
    header.current?.querySelector<HTMLAnchorElement>("nav a")?.focus();
    function dismiss(event: PointerEvent) {
      if (!header.current?.contains(event.target as Node)) setMenu(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenu(false);
      menuButton.current?.focus();
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);
  function theme() {
    const mode = !dark;
    setDark(mode);
    document.documentElement.dataset.theme = mode ? "dark" : "light";
    savePreference("offbeat-theme", mode ? "dark" : "light");
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header
        className="header"
        ref={header}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setMenu(false);
        }}
      >
        <Link href="/" className="wordmark" aria-label="OFFBEAT home">
          offbeat
          <span className="logo-bars">
            <i />
            <i />
            <i />
          </span>
        </Link>
        <nav
          id="main-navigation"
          aria-label="Main navigation"
          className={menu ? "nav is-open" : "nav"}
        >
          {[
            ["/", "The speaker"],
            ["/design/", "By design"],
            ["/studio/", "Sound studio"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenu(false)}
              aria-current={
                path === href || path + "/" === href ? "page" : undefined
              }
            >
              {label}
              {href === "/studio/" && <span className="nav-new">Play</span>}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button theme-button"
            onClick={theme}
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {dark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>
          <Link className="button button-small" href="/#make-it-yours">
            Make it yours
          </Link>
          <button
            className="icon-button menu-button"
            ref={menuButton}
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            aria-controls="main-navigation"
          >
            {menu ? <XIcon size={22} /> : <ListIcon size={22} />}
          </button>
        </div>
      </header>
      <div key={path} className="route-enter">
        {children}
      </div>
      <footer className="footer">
        <Link href="/" className="wordmark">
          offbeat
          <span className="logo-bars">
            <i />
            <i />
            <i />
          </span>
        </Link>
        <p>A speaker with a drum machine inside.</p>
        <div>
          <Link href="/design/">Behind the design</Link>
          <Link href="/studio/">Make some noise</Link>
        </div>
        <span className="concept-note">An independent product concept.</span>
      </footer>
    </>
  );
}
