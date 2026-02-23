"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { name: "Map", href: "/" },
    { name: "Pins", href: "/pins"},
    { name: "Account", href: "/account"},
  ];

  return (
    <nav className="sticky top-0 z-50 h-16 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-xl font-semibold text-zinc-900 transition-colors hover:text-zinc-700"
        >
          Pin It
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="text-zinc-700 transition-colors hover:text-zinc-900 md:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-zinc-200 bg-white px-4 py-3 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="block py-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900"
              onClick={() => setIsMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
        </div>
      ) : null}
    </nav>
  );
}
