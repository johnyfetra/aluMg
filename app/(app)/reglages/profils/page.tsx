import { redirect } from "next/navigation";

// L'ancien emplacement : le catalogue des fournisseurs a maintenant son propre menu.
export default function Moved() {
  return redirect("/fournisseurs");
}
