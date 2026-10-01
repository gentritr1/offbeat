"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MoonIcon, SunIcon, ListIcon, XIcon } from "@phosphor-icons/react";
import { readPreference, savePreference } from "@/lib/offbeat/finishes";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
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
      <header className="header">
        <Link href="/" className="wordmark" aria-label="OFFBEAT home">
          offbeat
          <span className="logo-bars">
            <i />
            <i />
            <i />
          </span>
        </Link>
        <nav
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
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
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
        <p>Good sound. Your own rhythm.</p>
        <div>
          <Link href="/design/">Behind the design</Link>
          <Link href="/studio/">Make some noise</Link>
        </div>
        <span className="concept-note">An independent product concept.</span>
      </footer>
    </>
  );
}
