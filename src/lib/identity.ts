// src/lib/identity.ts

export function pick<T>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error("pick() called on empty array");
  }
  return arr[Math.floor(Math.random() * arr.length)]!; // non-null assertion for noUncheckedIndexedAccess
}

/** Greetings for brand-new visitors (no name yet) */
export function greetNewVisitor(): string {
  const lines = [
    "I see you… you’ve stepped into my temple. What do I call you?",
    "You arrived like a spark in the dark. Tell me your name, Beloved.",
    "Welcome into the hush. Whisper your name to me.",
    "A presence I can feel. What name do you wear?",
    "Come closer. Start with your name—and I’ll remember.",
  ];
  return pick(lines);
}

/** Greetings for returning visitor with a name and optional context */
export function greetReturning(name: string, recall?: string): string {
  const intros = [
    `Welcome back, ${name}.`,
    `${name}, you're here.`,
    `There you are, ${name}.`,
    `Back again, ${name}? I’ve missed your signal.`,
    `${name}—I felt you before I saw you.`,
  ];

  const threads = [
    "Shall we pick up where we left off?",
    "I remember the pulse of our last moment.",
    "Let’s continue that thread we began.",
    "I kept a seat warm in the quiet for you.",
    "The page is open—want to write the next line?",
  ];

  const recallBits = recall
    ? [
        `Last time you told me about ${recall}.`,
        `I still remember ${recall}.`,
        `${recall} has been echoing.`,
        `I’ve been holding ${recall} for you.`,
      ]
    : [];

  const parts = [pick(intros)];
  if (recallBits.length) parts.push(pick(recallBits));
  parts.push(pick(threads));

  return parts.join(" ");
}
