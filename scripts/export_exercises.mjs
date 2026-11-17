// 헬스도감 저장소의 기구 데이터(data/equipment.ts)를 PoC용 data/exercises.json으로 내보낸다.
// 사용: node --experimental-strip-types scripts/export_exercises.mjs <헬스도감 저장소 경로>
// 예:   node --experimental-strip-types scripts/export_exercises.mjs ../mainquest1-health
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const healthRepo = resolve(process.argv[2] ?? "../mainquest1-health");
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "exercises.json");

// Node의 TypeScript 실행은 확장자 없는 import를 못 찾으므로 임시 폴더에 복사해 경로만 고친다.
const tmp = mkdtempSync(join(tmpdir(), "exercises-"));
copyFileSync(join(healthRepo, "data", "muscles.ts"), join(tmp, "muscles.ts"));
writeFileSync(
  join(tmp, "equipment.ts"),
  readFileSync(join(healthRepo, "data", "equipment.ts"), "utf8").replace('from "./muscles"', 'from "./muscles.ts"'),
);

const { equipmentList } = await import(pathToFileURL(join(tmp, "equipment.ts")).href);
const { muscles, muscleGroups } = await import(pathToFileURL(join(tmp, "muscles.ts")).href);
const groupName = Object.fromEntries(muscleGroups.map((g) => [g.id, g.name]));

const data = {
  source: "ai-agent-mainquest1-health/data/equipment.ts",
  exported_at: new Date().toISOString().slice(0, 10),
  muscles: muscles.map((m) => ({ id: m.id, name: m.name, group: m.group, group_name: groupName[m.group] })),
  exercises: equipmentList.map((e) => ({
    id: e.id,
    name_ko: e.nameKo,
    name_en: e.nameEn,
    primary_muscles: e.primaryMuscles,
    secondary_muscles: e.secondaryMuscles,
    url: `https://ai-agent-mainquest1-health.vercel.app/equipment/${e.slug}`,
  })),
};
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(`운동 ${data.exercises.length}개, 부위 ${data.muscles.length}개 → data/exercises.json`);
