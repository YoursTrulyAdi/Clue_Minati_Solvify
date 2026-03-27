import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to run seed");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

// ── Routes ─────────────────────────────────────────────────────────────────
const routes = [
  { id: "A", stops: ["temple", "lab", "maggie", "park", "bbc"] },
  { id: "B", stops: ["park", "bbc", "lab", "temple", "maggie"] },
  { id: "C", stops: ["bbc", "maggie", "park", "lab", "temple"] },
  { id: "D", stops: ["lab", "maggie", "temple", "bbc", "park"] },
  { id: "E", stops: ["maggie", "temple", "bbc", "park", "lab"] }
];

// ── Question Pool (flat, shared by all teams) ──────────────────────────────
const questionPool: { question: string; answer: string }[] = [
  {
    question: "I store your past on websites, but I'm not your memory. I make browsing smoother, yet raise privacy concerns. What am I?",
    answer: "COOKIES",
  },
  {
    question: "A signal was intercepted:\n8 – 5 – 12 – 12 – 15\nDecode the hidden word using A=1, B=2...",
    answer: "HELLO",
  },
  {
    question: "I am a set of rules that determines how data is transmitted across a network so everyone speaks the same language. What am I?",
    answer: "PROTOCOL",
  },
  {
    question: "Find the output:\nC\nint x = 2;\nfor(int i=0;i<3;i++){\n    x = x * x;\n}\nprintf(\"%d\", x);",
    answer: "256",
  },
  {
    // Fixed: XLWV = CODE
    question: "Encrypted message (reverse alphabet: A↔Z):\nXLWV\nDecode the word.",
    answer: "CODE",
  },
  {
    question: "I translate human-readable code into machine language, but I don't execute it line by line. What am I?",
    answer: "COMPILER",
  },
  {
    question: "Binary signal received:\n01001000 01001001\nDecode the word (ASCII).",
    answer: "HI",
  },
  {
    question: "I decide which process runs next, but I never execute them myself. What am I?",
    answer: "SCHEDULER",
  },
  {
    question: "Find the output:\nC\nint a = 5;\nint b = a++ + ++a;\nprintf(\"%d\", b);",
    answer: "12",
  },
  {
    question: "A scrambled keyword:\nR E V R E S\nRearrange to find the CS concept.",
    answer: "SERVER",
  },
  {
    question: "I allow only one thread at a time into a critical section. What am I?",
    answer: "MUTEX",
  },
  {
    question: "Numbers hide a protocol:\n20 – 3 – 16\nDecode using A=1…",
    answer: "TCP",
  },
  {
    question: "I repeat tasks endlessly until a condition stops me — sometimes causing problems. What am I?",
    answer: "LOOP",
  },
  {
    question: "Find the output:\nC\nint x = 3;\nfor(int i=1;i<=3;i++){\n    x += i;\n}\nprintf(\"%d\", x);",
    answer: "9",
  },
  {
    // Fixed: ZMHdVI = ANSWER
    question: "Mirror cipher:\nZMHdVI\nDecode using reverse alphabet.",
    answer: "ANSWER",
  },
  {
    question: "I store data in key-value pairs and provide fast access. What am I?",
    answer: "HASH",
  },
  {
    question: "A clue was found:\n3 – 15 – 4 – 5\nDecode it.",
    answer: "CODE",
  },
  {
    question: "I call myself repeatedly until a base condition stops me. What am I?",
    answer: "RECURSION",
  },
  {
    question: "Find the output:\nC\nint x = 1;\nfor(int i=1;i<=3;i++){\n    x *= (i + 1);\n}\nprintf(\"%d\", x);",
    answer: "24",
  },
  {
    question: "Scrambled:\nT A D A\nRearrange to find a common CS term.",
    answer: "DATA",
  },
  {
    question: "I ensure data reaches reliably, even if packets must be resent. What am I?",
    answer: "TCP",
  },
  {
    question: "Binary:\n01000011 01010011\nDecode (ASCII).",
    answer: "CS",
  },
  {
    question: "I protect systems by filtering incoming and outgoing traffic. What am I?",
    answer: "FIREWALL",
  },
  {
    question: "Find the output:\nC\nint x = 0;\nfor(int i=0;i<5;i++){\n    x += i;\n}\nprintf(\"%d\", x);",
    answer: "10",
  },
  {
    question: "A message was shifted one step backward in the alphabet:\nEBUB\nDecode the word.",
    answer: "DATA",
  },
];

// ── Target Clues (reveal location) ────────────────────────────────────────
const targetClues = [
  {
    clueText: "The name which echoes through Nepal\nYet somehow connected to you\nReverse his name, and you shall find the answer\nlength:3",
    mappedLocation: "lab",
  },
  {
    clueText: "Target clue resource text: https://ibb.co/5x8M7RQw",
    mappedLocation: "maggie",
  },
  {
    clueText: "Target clue resource text: https://ibb.co/DgDcJTJg",
    mappedLocation: "bbc",
  },
  {
    clueText: "Target clue resource text: https://files.catbox.moe/5w3vi6.mp4",
    mappedLocation: "park",
  },
  {
    clueText: "Target clue resource text: https://ibb.co/JRvJ59kP",
    mappedLocation: "temple",
  },
];

// ── Seed ───────────────────────────────────────────────────────────────────
async function main() {
  // Routes
  console.log("\nSeeding routes...");
  for (const route of routes) {
    await prisma.route.upsert({
      where: { id: route.id },
      update: { stops: route.stops },
      create: route,
    });
    console.log(`  ✔ Route ${route.id}: ${route.stops.join(" → ")}`);
  }

  // Question Pool
  console.log("\nSeeding question pool...");
  // Clear existing questions and re-insert to keep IDs clean
  await prisma.question.deleteMany({});
  for (const q of questionPool) {
    await prisma.question.create({ data: q });
  }
  console.log(`  ✔ ${questionPool.length} questions in pool`);

  // Target Clues
  console.log("\nSeeding target clues...");
  await prisma.targetClue.deleteMany({});
  for (const clue of targetClues) {
    await prisma.targetClue.create({ data: clue });
  }
  console.log(`  ✔ ${targetClues.length} target clues`);

  console.log("\n✅ Seed complete.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
