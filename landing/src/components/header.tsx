"use client";

import { useState, useEffect, useCallback } from "react";

const NAV_LINKS = [
  { href: "#about", label: "Обо мне" },
  { href: "#education", label: "Образование" },
  { href: "#certificates", label: "Сертификаты" },
  { href: "#conditions", label: "Условия" },
  { href: "#reviews", label: "Отзывы" },
  { href: "#contacts", label: "Контакты" },
] as const;

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLinkClick = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur transition-shadow duration-300 ${
        isScrolled ? "shadow-md" : "shadow-none"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <a href="#" className="text-xl font-bold text-primary">
          Преподаватель
        </a>

        {/* Desktop navigation */}
        <ul className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                className="text-sm font-medium text-secondary transition-colors duration-200 hover:text-primary"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="flex flex-col items-center justify-center gap-1.5 p-2 md:hidden"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={isMenuOpen}
        >
          <span
            className={`block h-0.5 w-6 rounded bg-text transition-all duration-300 ${
              isMenuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 rounded bg-text transition-all duration-300 ${
              isMenuOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`block h-0.5 w-6 rounded bg-text transition-all duration-300 ${
              isMenuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out md:hidden ${
          isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="border-t border-border bg-white/95 px-4 py-2">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                className="block py-3 text-sm font-medium text-secondary transition-colors duration-200 hover:text-primary"
                onClick={handleLinkClick}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
};
