/**
 * Service boundaries. Components consume these through hooks; they never
 * import mock modules directly. Each interface has a mock/demo implementation
 * today and a documented backend requirement in
 * docs/CRESCO-BACKEND-INTEGRATION-HANDOFF.md.
 */
import type {
  ActionEvaluation,
  ActionType,
  AssetRule,
  BoundaryRequest,
  CurrentMandate,
  ExecutionResult,
  GuardianDecision,
  MarketAsset,
  Period,
  PricePoint,
  Session,
} from "@/domain/types";

export type Capabilities = {
  /** "none" → frontend runs fully on local demo state. */
  backend: "none" | "keys-v0.2-draft";
  marketData: "mock" | "mock-with-live-tsla";
  moneyMode: "demo";
  funding: "demo";
  auth: "demo";
  execution: "demo-not-executed";
};

export interface MarketDataService {
  listAssets(): Promise<MarketAsset[]>;
  getAsset(ticker: string): Promise<MarketAsset | null>;
  getSeries(ticker: string, period: Period): Promise<PricePoint[]>;
}

export type MoneyActionInput = {
  mandate: CurrentMandate;
  assetRule: AssetRule | null;
  asset: MarketAsset;
  type: ActionType;
  amount: number;
  balance: number;
  /** A guardian ALLOW_ONCE decision that covers exactly this action. */
  allowOnce?: BoundaryRequest | null;
};

export interface MoneyExecutionService {
  evaluate(input: MoneyActionInput): Promise<ActionEvaluation>;
  execute(input: MoneyActionInput): Promise<ExecutionResult>;
}

export interface PracticeExecutionService {
  buy(input: { asset: MarketAsset; amount: number; cash: number }): Promise<ExecutionResult>;
}

export interface BoundaryRequestService {
  create(input: {
    mandate: CurrentMandate;
    evaluation: ActionEvaluation;
    asset: string;
    type: ActionType;
    amount: number;
    reason: string;
  }): Promise<BoundaryRequest>;
  decide(input: {
    request: BoundaryRequest;
    decision: GuardianDecision;
    mandate: CurrentMandate;
    newLimits?: { maxActionNotional: number; maxPeriodNotional: number };
    note?: string;
  }): Promise<{ request: BoundaryRequest; mandate: CurrentMandate }>;
}

export interface MandateService {
  update(input: {
    mandate: CurrentMandate;
    changes: Partial<Pick<CurrentMandate, "maxActionNotional" | "maxPeriodNotional" | "allowedAssets" | "status">>;
  }): Promise<CurrentMandate>;
}

export interface FundingService {
  addMoney(input: { amount: number }): Promise<{ status: "DEMO_CREDITED"; amount: number }>;
}

export interface AuthService {
  signInDemo(role: Session["role"], displayName: string): Promise<Session>;
}
