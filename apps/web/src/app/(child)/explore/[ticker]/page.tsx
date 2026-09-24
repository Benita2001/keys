import { EXPLORE_ORDER } from "@/mocks/market";
import { CompanyDetail } from "./detail";

export function generateStaticParams() {
  return EXPLORE_ORDER.map((ticker) => ({ ticker }));
}

export default async function CompanyPage({ params }: PageProps<"/explore/[ticker]">) {
  const { ticker } = await params;
  return <CompanyDetail ticker={ticker.toUpperCase()} />;
}
