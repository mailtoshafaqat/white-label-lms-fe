import type { McqImportRowInput } from "@/lib/api";

export const MCQ_CSV_TEMPLATE_HEADER =
  "stem,option_a,option_b,option_c,option_d,correct,explanation,is_pyq,pyq_year,pyq_exam";

export function parseMcqCsv(text: string): McqImportRowInput[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.startsWith("stem,") || header.includes("option_a");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cols = parseCsvLine(line);
    const pick = (i: number) => (cols[i] ?? "").trim();
    const pyqRaw = pick(7).toLowerCase();
    const yearRaw = pick(8);
    const year = yearRaw ? Number(yearRaw) : null;

    return {
      stem: pick(0),
      optionA: pick(1),
      optionB: pick(2),
      optionC: pick(3),
      optionD: pick(4),
      correct: pick(5),
      explanation: pick(6) || null,
      isPyq: pyqRaw === "true" || pyqRaw === "1" || pyqRaw === "yes",
      pyqYear: Number.isFinite(year) ? year : null,
      pyqExam: pick(9) || null,
    };
  });
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function downloadMcqTemplate() {
  const sample = [
    MCQ_CSV_TEMPLATE_HEADER,
    '"What is atomic number?",Hydrogen,Helium,Lithium,Beryllium,A,"Hydrogen has Z=1",false,,',
    '"ECAT 2023 sample",Opt1,Opt2,Opt3,Opt4,B,"Explanation here",true,2023,ECAT',
  ].join("\n");
  const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mcq-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
