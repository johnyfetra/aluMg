import { describe, expect, it } from "vitest";
import { matchItems } from "./search";

const items = [
  { id: "1", title: "DV-2026-0001", sub: "Hery Rakoto · Villa" },
  { id: "2", title: "Rakotobe Élise", sub: "034 00" },
  { id: "3", title: "M. Andriamanana", sub: "Rakotondrabe" },
  { id: "4", title: "Toky", sub: "Hôtel" },
];

describe("matchItems", () => {
  it("met d'abord les titres qui commencent par le texte, puis ceux qui le contiennent, puis la ligne secondaire", () => {
    expect(matchItems(items, "rako").map((i) => i.id)).toEqual(["2", "1", "3"]);
  });
  it("ignore accents et casse, et rien pour un texte vide", () => {
    expect(matchItems(items, "HOTEL").map((i) => i.id)).toEqual(["4"]);
    expect(matchItems(items, "elise").map((i) => i.id)).toEqual(["2"]);
    expect(matchItems(items, "  ")).toEqual([]);
  });
  it("limite le nombre de suggestions", () => {
    expect(matchItems(items, "a", 2)).toHaveLength(2);
  });
});
