"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

const links = [
  { href: "/browse", label: "Browse" },
  { href: "/multiview", label: "Multiview" },
  { href: "/account", label: "Account" },
  { href: "/pricing", label: "Pro" },
];

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/browse" className="flex items-center gap-2 text-lg font-semibold text-white">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-black">
            YL
          </span>
          YouTube Livestream Browser
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition-colors hover:text-white",
                pathname?.startsWith(link.href) && "text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          aria-label="Toggle navigation"
          className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-slate-200 md:hidden"
          onClick={() => setOpen((prev) => !prev)}
        >
          <MenuIcon />
        </button>
      </div>
      {open && (
        <nav className="space-y-1 border-t border-slate-800 px-4 pb-4 pt-2 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/60",
                pathname?.startsWith(link.href) && "bg-slate-800/60 text-white"
              )}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
