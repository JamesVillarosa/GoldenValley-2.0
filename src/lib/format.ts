export const peso = (n: number) =>
  `${n < 0 ? "-" : ""}₱${Math.abs(Number(n)).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

/** "₱20" per gallon, or the deal as it was agreed: "₱50 for 3 gal". */
export const priceLabel = (perGallon: number, qty = 1) =>
  qty > 1 ? `${peso(Math.round(perGallon * qty * 100) / 100)} for ${qty} gal` : peso(perGallon);

export const gal = (n: number) => `${Number(n).toLocaleString("en-PH")} gal`;
