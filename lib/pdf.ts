import { jsPDF } from "jspdf";
import { allPieces, billedArea, cutList, cuttingPlan, fmt, lineTotal, meters, planTotals } from "./calc";
import { lineDetails, lineTitle } from "./describe";
import { drawingSvg, svgToPng } from "./drawing";
import { DATE_LOCALE, type Locale, type T } from "./i18n";
import { DOC_PRESETS, type Quote, type Settings } from "./model";
import { serviceTotal, totals } from "./totals";
import { amountInWords } from "./words";

const M = 15; // marge
const R = 195; // bord droit
const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function fit(doc: jsPDF, img: string, x: number, y: number, maxW: number, maxH: number) {
  const p = doc.getImageProperties(img);
  const k = Math.min(maxW / p.width, maxH / p.height);
  const w = p.width * k;
  const h = p.height * k;
  doc.addImage(img, "PNG", x, y, w, h);
  return { w, h };
}

// Construit le PDF (sans le télécharger) : testable sous Node.
export async function buildQuotePdf(q: Quote, s: Settings, t: T, locale: Locale, withCutSheet: boolean) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const accent = rgb(s.accent);
  // personnalisation cadrée (lib/docStyle.ts) : mise en page variable, mentions toujours imprimées
  const st = { ...DOC_PRESETS.classique, ...(q.docStyle ?? s.docStyle) };
  const F = st.font === "serif" ? "times" : "helvetica";
  const oy = st.header === "center" ? 12 : 0; // décalage des blocs sous l'entête centré
  const date = new Date(q.date);
  const until = new Date(date.getTime() + q.terms.validityDays * 864e5);
  const d = (x: Date) => x.toLocaleDateString(DATE_LOCALE[locale]);
  const { gross, discount, ht, tva, ttc } = totals(q);
  const gray = () => doc.setTextColor(95, 105, 125);
  const dark = () => doc.setTextColor(15, 23, 42);
  const label = (txt: string, x: number, y: number) => {
    doc.setFont(F, "bold").setFontSize(7.5).setTextColor(...accent).text(txt.toUpperCase(), x, y);
  };

  // ----- entête : trois dispositions (split, banner, center), toujours les mêmes mentions
  const idLines = [s.address, [s.phone, s.email].filter(Boolean).join("  ·  "), s.website, [s.nif && `NIF ${s.nif}`, s.stat && `STAT ${s.stat}`].filter(Boolean).join("  ·  ")].filter(Boolean) as string[];
  const metaBox = (x: number, y0: number, w: number) => {
    doc.setFillColor(243, 245, 250).roundedRect(x, y0, w, 17, 1.5, 1.5, "F");
    doc.setFontSize(8.5);
    [[t("pdf.number"), q.number], [t("pdf.date"), d(date)], [t("pdf.validUntil"), d(until)]].forEach(([k, v], i) => {
      gray();
      doc.setFont(F, "normal").text(k, x + 3, y0 + 5 + i * 4.4);
      dark();
      doc.setFont(F, "bold").text(v, x + w - 3, y0 + 5 + i * 4.4, { align: "right" });
    });
  };
  if (st.header === "banner") {
    doc.setFillColor(...accent).rect(0, 0, 210, 24, "F");
    let bx = M;
    if (s.logo) {
      doc.setFillColor(255, 255, 255).roundedRect(M, 4, 26, 16, 1.5, 1.5, "F");
      fit(doc, s.logo, M + 1, 5, 24, 14);
      bx = M + 30;
    }
    doc.setTextColor(255, 255, 255).setFont(F, "bold").setFontSize(15).text(s.company || "—", bx, 15);
    doc.setFontSize(20).text(t("pdf.quote"), R, 15, { align: "right" });
    gray();
    doc.setFont(F, "normal").setFontSize(8.5);
    idLines.forEach((line, i) => doc.text(line, M, 31 + i * 4.1));
    metaBox(130, 27, R - 130);
    doc.setDrawColor(...accent).setLineWidth(0.5).line(M, 47, R, 47);
  } else if (st.header === "center") {
    doc.setFillColor(...accent).rect(0, 0, 210, 5, "F");
    if (s.logo) {
      const pr = doc.getImageProperties(s.logo);
      const k = Math.min(30 / pr.width, 14 / pr.height);
      fit(doc, s.logo, 105 - (pr.width * k) / 2, 8, 30, 14);
    }
    const hy = s.logo ? 27 : 17;
    dark();
    doc.setFont(F, "bold").setFontSize(15).text(s.company || "—", 105, hy, { align: "center" });
    gray();
    doc.setFont(F, "normal").setFontSize(8.5);
    idLines.forEach((line, i) => doc.text(line, 105, hy + 5.5 + i * 4.1, { align: "center" }));
    const ry0 = hy + 5.5 + idLines.length * 4.1 + 3;
    doc.setDrawColor(...accent).setLineWidth(0.4).line(M, ry0, R, ry0);
    doc.setTextColor(...accent).setFont(F, "bold").setFontSize(13).text(`${t("pdf.quote")} ${q.number}`, 105, ry0 + 6.5, { align: "center" });
    gray();
    doc.setFont(F, "normal").setFontSize(8.5).text(`${d(date)}  ·  ${t("pdf.validUntil")} ${d(until)}`, 105, ry0 + 11.5, { align: "center" });
  } else {
    doc.setFillColor(...accent).rect(0, 0, 210, 5, "F");
    let tx = M;
    if (s.logo) tx += fit(doc, s.logo, M, 11, 36, 22).w + 5;
    dark();
    doc.setFont(F, "bold").setFontSize(15).text(s.company || "—", tx, 17);
    gray();
    doc.setFont(F, "normal").setFontSize(8.5);
    idLines.forEach((line, i) => doc.text(line, tx, 22.5 + i * 4.1));
    doc.setTextColor(...accent).setFont(F, "bold").setFontSize(24).text(t("pdf.quote"), R, 19, { align: "right" });
    metaBox(130, 23, R - 130);
    doc.setDrawColor(...accent).setLineWidth(0.5).line(M, 45, R, 45);
  }

  // ----- client
  doc.setFillColor(243, 245, 250).roundedRect(M, 50 + oy, q.project ? 85 : R - M, 22, 1.5, 1.5, "F");
  label(t("pdf.client"), M + 4, 56 + oy);
  dark();
  doc.setFont(F, "bold").setFontSize(10.5).text(q.client.name || "—", M + 4, 61.5 + oy);
  gray();
  doc.setFont(F, "normal").setFontSize(8.5);
  [q.client.phone, q.client.address].filter(Boolean).forEach((l, i) => doc.text(l, M + 4, 66 + oy + i * 4));
  if (q.project) {
    label(t("pdf.project"), 108, 56 + oy);
    dark();
    doc.setFont(F, "normal").setFontSize(10).text(doc.splitTextToSize(q.project, R - 108).slice(0, 3), 108, 61.5 + oy);
  }

  // ----- tableau (style : zebra / lines / boxed ; densité ; schémas facultatifs)
  const compact = st.density === "compact";
  const header = (y: number) => {
    if (st.table === "lines") {
      doc.setDrawColor(...accent).setLineWidth(0.6).line(M, y + 7.5, R, y + 7.5);
      doc.setTextColor(40, 50, 70);
    } else {
      doc.setFillColor(...accent).rect(M, y, R - M, 7.5, "F");
      doc.setTextColor(255, 255, 255);
    }
    doc.setFont(F, "bold").setFontSize(8.5);
    doc.text(t("pdf.designation"), M + 3, y + 5);
    doc.text(t("pdf.qty"), 138, y + 5, { align: "center" });
    doc.text(t("pdf.unit"), 168, y + 5, { align: "right" });
    doc.text(t("pdf.total"), R - 3, y + 5, { align: "right" });
  };
  let y = 80 + oy;
  header(y);
  y += 7.5;
  let n = 0;
  for (const l of q.lines) {
    const size = `${l.width} × ${l.height} ${t("common.mm")}  ·  ${t("pdf.area")} ${fmt(Math.round(billedArea(l, s.minArea) * 100) / 100)} m²`;
    const info = [...(l.room ? [l.room] : []), size, ...(l.note ? [`« ${l.note} »`] : []), ...lineDetails(l, t)].slice(0, compact ? 4 : 6);
    const ROW = st.drawings ? (compact ? 28 : 36) : Math.max(14, 13 + info.length * 4.2);
    if (y + ROW > 268) {
      doc.addPage();
      y = 15;
      header(y);
      y += 7.5;
    }
    if (n++ % 2 && st.table === "zebra") doc.setFillColor(249, 250, 253).rect(M, y, R - M, ROW, "F");
    const tx = st.drawings ? M + 48 : M + 3;
    if (st.drawings) {
      const sk = drawingSvg(l, l.id, 240, 170);
      fit(doc, await svgToPng(sk.svg, sk.w, sk.h, 2), M + 2, y + 2, compact ? 32 : 40, ROW - 4);
    }
    dark();
    doc.setFont(F, "bold").setFontSize(10).text(doc.splitTextToSize(lineTitle(l, t).replace(/^./, (c) => c.toUpperCase()), st.drawings ? 82 : 105), tx, y + 7);
    gray();
    doc.setFont(F, "normal").setFontSize(8.3);
    info.forEach((ln, i) => doc.text(doc.splitTextToSize(ln, st.drawings ? 82 : 105)[0], tx, y + 12 + i * 4.2));
    dark();
    doc.setFontSize(9.5).setFont(F, "normal");
    doc.text(String(l.qty), 138, y + 7, { align: "center" });
    doc.text(fmt(l.unit), 168, y + 7, { align: "right" });
    doc.setFont(F, "bold").text(fmt(lineTotal(l)), R - 3, y + 7, { align: "right" });
    y += ROW;
    if (st.table === "boxed") {
      doc.setDrawColor(160, 170, 190).setLineWidth(0.2).rect(M, y - ROW, R - M, ROW);
      [126, 150, 172].forEach((vx) => doc.line(vx, y - ROW, vx, y));
    } else doc.setDrawColor(222, 227, 238).setLineWidth(0.2).line(M, y, R, y);
  }
  // prestations hors ouvrage : une ligne compacte chacune
  for (const v of q.services ?? []) {
    if (y + 10 > 268) {
      doc.addPage();
      y = 15;
      header(y);
      y += 7.5;
    }
    dark();
    doc.setFont(F, "bold").setFontSize(9.5).text(doc.splitTextToSize(v.label || t(`svc.${v.kind}`), 100)[0], M + 3, y + 6.5);
    doc.setFont(F, "normal").text(String(v.qty), 138, y + 6.5, { align: "center" });
    doc.text(fmt(v.price), 168, y + 6.5, { align: "right" });
    doc.setFont(F, "bold").text(fmt(serviceTotal(v)), R - 3, y + 6.5, { align: "right" });
    y += 10;
    doc.setDrawColor(222, 227, 238).setLineWidth(0.2).line(M, y, R, y);
  }

  // ----- totaux, conditions, signatures (bloc insécable)
  if (y + 86 > 284) {
    doc.addPage();
    y = 15;
  }
  y += 7;
  const row = (lb: string, v: string, yy: number) => {
    doc.setFont(F, "normal").setFontSize(9.5);
    doc.text(lb, 128, yy);
    doc.text(v, R - 3, yy, { align: "right" });
  };
  dark();
  let ry = y;
  if (discount > 0) {
    row(t("pdf.subtotal"), `${fmt(gross)} Ar`, ry);
    row(`${t("pdf.discount")} ${q.discount} %`, `− ${fmt(discount)} Ar`, ry + 5.5);
    ry += 11;
  }
  row(t("pdf.totalHt"), `${fmt(ht)} Ar`, ry);
  if (q.terms.tva > 0) {
    row(`${t("pdf.totalTva")} ${q.terms.tva} %`, `${fmt(tva)} Ar`, ry + 5.5);
    ry += 5.5;
  }
  doc.setFillColor(...accent).roundedRect(125, ry + 9, R - 125, 10, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255).setFont(F, "bold").setFontSize(11);
  doc.text(t("pdf.totalTtc"), 128, ry + 15.6);
  doc.text(`${fmt(ttc)} Ar`, R - 3, ry + 15.6, { align: "right" });

  label(t("pdf.conditions"), M, y);
  gray();
  doc.setFont(F, "normal").setFontSize(8.5);
  const dep = Math.round((ttc * q.terms.deposit) / 100);
  const cond = [
    `${t("pdf.deposit")} : ${q.terms.deposit} % (${fmt(dep)} Ar)`,
    `${t("pdf.balance")} : ${fmt(ttc - dep)} Ar`,
    q.delay && `${t("pdf.delay")} : ${q.delay}`,
    (q.warranty ?? 0) > 0 && `${t("svc.warrantyLine")} : ${q.warranty} ${t("svc.months")}`,
    s.paymentInfo && `${t("pdf.payment")} : ${s.paymentInfo}`,
    q.notes && `${t("pdf.notes")} : ${q.notes}`,
    locale === "fr" && t("pdf.words").replace("{w}", amountInWords(ttc)), // montant en lettres (français seulement)
  ].filter(Boolean) as string[];
  doc.text(doc.splitTextToSize(cond.join("\n"), 100), M, y + 5);

  y += 42;
  doc.setDrawColor(160, 170, 190).setLineWidth(0.3);
  doc.roundedRect(M, y, 80, 36, 1.5, 1.5).roundedRect(R - 80, y, 80, 36, 1.5, 1.5);
  dark();
  doc.setFont(F, "bold").setFontSize(8.5);
  doc.text(t("pdf.signSupplier"), M + 3, y + 5);
  doc.text(doc.splitTextToSize(t("pdf.signClient"), 74), R - 77, y + 5);
  if (s.signature) fit(doc, s.signature, M + 3, y + 8, 50, 20);
  if (s.signer) doc.setFont(F, "normal").text(s.signer, M + 3, y + 33);
  if (st.footer) {
    let fy = y + 44;
    if (fy > 282) {
      doc.addPage();
      fy = 20;
    }
    gray();
    doc.setFont(F, "normal").setFontSize(8.5).text(doc.splitTextToSize(st.footer, R - M), 105, fy, { align: "center" });
  }

  // ----- annexe : fiche de débit (usage atelier) : coupes par élément, plan de coupe, totaux, vitrages
  if (withCutSheet) {
    doc.addPage();
    doc.setFillColor(...accent).rect(0, 0, 210, 5, "F");
    dark();
    doc.setFont(F, "bold").setFontSize(15).text(`${t("pdf.cutSheet")} — ${q.number}`, M, 20);
    let cy = 28;
    const need = (h: number) => {
      if (cy + h > 280) {
        doc.addPage();
        cy = 20;
      }
    };
    const plans = cuttingPlan(allPieces(q.lines), s.barLength, s.kerf);
    const tot = planTotals(plans);

    // totaux en tête
    doc.setFillColor(243, 245, 250).roundedRect(M, cy, R - M, 16, 1.5, 1.5, "F");
    const stats: [string, string][] = [
      [t("needs.totalBars"), String(tot.bars)],
      [t("needs.totalLength"), meters(tot.totalLen)],
      [t("needs.totalUsed"), meters(tot.usedLen)],
      [t("needs.totalWaste"), `${meters(tot.wasteLen)} (${tot.wastePct} %)`],
    ];
    stats.forEach(([k, v], i) => {
      const x = M + 4 + i * 45;
      gray();
      doc.setFont(F, "normal").setFontSize(7.5).text(k, x, cy + 6);
      dark();
      doc.setFont(F, "bold").setFontSize(10).text(v, x, cy + 12);
    });
    cy += 24;

    for (const p of plans) {
      need(16 + p.elements.length * 5 + 10);
      doc.setFont(F, "bold").setFontSize(11).setTextColor(...accent).text(`${t(p.profile)}  ·  ${t("needs.barLength")} ${meters(p.barLen)}`, M, cy);
      cy += 5;
      dark();
      doc.setFont(F, "normal").setFontSize(9);
      for (const e of p.elements) {
        need(5);
        doc.text(t(e.element), M + 3, cy);
        gray();
        doc.text(e.lines.map((n) => `#${n}`).join(" "), M + 80, cy);
        dark();
        doc.text(`${e.qty} × ${e.len} ${t("common.mm")}`, R - 3, cy, { align: "right" });
        cy += 4.6;
      }
      need(10);
      doc.setFont(F, "bold").setFontSize(9);
      doc.text(`${p.bars.length} ${t("editor.bars")}  ·  ${t("needs.used")} ${meters(p.usedLen)}  ·  ${t("needs.waste")} ${meters(p.wasteLen)} (${p.wastePct} %)`, M + 3, cy + 1);
      cy += 5;
      gray();
      doc.setFont(F, "normal").setFontSize(8);
      p.bars.forEach((b, i) => {
        need(4.2);
        doc.text(`${t("needs.bar")} ${i + 1} : ${b.cuts.join(" + ")}   (${t("needs.left")} ${b.left} ${t("common.mm")})`, M + 3, cy);
        cy += 4;
      });
      cy += 5;
    }

    // vitrages et panneaux
    const panes = q.lines.flatMap((l, i) => [
      ...cutList(l).glass.map((g) => ({ ...g, label: `${t(`glass.${l.glassType}`)}, ${t(`thickness.${l.thickness}`)}${l.pattern !== "none" ? `, ${t(`pattern.${l.pattern}`)}` : ""}`, line: i + 1, qty: g.qty * l.qty })),
      ...cutList(l).panels.map((g) => ({ ...g, label: t("needs.panels"), line: i + 1, qty: g.qty * l.qty })),
    ]);
    if (panes.length) {
      need(12);
      doc.setFont(F, "bold").setFontSize(11).setTextColor(...accent).text(t("needs.glass"), M, cy);
      cy += 5;
      dark();
      doc.setFont(F, "normal").setFontSize(9);
      panes.forEach((g) => {
        need(5);
        doc.text(`#${g.line}  ${g.qty} × ${g.w} × ${g.h} ${t("common.mm")}`, M + 3, cy);
        gray();
        doc.text(g.label, R - 3, cy, { align: "right" });
        dark();
        cy += 4.6;
      });
    }
  }

  // ----- pied de page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(222, 227, 238).setLineWidth(0.2).line(M, 286, R, 286);
    doc.setFont(F, "normal").setFontSize(7.5);
    gray();
    doc.text([s.company, s.nif && `NIF ${s.nif}`, s.stat && `STAT ${s.stat}`].filter(Boolean).join("  ·  "), M, 291);
    doc.text(`${t("pdf.page")} ${i}/${pages}`, R, 291, { align: "right" });
  }

  return doc;
}

export async function quotePdf(q: Quote, s: Settings, t: T, locale: Locale, withCutSheet: boolean) {
  (await buildQuotePdf(q, s, t, locale, withCutSheet)).save(`${q.number}.pdf`);
}
