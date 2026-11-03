import { describe, expect, it } from "vitest";
import { dataUrlToBlob } from "./image";

describe("dataUrlToBlob (remplace fetch(data:…), interdit par la politique de sécurité)", () => {
  it("restitue le type et les octets", async () => {
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]); // signature PNG
    const url = `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
    const blob = dataUrlToBlob(url);
    expect(blob.type).toBe("image/png");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(png);
  });
  it("accepte un type avec paramètre et un contenu vide", () => {
    expect(dataUrlToBlob("data:image/jpeg;charset=utf-8;base64,").type).toBe("image/jpeg");
    expect(dataUrlToBlob("data:image/jpeg;base64,").size).toBe(0);
  });
});
