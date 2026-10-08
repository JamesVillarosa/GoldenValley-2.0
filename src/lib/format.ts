export const peso = (n: number) =>
  `${n < 0 ? "-" : ""}₱${Math.abs(Number(n)).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

export const gal = (n: number) => `${Number(n).toLocaleString("en-PH")} gal`;
