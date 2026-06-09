// Prototype mock data. Replace with real API calls (Lms.Api) after sign-off.

export type Bundle = {
  id: string;
  title: string;
  subjects: number;
  progress: number;
};

export type Topic = {
  id: string;
  title: string;
  hasVideo: boolean;
  mcqs: number;
  flashcards: number;
};

export const enrolledBundles: Bundle[] = [
  { id: "b1", title: "MDCAT Premium 2026", subjects: 4, progress: 62 },
  { id: "b2", title: "ECAT Crash Course", subjects: 3, progress: 28 },
];

export const continueTopics: Topic[] = [
  { id: "t1", title: "Cell Structure & Function", hasVideo: true, mcqs: 20, flashcards: 12 },
  { id: "t2", title: "Newton's Laws of Motion", hasVideo: true, mcqs: 25, flashcards: 8 },
  { id: "t3", title: "Periodic Table Trends", hasVideo: true, mcqs: 18, flashcards: 15 },
];

export const grades = [
  { subject: "Biology", score: 78, weak: "Genetics" },
  { subject: "Physics", score: 65, weak: "Thermodynamics" },
  { subject: "Chemistry", score: 84, weak: "Organic reactions" },
];

export const leaderboard = [
  { rank: 1, name: "Ayesha K.", points: 9820 },
  { rank: 2, name: "Bilal R.", points: 9410 },
  { rank: 3, name: "You", points: 9105 },
  { rank: 4, name: "Hamza T.", points: 8870 },
];

export const upcomingClasses = [
  { id: "lc1", title: "Biology Live: Genetics Q&A", time: "Today, 7:00 PM", provider: "Zoom" },
  { id: "lc2", title: "Physics Doubt Session", time: "Tomorrow, 5:00 PM", provider: "Zoom" },
];
