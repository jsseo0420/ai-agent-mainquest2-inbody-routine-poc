// 배포된 헬스도감의 /routine 흐름을 휴대폰 크기(375px)로 캡처해 docs/images/에 저장한다.
// "예시 결과지로 해 보기"로 실제 Gemini 호출(수치 추출 1회, 루틴 추천 1회)을 한다.
// 사용: node scripts/capture_demo.mjs [사이트 주소]
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "https://ai-agent-mainquest1-health.vercel.app";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const OUT = "docs/images";
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

const clickText = (text) =>
  page.evaluate((t) => [...document.querySelectorAll("button, a")].find((el) => el.textContent.includes(t))?.click(), text);

await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await page.screenshot({ path: `${OUT}/1_home.png` });

await page.goto(`${BASE}/routine`, { waitUntil: "networkidle0" });
await page.screenshot({ path: `${OUT}/2_upload.png` });

await clickText("예시 결과지로 해 보기");
await page.waitForFunction(() => document.querySelector("h2")?.textContent.includes("수치를 확인"), { timeout: 90_000 });
await page.screenshot({ path: `${OUT}/3_confirm.png`, fullPage: true });

await clickText("루틴 추천받기");
// 결과 화면에는 도감 상세로 가는 운동 링크가 생긴다. 실패하면 오류 안내가 뜬다.
await page.waitForFunction(() => document.querySelector('main a[href^="/equipment/"]') || document.querySelector("[role=alert]"), {
  timeout: 90_000,
});
await new Promise((r) => setTimeout(r, 500));
// 긴 화면 전체를 찍으면 화면 아래 고정된 하단 메뉴가 중간에 겹쳐 찍히므로 숨긴다.
await page.addStyleTag({ content: 'nav[aria-label="주요 메뉴"] { display: none !important; }' });
const alert = await page.evaluate(() => document.querySelector("[role=alert]")?.textContent);
if (alert) console.log("오류 안내:", alert);
await page.screenshot({ path: `${OUT}/4_routine.png`, fullPage: true });

await browser.close();
console.log(`캡처 완료 → ${OUT}/`);
