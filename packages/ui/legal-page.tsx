"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import english from "./legal-english.json";

export function LegalPage({
  title,
  kind,
  children,
}: {
  title: string;
  kind: "privacy" | "terms";
  children: ReactNode;
}) {
  const [language, setLanguage] = useState("en");
  useEffect(() => {
    if (localStorage.getItem("graphlive-language") === "es") setLanguage("es");
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const spanish = language === "es";
  return (
    <main className="legal-page">
      <header>
        <Link href="/" className="brand-link">
          <strong>GraphLive</strong>
        </Link>
        <nav aria-label={spanish ? "Información legal" : "Legal information"}>
          <Link href="/privacy/">{spanish ? "Privacidad" : "Privacy"}</Link>
          <Link href="/terms/">{spanish ? "Condiciones" : "Terms"}</Link>
          <button
            type="button"
            onClick={() => {
              const next = spanish ? "en" : "es";
              localStorage.setItem("graphlive-language", next);
              setLanguage(next);
            }}
          >
            {spanish ? "English" : "Español"}
          </button>
        </nav>
      </header>
      <article>
        <h1>
          {spanish
            ? title
            : kind === "privacy"
              ? "Privacy policy"
              : "Terms of service"}
        </h1>
        <p className="legal-date">
          {spanish
            ? "Última actualización: 14 de octubre de 2026"
            : "Last updated: 14 October 2026"}
        </p>
        {spanish
          ? children
          : english[kind].map(([heading, ...paragraphs]) => (
              <section key={heading}>
                <h2>{heading}</h2>
                {paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </section>
            ))}
        {!spanish && (
          <nav aria-label="Policy references">
            <Link href="/privacy/">GraphLive privacy policy</Link>
            {" · "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy">
              Google API Services User Data Policy
            </a>
            {" · "}
            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
              GitHub privacy statement
            </a>
            {" · "}
            <a href="https://policies.google.com/privacy">
              Google privacy policy
            </a>
            {" · "}
            <a href="https://myaccount.google.com/connections">
              Google account connections
            </a>
          </nav>
        )}
      </article>
      <footer>
        <Link href="/">
          {spanish ? "Volver a GraphLive" : "Back to GraphLive"}
        </Link>
        <a href="mailto:Iamsboby@gmail.com">Iamsboby@gmail.com</a>
      </footer>
    </main>
  );
}
