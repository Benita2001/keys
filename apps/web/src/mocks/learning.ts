/**
 * Learning content. Lessons are data-driven; the lesson player renders any
 * lesson from this shape. Content is original educational copy, not mock data.
 */
import type { Lesson, LearningModule } from "@/domain/types";

export const MODULES: LearningModule[] = [
  {
    id: "money-basics",
    title: "Money Basics",
    subtitle: "Learn how money works",
    xp: 50,
    icon: "coins",
    tone: "green",
    lessonIds: ["needs-and-wants", "why-save"],
  },
  {
    id: "what-is-a-company",
    title: "What Is a Company?",
    subtitle: "Explore what companies do",
    xp: 50,
    icon: "building",
    tone: "green",
    lessonIds: ["what-is-a-company"],
  },
  {
    id: "what-is-a-stock",
    title: "What Is a Stock?",
    subtitle: "Understand ownership",
    xp: 50,
    icon: "pie",
    tone: "blue",
    lessonIds: ["what-is-a-stock", "why-companies-sell-shares"],
  },
  {
    id: "why-prices-move",
    title: "Why Prices Move",
    subtitle: "Learn what affects stock prices",
    xp: 50,
    icon: "trend",
    tone: "lavender",
    lessonIds: ["why-prices-move"],
  },
  {
    id: "risk-and-reward",
    title: "Risk & Reward",
    subtitle: "Understand risk and return",
    xp: 50,
    icon: "scale",
    tone: "orange",
    lessonIds: ["risk-and-reward"],
  },
  {
    id: "build-your-portfolio",
    title: "Build Your Portfolio",
    subtitle: "Put it all together",
    xp: 50,
    icon: "layers",
    tone: "aqua",
    lessonIds: ["build-your-portfolio"],
  },
];

export const LESSONS: Lesson[] = [
  {
    id: "needs-and-wants",
    moduleId: "money-basics",
    title: "Needs and Wants",
    minutes: 3,
    xp: 25,
    steps: [
      {
        kind: "concept",
        title: "Needs and wants",
        illustration: "piggy",
        body: "Needs are things you must have, like food and a place to live. Wants are things that are nice to have, like a new game.",
      },
      {
        kind: "quiz",
        title: "Needs and wants",
        illustration: "piggy",
        prompt: "You have $20 and your shoes have a hole in them.",
        question: "Which one is a need?",
        options: [
          { id: "a", label: "New shoes" },
          { id: "b", label: "A game skin" },
          { id: "c", label: "Movie tickets" },
        ],
        correctId: "a",
        correctExplanation: "Right. Shoes you can wear to school are a need. The others are wants.",
        retryHint: "Think about what you can't really do without.",
      },
    ],
  },
  {
    id: "why-save",
    moduleId: "money-basics",
    title: "Why Save?",
    minutes: 3,
    xp: 25,
    steps: [
      {
        kind: "concept",
        title: "Why save?",
        illustration: "piggy",
        body: "Saving means keeping some money for later. A little saved every week can add up to something big, like a new bike.",
      },
    ],
  },
  {
    id: "what-is-a-company",
    moduleId: "what-is-a-company",
    title: "What Is a Company?",
    minutes: 4,
    xp: 50,
    steps: [
      {
        kind: "concept",
        title: "What is a company?",
        illustration: "storefront",
        body: "A company is a group of people working together to sell something people want, like pizza, phones or shows.",
      },
      {
        kind: "quiz",
        title: "What is a company?",
        illustration: "storefront",
        prompt: "A company sells more than it spends this year.",
        question: "What does it have left over?",
        options: [
          { id: "a", label: "A loss" },
          { id: "b", label: "A profit" },
          { id: "c", label: "A loan" },
        ],
        correctId: "b",
        correctExplanation: "Yes. Money left after paying all the costs is called profit.",
        retryHint: "When you earn more than you spend, you have some left over.",
      },
    ],
  },
  {
    id: "what-is-a-stock",
    moduleId: "what-is-a-stock",
    title: "What Is a Stock?",
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: "concept",
        title: "What is a stock?",
        illustration: "storefront",
        body: "Every company has owners. Some companies have just one. Big companies can have millions.",
      },
      {
        kind: "concept",
        title: "What is a stock?",
        illustration: "pizza",
        caption: "1/100",
        body: "Imagine your favorite pizza shop was divided into 100 tiny pieces. Each piece is called a share.",
      },
      {
        kind: "quiz",
        title: "What is a stock?",
        illustration: "pizza",
        prompt: "Imagine your favorite pizza shop was divided into 100 tiny pieces...",
        question: "If you owned 1 piece, what would that make you?",
        options: [
          { id: "customer", label: "Customer" },
          { id: "owner", label: "Part Owner" },
          { id: "employee", label: "Employee" },
        ],
        correctId: "owner",
        correctExplanation: "Exactly. Owning a share means you own a small part of the business.",
        retryHint: "Customers buy pizza and employees make it. What do you call someone who owns a piece of the shop?",
      },
      {
        kind: "concept",
        title: "What is a stock?",
        illustration: "shares",
        body: "People buy and sell shares on a stock market. A stock is simply shares of one company.",
      },
      {
        kind: "quiz",
        title: "What is a stock?",
        illustration: "chart",
        prompt: "The pizza shop opens a second location and earns more money.",
        question: "What could happen to the value of your piece?",
        options: [
          { id: "up", label: "It could go up" },
          { id: "zero", label: "It becomes $0" },
          { id: "same", label: "It can never change" },
        ],
        correctId: "up",
        correctExplanation: "Yes. When a business does well, its shares can become worth more. They can also fall when it struggles.",
        retryHint: "If the business is worth more, what about each piece of it?",
      },
    ],
  },
  {
    id: "why-companies-sell-shares",
    moduleId: "what-is-a-stock",
    title: "Why Companies Sell Shares",
    minutes: 4,
    xp: 50,
    steps: [
      {
        kind: "concept",
        title: "Why companies sell shares",
        illustration: "storefront",
        body: "Growing costs money. A company can sell shares to raise money for new stores, products or ideas.",
      },
      {
        kind: "concept",
        title: "Why companies sell shares",
        illustration: "shares",
        body: "In return, the people who buy shares become part owners and share in the company's future, good or bad.",
      },
      {
        kind: "quiz",
        title: "Why companies sell shares",
        illustration: "storefront",
        prompt: "The pizza shop wants to open a second location.",
        question: "Why might it sell shares?",
        options: [
          { id: "raise", label: "To raise money to grow" },
          { id: "free", label: "To give pizza away" },
          { id: "close", label: "To close the shop" },
        ],
        correctId: "raise",
        correctExplanation: "Right. Selling shares helps a company raise money to grow.",
        retryHint: "Opening a new location costs money. Where could that money come from?",
      },
    ],
  },
  {
    id: "why-prices-move",
    moduleId: "why-prices-move",
    title: "Why Prices Move",
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: "concept",
        title: "Why prices move",
        illustration: "chart",
        body: "A share's price moves when more people want to buy it than sell it, or the other way around.",
      },
      {
        kind: "quiz",
        title: "Why prices move",
        illustration: "chart",
        prompt: "Lots of people suddenly want to buy shares of a company.",
        question: "What usually happens to its price?",
        options: [
          { id: "up", label: "It goes up" },
          { id: "down", label: "It goes down" },
          { id: "stop", label: "Trading stops" },
        ],
        correctId: "up",
        correctExplanation: "Yes. More buyers than sellers tends to push the price up.",
        retryHint: "Think about what happens to the price of a popular sneaker.",
      },
    ],
  },
  {
    id: "risk-and-reward",
    moduleId: "risk-and-reward",
    title: "Risk & Reward",
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: "concept",
        title: "Risk and reward",
        illustration: "scale",
        body: "Investments that might grow a lot can also fall a lot. That trade-off is called risk and reward.",
      },
    ],
  },
  {
    id: "build-your-portfolio",
    moduleId: "build-your-portfolio",
    title: "Build Your Portfolio",
    minutes: 6,
    xp: 50,
    steps: [
      {
        kind: "concept",
        title: "Build your portfolio",
        illustration: "basket",
        body: "A portfolio is everything you own. Spreading money across different companies means one bad day hurts less.",
      },
    ],
  },
];

export const MISSION = {
  id: "mission-why-companies-sell-shares",
  title: "Today's Mission",
  body: "Learn why companies sell shares",
  lessonId: "why-companies-sell-shares",
  xp: 50,
};

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function moduleById(id: string): LearningModule | undefined {
  return MODULES.find((m) => m.id === id);
}
