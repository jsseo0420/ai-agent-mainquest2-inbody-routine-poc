// 가상 체성분 수치를 만든다. 같은 seed면 항상 같은 값이 나온다.
// 실제 사람의 데이터가 아니며, 수치 사이의 관계(체중 = 제지방 + 체지방 등)만 그럴듯하게 맞춘다.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function makeProfile(seed) {
  const rng = mulberry32(seed);
  const between = (lo, hi) => lo + (hi - lo) * rng();
  const noise = (amp) => (rng() * 2 - 1) * amp;

  const sex = rng() < 0.5 ? "M" : "F";
  const age = Math.floor(between(20, 59));
  const height = round(sex === "M" ? between(165, 188) : between(152, 172));
  const h2 = (height / 100) ** 2;

  const weight = round(between(18.5, 31) * h2);
  const bmi = round(weight / h2);

  const pbf = round(
    clamp(sex === "M" ? bmi * 1.2 - 7 + noise(4) : bmi * 1.25 + 2 + noise(4), sex === "M" ? 7 : 15, 45),
  );
  const fatKg = round((weight * pbf) / 100);
  const ffm = round(weight - fatKg);
  const water = round(ffm * 0.732);
  const protein = round(ffm * 0.197);
  const mineral = round(ffm - water - protein, 2);
  const smm = round(ffm * (sex === "M" ? 0.56 : 0.53) + noise(0.8));
  const bmr = Math.round(370 + 21.6 * ffm);
  const whr = round(
    clamp((sex === "M" ? 0.8 + (pbf - 15) * 0.006 : 0.75 + (pbf - 23) * 0.006) + noise(0.02), 0.68, 1.1),
    2,
  );

  // 표준값: 결과지에 함께 찍히는 "헷갈리는 숫자"들
  const stdWeight = round((sex === "M" ? 22 : 21) * h2);
  const stdPbf = sex === "M" ? 15 : 23;
  const stdFat = round((stdWeight * stdPbf) / 100);
  const stdSmm = round(stdWeight * (sex === "M" ? 0.47 : 0.41));
  const score = Math.round(clamp(80 - Math.abs(pbf - stdPbf) * 1.2 + (smm - stdSmm) * 1.5, 52, 96));
  const fatCtrl = round(Math.min(0, stdFat - fatKg) || 0);
  const muscleCtrl = round(Math.max(0, stdSmm - smm) * 1.2);
  const weightCtrl = round(fatCtrl + muscleCtrl);

  return {
    seed,
    sex,
    age,
    height_cm: height,
    // 정답으로 쓰는 핵심 8개 필드
    fields: {
      weight_kg: weight,
      skeletal_muscle_kg: smm,
      body_fat_kg: fatKg,
      body_fat_pct: pbf,
      bmi,
      bmr_kcal: bmr,
      score,
      whr,
    },
    // 결과지에만 찍히는 나머지 수치
    extra: {
      water_l: water,
      protein_kg: protein,
      mineral_kg: mineral,
      ffm_kg: ffm,
      std_weight_kg: stdWeight,
      weight_ctrl_kg: weightCtrl,
      fat_ctrl_kg: fatCtrl,
      muscle_ctrl_kg: muscleCtrl,
      obesity_degree_pct: Math.round((weight / stdWeight) * 100),
      recommended_kcal: Math.round(bmr * 1.4),
    },
    ranges: {
      weight: [round(stdWeight * 0.85), round(stdWeight * 1.15)],
      smm: [round(stdSmm * 0.9), round(stdSmm * 1.1)],
      fat: [round(stdFat * 0.8), round(stdFat * 1.6)],
      water: [round(ffm * 0.732 * 0.9), round(ffm * 0.732 * 1.1)],
      protein: [round(ffm * 0.197 * 0.9), round(ffm * 0.197 * 1.1)],
      mineral: [round(ffm * 0.071 * 0.9, 2), round(ffm * 0.071 * 1.1, 2)],
      bmi: [18.5, 25.0],
      pbf: sex === "M" ? [10.0, 20.0] : [18.0, 28.0],
      whr: sex === "M" ? [0.8, 0.9] : [0.75, 0.85],
      bmr: [Math.round(370 + 21.6 * stdWeight * (1 - stdPbf / 100) * 0.95), Math.round(370 + 21.6 * stdWeight * (1 - stdPbf / 100) * 1.1)],
    },
    // 결과지 상단의 측정 정보
    meta: {
      id: `DEMO-${String(seed).padStart(4, "0")}`,
      measured_at: `2026.${String(1 + Math.floor(rng() * 11)).padStart(2, "0")}.${String(1 + Math.floor(rng() * 28)).padStart(2, "0")} ${String(7 + Math.floor(rng() * 13)).padStart(2, "0")}:${String(Math.floor(rng() * 60)).padStart(2, "0")}`,
    },
  };
}
