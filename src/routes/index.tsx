import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XnovaEvolution — Estrategia espacial" },
      {
        name: "description",
        content: "Conquista el universo y construye tu imperio en XnovaEvolution, juego de estrategia espacial en el navegador.",
      },
      { property: "og:title", content: "XnovaEvolution — Estrategia espacial" },
      {
        property: "og:description",
        content: "Conquista el universo y construye tu imperio en XnovaEvolution.",
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
      title="XnovaEvolution"
      className="fixed inset-0 h-screen w-screen border-0 bg-background"
    />
  );
}
