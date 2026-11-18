import { Boxes, Briefcase, Building2, CalendarCheck, ClipboardList, FilePlus2, FileText, Gauge, LayoutDashboard, MessageCircle, MessageSquareText, MessagesSquare, ScrollText, Search, Settings, Share2, Store, UserCircle, Users } from "lucide-react";
import type { Messages } from "@/lib/messages/fr";
import { HIDDEN, HIDDEN_CLIENT, MVP } from "@/lib/mvp";

// Navigation de l'application, par rôle : bouton principal (cta) et groupes de la barre latérale.
// Ajouter un écran = ajouter une entrée ici ; la barre, le titre de la barre du haut et le tiroir mobile suivent.
export type Item = { href: string; key: keyof Messages; Icon: typeof Settings; match: (p: string) => boolean };
export type Group = { label: keyof Messages; items: Item[] };
export type Nav = { home: string; cta?: Item; groups: Group[] }; // navigation adaptée au rôle

const starts = (...prefix: string[]) => (p: string) => prefix.some((x) => p === x || p.startsWith(`${x}/`));

const FULL_MENUISIER: Nav = {
  home: "/tableau-de-bord",
  cta: { href: "/devis/nouveau", key: "nav.new", Icon: FilePlus2, match: (p) => p === "/devis/nouveau" },
  groups: [
    {
      label: "nav.group.main",
      items: [
        { href: "/tableau-de-bord", key: "nav.dashboard", Icon: LayoutDashboard, match: starts("/tableau-de-bord") },
        { href: "/devis", key: "nav.quotes", Icon: FileText, match: (p) => (p === "/devis" || p.startsWith("/devis/")) && p !== "/devis/nouveau" },
        { href: "/chantiers", key: "nav.sites", Icon: Briefcase, match: starts("/chantiers") },
        { href: "/clients", key: "nav.clients", Icon: Users, match: starts("/clients") },
        { href: "/messages", key: "nav.messages", Icon: MessageCircle, match: starts("/messages") },
      ],
    },
    {
      label: "nav.group.config",
      items: [
        // trois rubriques à onglets ; le guide et le compte sont dans le menu de l'utilisateur (barre du haut)
        { href: "/fournisseurs", key: "nav.prices", Icon: Boxes, match: starts("/fournisseurs") },
        { href: "/reglages", key: "cfg.company", Icon: Building2, match: starts("/reglages", "/modele-devis") },
        { href: "/profil-public", key: "cfg.showcase", Icon: Store, match: starts("/profil-public", "/realisations") },
      ],
    },
  ],
};

// Le mode MVP ne masque que les écrans avancés, pas la vitrine publique.
const MENUISIER: Nav = MVP
  ? { ...FULL_MENUISIER, groups: FULL_MENUISIER.groups.map((g) => ({ ...g, items: g.items.filter((i) => !HIDDEN.some((h) => i.href === h)) })).filter((g) => g.items.length) }
  : FULL_MENUISIER;

const FULL_CLIENT: Nav = {
  home: "/espace-client",
  cta: { href: "/espace-client/nouvelle", key: "cl.newRequest", Icon: FilePlus2, match: starts("/espace-client/nouvelle") },
  groups: [
    {
      label: "nav.group.main",
      items: [
        { href: "/espace-client", key: "cl.myRequests", Icon: ClipboardList, match: (p) => p === "/espace-client" || p.startsWith("/espace-client/devis") },
        { href: "/messages", key: "nav.messages", Icon: MessageCircle, match: starts("/messages") },
        { href: "/menuisiers", key: "cl.findJoiner", Icon: Search, match: starts("/menuisiers") },
      ],
    },
    { label: "nav.group.config", items: [{ href: "/compte", key: "nav.account", Icon: UserCircle, match: starts("/compte") }] },
  ],
};

const CLIENT: Nav = MVP
  ? { home: FULL_CLIENT.home, cta: FULL_CLIENT.cta, groups: FULL_CLIENT.groups.map((g) => ({ ...g, items: g.items.filter((i) => !HIDDEN_CLIENT.includes(i.href)) })) }
  : FULL_CLIENT;

// L'administrateur garde l'accès aux écrans du menuisier, sous l'espace « Administration ».
const ADMIN: Nav = {
  home: "/admin",
  groups: [
    {
      label: "nav.group.admin",
      items: [
        { href: "/admin", key: "admin.dashboard", Icon: Gauge, match: (p) => p === "/admin" },
        { href: "/admin/comptes", key: "admin.accounts", Icon: Users, match: starts("/admin/comptes") },
        { href: "/admin/devis", key: "admin.allQuotes", Icon: FileText, match: starts("/admin/devis") },
        { href: "/admin/reseaux", key: "admin.social", Icon: Share2, match: starts("/admin/reseaux") },
        { href: "/admin/retours", key: "admin.feedback", Icon: MessageSquareText, match: starts("/admin/retours") },
        { href: "/admin/rendez-vous", key: "admin.demos", Icon: CalendarCheck, match: starts("/admin/rendez-vous") },
        { href: "/admin/messages-site", key: "admin.siteMsgs", Icon: MessagesSquare, match: starts("/admin/messages-site") },
        { href: "/admin/journal", key: "admin.audit", Icon: ScrollText, match: starts("/admin/journal") },
      ],
    },
    ...MENUISIER.groups,
  ],
};

export const navFor = (role?: string): Nav => (role === "client" ? CLIENT : role === "admin" ? ADMIN : MENUISIER);

// L'entrée de navigation de la page courante (titre de la barre du haut)
export const currentItem = (nav: Nav, path: string) => [...(nav.cta ? [nav.cta] : []), ...nav.groups.flatMap((g) => g.items)].find((i) => i.match(path));
