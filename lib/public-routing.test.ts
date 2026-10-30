import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

const origin = "http://localhost:3001";
describe("accès à la vitrine sans session", () => {
  it.each(["/", "/application", "/menuisiers", "/menuisiers/atelier-exemple", "/realisations-menuiserie", "/connexion", "/inscription"])("laisse consulter %s sans redirection", path => {
    const response = proxy(new NextRequest(origin + path));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
  it.each(["/realisations", "/profil-public", "/devis", "/espace-client"])("garde %s protégé", path => {
    const response = proxy(new NextRequest(origin + path));
    expect(response.status).toBe(307);
    const target = new URL(response.headers.get("location")!);
    expect(target.pathname).toBe("/connexion");
    expect(target.searchParams.get("next")).toBe(path);
  });
  it("préserve le contrôle d'origine des mutations", () => {
    const response = proxy(new NextRequest(origin + "/api/profile", { method: "PUT", headers: { origin: "https://another.example" } }));
    expect(response.status).toBe(403);
  });
});
