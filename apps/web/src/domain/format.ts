export function formatUsd(value: number, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const cents = opts.cents ?? true;
  const abs = Math.abs(value);
  const text = abs.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  if (opts.sign) return `${value < 0 ? "−" : "+"}${text}`;
  return value < 0 ? `−${text}` : text;
}

/** Whole dollars when the amount is whole, cents otherwise. */
export function formatAmount(value: number): string {
  return formatUsd(value, { cents: value % 1 !== 0 });
}

export function formatPercent(value: number, opts: { sign?: boolean; digits?: number } = {}): string {
  const digits = opts.digits ?? 1;
  const text = `${Math.abs(value).toFixed(digits)}%`;
  if (opts.sign === false) return text;
  return `${value < 0 ? "−" : "+"}${text}`;
}

export function formatShares(shares: number): string {
  if (shares >= 10) return shares.toFixed(2);
  if (shares >= 1) return shares.toFixed(3);
  return shares.toFixed(4);
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function trendOf(value: number): "up" | "down" | "flat" {
  if (value > 0.0001) return "up";
  if (value < -0.0001) return "down";
  return "flat";
}
