// 가상 체성분 결과지 이미지와 정답 JSON을 만든다.
// 사용: npm run generate   (설치된 Edge/Chrome을 headless로 사용)
//       BROWSER_PATH 환경변수로 브라우저 경로를 바꿀 수 있다.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { makeProfile } from "./values.mjs";
import { renderSheet } from "./template.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "data", "samples");

// 촬영 상태별 구성 (총 15장). rotate는 도, scale은 저해상도 배율, quality는 JPEG 품질.
const PLAN = [
  { variant: "clean", count: 4 },
  { variant: "tilt", count: 3, rotate: [-6, 4, 8] },
  { variant: "blur", count: 3 },
  { variant: "shadow", count: 2, rotate: [2, -3] },
  { variant: "lowres", count: 2, scale: 0.45, quality: 45 },
  { variant: "combo", count: 1, rotate: [-5], scale: 0.7, quality: 60 },
];

const CANDIDATES = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error("Edge 또는 Chrome을 찾지 못했어요. BROWSER_PATH 환경변수로 경로를 알려주세요.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();

const samples = [];
let n = 0;
for (const spec of PLAN) {
  for (let i = 0; i < spec.count; i++) {
    n++;
    const seed = 1000 + n * 37;
    const profile = makeProfile(seed);
    const rotate = spec.rotate?.[i] ?? 0;
    const scale = spec.scale ?? 1;
    const file = `sample_${String(n).padStart(2, "0")}_${spec.variant}.jpg`;

    await page.setViewport({ width: 900, height: 1000, deviceScaleFactor: scale });
    await page.setContent(renderSheet(profile, { variant: spec.variant, rotate }), { waitUntil: "load" });
    await page.screenshot({ path: join(outDir, file), type: "jpeg", quality: spec.quality ?? 85 });

    samples.push({
      file,
      variant: spec.variant,
      rotate_deg: rotate,
      scale,
      seed,
      sex: profile.sex,
      age: profile.age,
      height_cm: profile.height_cm,
      fields: profile.fields,
      extra: profile.extra,
    });
    console.log(`${file}  ${JSON.stringify(profile.fields)}`);
  }
}

await browser.close();

const truth = {
  description: "가상 체성분 결과지의 정답 값. 실제 인물의 데이터가 아니다.",
  fields: {
    weight_kg: "체중 (kg)",
    skeletal_muscle_kg: "골격근량 (kg)",
    body_fat_kg: "체지방량 (kg)",
    body_fat_pct: "체지방률 (%)",
    bmi: "BMI (kg/m²)",
    bmr_kcal: "기초대사량 (kcal)",
    score: "체성분 점수 (점)",
    whr: "복부지방률",
  },
  samples,
};
writeFileSync(join(root, "data", "ground_truth.json"), JSON.stringify(truth, null, 2) + "\n");
console.log(`\n${samples.length}장 생성 → data/samples/, 정답 → data/ground_truth.json`);
