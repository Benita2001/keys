/**
 * Learning content. Lessons are data-driven; the lesson player renders any
 * lesson from this shape. Educational claims that matter to investing decisions
 * are paired with primary/official sources and a visible verification date.
 *
 * Learning has authorityEffect = NONE. It can build understanding and Practice;
 * it never changes a Mandate.
 */
import type { LearningSource, Lesson, LearningModule } from "@/domain/types";

const VERIFIED_AT = "2026-09-25";

export const LEARNING_SOURCES = {
  studentSaving: {
    organization: "Investor.gov · U.S. SEC",
    title: "Saving and Investing for Students",
    url: "https://www.investor.gov/additional-resources/general-resources/publications-research/publications/saving-investing-students",
    verifiedAt: VERIFIED_AT,
  },
  stocks: {
    organization: "Investor.gov · U.S. SEC",
    title: "Stocks — FAQs",
    url: "https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks",
    verifiedAt: VERIFIED_AT,
  },
  investingBasics: {
    organization: "Investor.gov · U.S. SEC",
    title: "Introduction to Investing",
    url: "https://www.investor.gov/introduction-investing",
    verifiedAt: VERIFIED_AT,
  },
  risk: {
    organization: "Investor.gov · U.S. SEC",
    title: "What is Risk?",
    url: "https://www.investor.gov/introduction-investing/investing-basics/what-risk",
    verifiedAt: VERIFIED_AT,
  },
  diversification: {
    organization: "Investor.gov · U.S. SEC",
    title: "Diversify Your Investments",
    url: "https://www.investor.gov/introduction-investing/investing-basics/save-and-invest/diversify-your-investments",
    verifiedAt: VERIFIED_AT,
  },
  tokenizedSecurities: {
    organization: "U.S. Securities and Exchange Commission",
    title: "Statement on Tokenized Securities",
    url: "https://www.sec.gov/newsroom/speeches-statements/corp-fin-statement-tokenized-securities-012826-statement-tokenized-securities",
    verifiedAt: VERIFIED_AT,
  },
} satisfies Record<string, LearningSource>;

export const MODULES: LearningModule[] = [
  { id: "money-basics", title: "Money Basics", subtitle: "Goals, saving and spending", xp: 50, icon: "coins", tone: "green", lessonIds: ["needs-and-wants", "why-save"] },
  { id: "what-is-a-company", title: "What Is a Company?", subtitle: "How businesses create value", xp: 50, icon: "building", tone: "green", lessonIds: ["what-is-a-company"] },
  { id: "what-is-a-stock", title: "Stocks & What You Own", subtitle: "Shares, rights and tokenized representations", xp: 75, icon: "pie", tone: "blue", lessonIds: ["what-is-a-stock", "why-companies-sell-shares", "stock-vs-tokenized-security"] },
  { id: "why-prices-move", title: "Why Prices Move", subtitle: "Markets react to new information", xp: 50, icon: "trend", tone: "lavender", lessonIds: ["why-prices-move"] },
  { id: "risk-and-reward", title: "Risk & Reward", subtitle: "Loss, uncertainty and time horizon", xp: 50, icon: "scale", tone: "orange", lessonIds: ["risk-and-reward"] },
  { id: "build-your-portfolio", title: "Build Your Portfolio", subtitle: "Diversification without false guarantees", xp: 50, icon: "layers", tone: "aqua", lessonIds: ["build-your-portfolio"] },
];

export const LESSONS: Lesson[] = [
  {
    id: "needs-and-wants", moduleId: "money-basics", title: "Needs and Wants", minutes: 3, xp: 25,
    steps: [
      { kind: "concept", title: "Needs and wants", illustration: "piggy", body: "Needs are things you must have, like food and a place to live. Wants are things that are nice to have, like a new game." },
      { kind: "quiz", title: "Needs and wants", illustration: "piggy", prompt: "You have $20 and your shoes have a hole in them.", question: "Which one is a need?", options: [{ id: "a", label: "New shoes" }, { id: "b", label: "A game skin" }, { id: "c", label: "Movie tickets" }], correctId: "a", correctExplanation: "Right. Shoes you can wear to school are a need. The others are wants.", retryHint: "Think about what you can't really do without." },
    ],
  },
  {
    id: "why-save", moduleId: "money-basics", title: "Why Save?", minutes: 4, xp: 25,
    steps: [{
      kind: "concept", title: "Give future-you options", illustration: "piggy",
      body: "Saving means setting money aside for a goal or for something unexpected. The time when you need the money matters when you decide whether to keep it in savings or consider investing.",
      realityCheck: "Investor.gov's student material starts with goals and time horizon: decide what the money is for and when you will need it before choosing how to save or invest.",
      source: LEARNING_SOURCES.studentSaving,
      apply: { label: "See your goal", href: "/profile", body: "Connect the lesson to the goal you chose in Cresco. The lesson informs the decision; it does not unlock more Money Mode authority." },
    }],
  },
  {
    id: "what-is-a-company", moduleId: "what-is-a-company", title: "What Is a Company?", minutes: 4, xp: 50,
    steps: [
      { kind: "concept", title: "What is a company?", illustration: "storefront", body: "A company organizes people, money and other resources to make products or provide services. Revenue is money coming in; profit is what remains after expenses when revenue is higher than costs." },
      { kind: "quiz", title: "What is a company?", illustration: "storefront", prompt: "A company sells more than it spends this year.", question: "What does it have left over?", options: [{ id: "a", label: "A loss" }, { id: "b", label: "A profit" }, { id: "c", label: "A loan" }], correctId: "b", correctExplanation: "Yes. Money left after paying the company's costs is profit.", retryHint: "When revenue is higher than expenses, what is left?" },
    ],
  },
  {
    id: "what-is-a-stock", moduleId: "what-is-a-stock", title: "What Is a Stock?", minutes: 6, xp: 50,
    steps: [
      {
        kind: "concept", title: "A stock is ownership", illustration: "storefront",
        body: "A share of stock represents an ownership position in a company. Depending on the class of stock, ownership can include economic rights and sometimes voting rights.",
        realityCheck: "Investor.gov defines stocks as securities that give stockholders a share of ownership in a company. Stocks can rise, fall, pay dividends, or lose value.",
        source: LEARNING_SOURCES.stocks,
      },
      { kind: "concept", title: "Think in pieces", illustration: "pizza", caption: "1/100", body: "Imagine a pizza shop divided into 100 ownership pieces. Owning one piece would mean owning 1% of that simplified example. Real public companies usually have far more shares." },
      { kind: "quiz", title: "What is a stock?", illustration: "pizza", prompt: "Imagine your favorite pizza shop was divided into 100 ownership pieces.", question: "If you owned 1 piece, what would that make you?", options: [{ id: "customer", label: "Only a customer" }, { id: "owner", label: "A part owner" }, { id: "employee", label: "Automatically an employee" }], correctId: "owner", correctExplanation: "Exactly. A conventional share represents an ownership interest in the company.", retryHint: "Customers buy from the business. Employees work for it. What does a share represent?" },
      {
        kind: "concept", title: "Price and ownership are different facts", illustration: "shares",
        body: "The market price tells you what buyers and sellers are agreeing to trade at now. It does not tell you, by itself, whether a company is a good investment for your goal.",
        source: LEARNING_SOURCES.stocks,
        apply: { label: "Inspect Apple", href: "/explore/AAPL", body: "Open a real company profile. Separate three questions: What does the company do? What representation is shown? What is the current price evidence?" },
      },
    ],
  },
  {
    id: "why-companies-sell-shares", moduleId: "what-is-a-stock", title: "Why Companies Sell Shares", minutes: 4, xp: 50,
    steps: [
      { kind: "concept", title: "Companies can raise capital", illustration: "storefront", body: "A company can issue stock to raise money. That capital can support things like new products, expansion, facilities or paying down debt.", realityCheck: "Investor.gov lists product launches, expansion, facilities and debt repayment among reasons companies may issue stock.", source: LEARNING_SOURCES.stocks },
      { kind: "concept", title: "Ownership shares the outcome", illustration: "shares", body: "People who buy conventional shares take part in the company's future outcomes. If the business struggles, shareholders can lose money; ownership does not guarantee a profit.", source: LEARNING_SOURCES.stocks },
      { kind: "quiz", title: "Why companies sell shares", illustration: "storefront", prompt: "The pizza shop wants to open a second location.", question: "Why might it issue shares?", options: [{ id: "raise", label: "To raise money for growth" }, { id: "free", label: "To make investing risk-free" }, { id: "close", label: "Because shares guarantee profit" }], correctId: "raise", correctExplanation: "Right. Issuing shares is one way a company can raise capital.", retryHint: "Opening a new location costs money. Which answer describes raising capital rather than promising an outcome?" },
    ],
  },
  {
    id: "stock-vs-tokenized-security", moduleId: "what-is-a-stock", title: "Stock vs. Tokenized Security", minutes: 6, xp: 75,
    steps: [
      {
        kind: "concept", title: "A token can represent different legal structures", illustration: "shares",
        body: "Putting a security on a crypto network changes how it is represented or recorded. It does not make every token linked to a company legally identical to that company's conventional shares.",
        realityCheck: "In January 2026, SEC staff described multiple tokenized-security models and emphasized that structures can differ in the rights they give holders, including issuer-sponsored and third-party models.",
        source: LEARNING_SOURCES.tokenizedSecurities,
      },
      {
        kind: "concept", title: "Know what you actually own", illustration: "scale",
        body: "Before treating a token as 'the stock,' check who issued it, what legal or economic rights it represents, whether redemption exists, and whether you are eligible to hold or use it.",
        realityCheck: "KEYS keeps four facts separate: the company, the token representation, holder eligibility, and the authority in your family Key. One does not automatically prove the others.",
        source: LEARNING_SOURCES.tokenizedSecurities,
        apply: { label: "Compare representations", href: "/explore", body: "Use Explore to compare conventional company identity with tokenized representation labels. Live sponsor representations stay Learn/Practice unless execution eligibility is actually proven." },
      },
      { kind: "quiz", title: "Same company, same rights?", illustration: "shares", prompt: "Two tokens both reference the same private company, but they were created under different structures.", question: "Can you assume they give holders exactly the same rights?", options: [{ id: "yes", label: "Yes — same company means same rights" }, { id: "no", label: "No — check each token's structure and rights" }, { id: "price", label: "Yes — if their prices are similar" }], correctId: "no", correctExplanation: "Correct. The underlying company name is not enough. The representation and holder rights must be checked.", retryHint: "Think about what the SEC says can vary between tokenized-security models." },
    ],
  },
  {
    id: "why-prices-move", moduleId: "why-prices-move", title: "Why Prices Move", minutes: 6, xp: 50,
    steps: [
      {
        kind: "concept", title: "Markets react to information", illustration: "chart",
        body: "A stock price is formed through trades between buyers and sellers. Their willingness to buy or sell can change with company results, product demand, management, economic conditions, costs, news and expectations.",
        realityCheck: "Investor.gov notes that stock prices can be affected by company management, product strength, consumer demand, economic changes, labor and supply-chain costs, and changing investor preferences.",
        source: LEARNING_SOURCES.investingBasics,
        apply: { label: "Check a market snapshot", href: "/explore/AAPL", body: "Open Apple and look for the data label. If Pyth evidence is fresh it is marked live; otherwise Cresco keeps sample data clearly labeled instead of pretending it is live." },
      },
      { kind: "quiz", title: "Price is not a promise", illustration: "chart", prompt: "A company reports strong results and many investors become more willing to buy its shares.", question: "What can you conclude with certainty?", options: [{ id: "rise", label: "The price must rise tomorrow" }, { id: "guarantee", label: "The stock is now guaranteed to be profitable" }, { id: "none", label: "Neither — markets can still move differently" }], correctId: "none", correctExplanation: "Right. New information can influence buyers and sellers, but it does not guarantee the next price move.", retryHint: "Markets reflect many people, expectations and new information. Is tomorrow's price ever guaranteed?" },
    ],
  },
  {
    id: "risk-and-reward", moduleId: "risk-and-reward", title: "Risk & Reward", minutes: 6, xp: 50,
    steps: [
      {
        kind: "concept", title: "Risk means uncertainty and possible loss", illustration: "scale",
        body: "Investing can produce gains, but you can also lose some or all of the money invested. Higher potential return usually comes with greater uncertainty or risk.",
        realityCheck: "Investor.gov defines investment risk around uncertainty and potential financial loss. No lesson, streak or recent gain removes that risk.",
        source: LEARNING_SOURCES.risk,
        apply: { label: "Try it in Practice", href: "/explore", body: "Choose a company in Practice and test a small decision without real capital. Notice how changing the amount changes exposure, not your authority." },
      },
      { kind: "quiz", title: "Risk check", illustration: "scale", prompt: "A stock has gone up quickly for several weeks.", question: "Does that remove the chance of losing money next?", options: [{ id: "yes", label: "Yes — the trend proves it is safe" }, { id: "no", label: "No — gains do not remove investment risk" }, { id: "xp", label: "Only if I finished the lesson" }], correctId: "no", correctExplanation: "Correct. Past gains and lesson completion do not make an investment risk-free.", retryHint: "Risk is about what can happen next, not a reward for past performance or learning." },
    ],
  },
  {
    id: "build-your-portfolio", moduleId: "build-your-portfolio", title: "Build Your Portfolio", minutes: 7, xp: 50,
    steps: [
      {
        kind: "concept", title: "Diversification spreads risk", illustration: "basket",
        body: "Diversification means spreading money across different investments instead of depending on one company, sector or asset type.",
        realityCheck: "Investor.gov says diversification can reduce portfolio risk, but it cannot guarantee that you will avoid losses when markets fall.",
        source: LEARNING_SOURCES.diversification,
        apply: { label: "Inspect your Practice portfolio", href: "/portfolio", body: "Look at the weights of your holdings. Ask whether one company or one sector dominates instead of treating 'more tickers' as automatic diversification." },
      },
      { kind: "quiz", title: "Diversified or just more tickers?", illustration: "basket", prompt: "A portfolio owns four different companies, but all four depend on the same narrow technology trend.", question: "Is 'four stocks' automatically well diversified?", options: [{ id: "yes", label: "Yes — four is always diversified" }, { id: "no", label: "No — concentration can still exist" }, { id: "profit", label: "Only if all four are profitable" }], correctId: "no", correctExplanation: "Exactly. Diversification is about spreading risk, not just counting tickers.", retryHint: "Ask whether the holdings could all be hurt by the same kind of event." },
    ],
  },
];

export const MISSION = { id: "mission-why-companies-sell-shares", title: "Today's Mission", body: "Learn why companies sell shares", lessonId: "why-companies-sell-shares", xp: 50 };

export function lessonById(id: string): Lesson | undefined { return LESSONS.find((l) => l.id === id); }
export function moduleById(id: string): LearningModule | undefined { return MODULES.find((m) => m.id === id); }
