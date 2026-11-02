"use client";

// Dernier filet : l'erreur vient de la structure même de l'application (thème, langue indisponibles). Page autonome, bilingue, sans dépendance.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#141916", color: "#ece9e2", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <div style={{ maxWidth: 460 }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Un joint a lâché de notre côté.</h1>
          <p style={{ color: "#a5ada6", lineHeight: 1.6, margin: "0 0 24px" }}>Une erreur est survenue. Vos données ne sont pas perdues. / Something went wrong. Your data is safe.</p>
          <button type="button" onClick={reset} style={{ background: "#c58a58", color: "#1f140a", border: 0, borderRadius: 10, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Réessayer · Try again</button>
        </div>
      </body>
    </html>
  );
}
