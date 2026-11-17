// 노트북이 저장한 results/*.json의 틀린 필드마다, 모델이 결과지의 어느 숫자를 가져왔는지 찾는다.
// 가상 결과지는 시드로 다시 만들 수 있으므로, 같은 시드로 결과지에 찍힌 모든 숫자(표준 범위 포함)를 복원해 대조한다.
// 사용: node scripts/analyze_failures.mjs   →  results/failure_sources.csv
import { readFileSync, writeFileSync } from "node:fs";
import { makeProfile } from "../generator/values.mjs";

const METHODS = ["A_easyocr_rules", "B_gemini_flash", "C_qwen25vl_3b_local"];
const { samples } = JSON.parse(readFileSync("data/ground_truth.json", "utf8"));
const truthByFile = Object.fromEntries(samples.map((s) => [s.file, s]));

// 결과지에 찍히는 숫자 전체: 핵심 필드, 나머지 수치, 표준 범위 양 끝, 신장·나이
function sheetNumbers(seed) {
  const p = makeProfile(seed);
  return [
    ...Object.entries(p.fields).map(([k, v]) => [`핵심필드:${k}`, v]),
    ...Object.entries(p.extra).map(([k, v]) => [`기타수치:${k}`, v]),
    ...Object.entries(p.ranges).flatMap(([k, [lo, hi]]) => [[`표준범위:${k}.하한`, lo], [`표준범위:${k}.상한`, hi]]),
    ["신장", p.height_cm],
    ["나이", p.age],
  ];
}

function classify(result, field) {
  if (result.error) return ["실행 오류", ""];
  const pred = result.pred[field];
  if (pred == null) return ["못 찾음", ""];
  const hits = sheetNumbers(truthByFile[result.file].seed).filter(([, v]) => Math.abs(v - pred) < 1e-6).map(([n]) => n);
  if (hits.length === 0) return ["출처 불명", ""];
  if (hits.some((h) => h.startsWith("핵심필드:"))) return ["다른 필드 값", hits.join(" | ")];
  return ["헷갈리는 숫자", hits.join(" | ")];
}

const rows = [["방식", "파일", "상태", "필드", "정답", "추출값", "유형", "일치한 결과지 숫자"]];
for (const method of METHODS) {
  const counts = {};
  for (const r of JSON.parse(readFileSync(`results/${method}.json`, "utf8"))) {
    for (const [field, ok] of Object.entries(r.correct)) {
      if (ok) continue;
      const [kind, source] = classify(r, field);
      counts[kind] = (counts[kind] ?? 0) + 1;
      rows.push([method, r.file, r.variant, field, truthByFile[r.file].fields[field], r.pred[field] ?? "", kind, source]);
    }
  }
  console.log(method.padEnd(22), JSON.stringify(counts));
}
const csv = rows.map((row) => row.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(",")).join("\n");
writeFileSync("results/failure_sources.csv", "﻿" + csv + "\n");
console.log(`틀린 필드 ${rows.length - 1}개 → results/failure_sources.csv`);
