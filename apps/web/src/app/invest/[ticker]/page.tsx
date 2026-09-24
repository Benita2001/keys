import { EXPLORE_ORDER } from "@/mocks/market";
import { InvestFlow } from "./flow";

export function generateStaticParams() {
  return EXPLORE_ORDER.map((ticker) => ({ ticker }));
}

export default async function InvestPage({ params, searchParams }: PageProps<"/invest/[ticker]">) {
  const { ticker } = await params;
  const sp = await searchParams;
  const mode = sp.mode === "money" ? "money" : sp.mode === "practice" ? "practice" : undefined;
  const amount = typeof sp.amount === "string" ? Number(sp.amount) : undefined;
  const validAmount = amount != null && Number.isFinite(amount) && amount > 0 && amount <= 100_000 ? Math.round(amount * 100) / 100 : undefined;
  return <InvestFlow ticker={ticker.toUpperCase()} initialMode={mode} initialAmount={validAmount} />;
}
