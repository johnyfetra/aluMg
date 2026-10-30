"use client";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useDirectory } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import { EmptyState, ErrorState, LoadingState } from "../Feedback";
import Photo from "./Photo";

export default function ProjectGallery({ limit }: { limit?: number }) {
  const { locale } = useI18n();
  const c = marketing[locale];
  const { data, error, isLoading, mutate } = useDirectory({ sort: "recent" });
  const projects = (data ?? []).filter(m => m.cover);
  if (error) return <ErrorState retry={() => { void mutate(); }} />;
  if (isLoading) return <LoadingState />;
  if (!projects.length) return <EmptyState message={c.projectsEmpty}><Link href="/menuisiers" className="btn-secondary">{c.find}</Link></EmptyState>;
  return <div>
    {!limit && <p className="mb-6 text-sm text-muted">{projects.length} {c.galleryCount}</p>}
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{projects.slice(0, limit).map(m => <article key={m.slug} className="group">
      <Link href={`/menuisiers/${m.slug}#h-port`} className="block rounded-xl focus-visible:outline-offset-4">
        <Photo src={m.cover} alt={m.name} className="aspect-[4/3] rounded-xl transition-opacity group-hover:opacity-90" />
        <div className="mt-4 flex items-start justify-between gap-3"><div><h3 className="font-semibold">{m.name}</h3>{m.city && <p className="mt-1 flex items-center gap-1 text-sm text-muted"><MapPin size={13} aria-hidden />{m.city}</p>}</div><ArrowUpRight size={19} aria-hidden className="mt-1 text-primary" /></div>
      </Link>
    </article>)}</div>
  </div>;
}
