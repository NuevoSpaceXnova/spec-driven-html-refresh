import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forja Astral — Estrategia espacial" },
      {
        name: "description",
        content: "Conquista el universo y construye tu imperio en Forja Astral, juego de estrategia espacial en el navegador.",
      },
      { property: "og:title", content: "Forja Astral — Estrategia espacial" },
      {
        property: "og:description",
        content: "Conquista el universo y construye tu imperio en Forja Astral.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/forja-astral.html"
      title="Forja Astral"
      className="fixed inset-0 h-screen w-screen border-0 bg-background"
    />
  );
}
