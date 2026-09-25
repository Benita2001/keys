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
  SeriesResult,
  Session,
} from "@/domain/types";
import type { ExecutionNetwork } from "@/domain/network";

export type Capabilities = {
  /** "none" → frontend runs fully on local demo state. */
  backend: "none" | "keys-v0.2-frozen";
  marketData: "mock" | "mock-with-live-aapl";
  /** Practice executes on Solana Devnet through KEYS where a lane exists; otherwise the local sandbox. */
  practice: "devnet-runtime" | "sandbox-only";
  practiceFunding: "devnet-test" | "none";
  /** Money is Solana Mainnet only and never falls back to Devnet. */
  money: "mainnet-setup-required" | "mainnet-live";
  auth: "demo" | "backend-demo";
};

export interface MarketDataService {
  listAssets(): Promise<MarketAsset[]>;
  getAsset(ticker: string): Promise<MarketAsset | null>;
  getSeries(ticker: string, period: Period): Promise<SeriesResult>;
}

/** Input for a KEYS-governed action (Practice on Devnet today; Money on Mainnet later). */
export type KeyedActionInput = {
  mandate: CurrentMandate;
  assetRule: AssetRule | null;
  asset: MarketAsset;
  type: ActionType;
  amount: number;
  balance: number;
  /** A guardian ALLOW_ONCE decision that covers exactly this action. */
  allowOnce?: BoundaryRequest | null;
  /**
   * One key per user intent. Retries and re-checks reuse it so the runtime
   * can never execute the same intent twice.
   */
  idempotencyKey?: string;
  /** Re-check of an already-submitted intent (same key): skip the pre-evaluate. */
  recheck?: boolean;
};

/**
 * One adapter per execution network. The UI never talks to RPCs or providers.
 * practiceDevnetExecution → solana-devnet; moneyMainnetExecution → solana-mainnet.
 */
export interface CrescoExecutionAdapter {
  readonly network: ExecutionNetwork;
  readonly realValue: boolean;
  /** Whether this adapter can execute the asset right now. */
  supports(asset: MarketAsset): boolean;
  evaluate(input: KeyedActionInput): Promise<ActionEvaluation>;
  execute(input: KeyedActionInput): Promise<ExecutionResult>;
}

/** Local practice for assets without a Devnet lane. Simulated, never on-chain. */
export interface PracticeSandboxService {
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
  /** Practice capital on Solana Devnet (test credit, no payment, no real value). */
  addPracticeCapital(input: { amount: number }): Promise<{
    status: "DEVNET_TEST_CREDITED";
    amount: number;
    availableBalance?: number;
    realPaymentTaken: false;
  }>;
  /** Real USDC on Solana Mainnet. Rejects with MainnetSetupRequiredError until Money is live. */
  depositUsdc(input: { amount: number }): Promise<never>;
}

export interface AuthService {
  signInDemo(role: Session["role"], displayName: string): Promise<Session>;
}
