import Link from "next/link";
import type { ReactNode } from "react";
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-page">
      <header>
        <Link href="/" className="brand-link">
          <strong>GraphLive</strong>
        </Link>
        <nav aria-label="Información legal">
          <Link href="/privacy/">Privacidad</Link>
          <Link href="/terms/">Condiciones</Link>
        </nav>
      </header>
      <article>
        <h1>{title}</h1>
        <p className="legal-date">Última actualización: 5 de octubre de 2026</p>
        {children}
      </article>
      <footer>
        <Link href="/">Volver a GraphLive</Link>
        <a href="mailto:Iamsboby@gmail.com">Iamsboby@gmail.com</a>
      </footer>
    </main>
  );
}
