// 가상 체성분 결과지 HTML. 특정 브랜드 양식을 베끼지 않은 자체 양식이며,
// 실제 결과지처럼 측정값과 표준 범위·눈금 숫자가 함께 찍혀 있다.

const fmt = (v, d = 1) => Number(v).toFixed(d);
const comma = (v) => Number(v).toLocaleString("en-US");
const SCALE = [55, 70, 85, 100, 115, 130, 145, 160, 175, 190, 205];

// 표준값 대비 % 위치에 막대를 그린다 (55%~205% 눈금)
function bar(label, unit, value, standard, digits = 1) {
  const pct = Math.max(55, Math.min(205, (value / standard) * 100));
  const width = ((pct - 55) / 150) * 100;
  return `
    <div class="bar-row">
      <div class="bar-label">${label}<small>(${unit})</small></div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${width}%"></div>
        <span class="bar-value" style="left:calc(${width}% + 6px)">${fmt(value, digits)}</span>
      </div>
    </div>`;
}

function scaleRow(labels = SCALE) {
  return `<div class="bar-row scale"><div class="bar-label"></div><div class="bar-track ticks">${labels
    .map((s, i) => `<span style="left:${(i / (labels.length - 1)) * 100}%">${s}</span>`)
    .join("")}</div></div>`;
}

export function renderSheet(p, { variant = "clean", rotate = 0 } = {}) {
  const f = p.fields;
  const x = p.extra;
  const r = p.ranges;
  const stdSmm = (r.smm[0] + r.smm[1]) / 2;
  const stdFat = r.fat[0] / 0.8;
  const stdW = x.std_weight_kg;
  const sexKo = p.sex === "M" ? "남성" : "여성";

  const sheet = `
  <div class="sheet">
    <header>
      <div>
        <div class="title">체성분 분석 결과지</div>
        <div class="subtitle">Body Composition Report · 가상 데이터 (실제 측정 결과 아님)</div>
      </div>
      <table class="info">
        <tr><th>ID</th><td>${p.meta.id}</td><th>신장</th><td>${fmt(p.height_cm)}cm</td></tr>
        <tr><th>나이</th><td>${p.age}세</td><th>성별</th><td>${sexKo}</td></tr>
        <tr><th>측정일시</th><td colspan="3">${p.meta.measured_at}</td></tr>
      </table>
    </header>

    <div class="cols">
      <div class="main">
        <section>
          <h2>체성분분석 <small>Body Composition Analysis</small></h2>
          <table class="comp">
            <thead><tr><th></th><th>측정치</th><th>표준범위</th></tr></thead>
            <tbody>
              <tr><th>체수분 (L)</th><td>${fmt(x.water_l)}</td><td>${fmt(r.water[0])} ~ ${fmt(r.water[1])}</td></tr>
              <tr><th>단백질 (kg)</th><td>${fmt(x.protein_kg)}</td><td>${fmt(r.protein[0])} ~ ${fmt(r.protein[1])}</td></tr>
              <tr><th>무기질 (kg)</th><td>${fmt(x.mineral_kg, 2)}</td><td>${fmt(r.mineral[0], 2)} ~ ${fmt(r.mineral[1], 2)}</td></tr>
              <tr><th>체지방량 (kg)</th><td>${fmt(f.body_fat_kg)}</td><td>${fmt(r.fat[0])} ~ ${fmt(r.fat[1])}</td></tr>
              <tr class="total"><th>체중 (kg)</th><td>${fmt(f.weight_kg)}</td><td>${fmt(r.weight[0])} ~ ${fmt(r.weight[1])}</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>골격근·지방분석 <small>Muscle-Fat Analysis</small></h2>
          <div class="bars">
            ${scaleRow()}
            ${bar("체중", "kg", f.weight_kg, stdW)}
            ${bar("골격근량", "kg", f.skeletal_muscle_kg, stdSmm)}
            ${bar("체지방량", "kg", f.body_fat_kg, stdFat)}
          </div>
        </section>

        <section>
          <h2>비만분석 <small>Obesity Analysis</small></h2>
          <div class="bars">
            ${scaleRow([10, 15, 18.5, 22, 25, 30, 35, 40, 45, 50, 55])}
            ${bar("BMI", "kg/m²", f.bmi, 22)}
            ${bar("체지방률", "%", f.body_fat_pct, p.sex === "M" ? 15 : 23)}
          </div>
          <p class="range">표준범위 · BMI ${fmt(r.bmi[0])} ~ ${fmt(r.bmi[1])} · 체지방률 ${fmt(r.pbf[0])} ~ ${fmt(r.pbf[1])}%</p>
        </section>
      </div>

      <aside>
        <section class="score">
          <h2>체성분 점수</h2>
          <div class="big">${f.score}<span> / 100점</span></div>
          <p>* 근육이 많으면 80점을 넘을 수 있어요</p>
        </section>

        <section>
          <h2>체중조절</h2>
          <table class="kv">
            <tr><th>적정체중</th><td>${fmt(stdW)} kg</td></tr>
            <tr><th>체중조절</th><td>${x.weight_ctrl_kg >= 0 ? "+" : ""}${fmt(x.weight_ctrl_kg)} kg</td></tr>
            <tr><th>지방조절</th><td>${fmt(x.fat_ctrl_kg)} kg</td></tr>
            <tr><th>근육조절</th><td>+${fmt(x.muscle_ctrl_kg)} kg</td></tr>
          </table>
        </section>

        <section>
          <h2>복부지방률</h2>
          <div class="gauge">
            <div class="gauge-track"><div class="gauge-dot" style="left:${((Math.min(1.05, Math.max(0.7, f.whr)) - 0.7) / 0.35) * 100}%"></div></div>
            <div class="gauge-ticks"><span>0.70</span><span>0.80</span><span>0.90</span><span>1.00</span></div>
            <div class="gauge-value">${fmt(f.whr, 2)}</div>
            <div class="range">표준 ${fmt(r.whr[0], 2)} ~ ${fmt(r.whr[1], 2)}</div>
          </div>
        </section>

        <section>
          <h2>연구항목</h2>
          <table class="kv">
            <tr><th>제지방량</th><td>${fmt(x.ffm_kg)} kg</td></tr>
            <tr><th>기초대사량</th><td>${comma(f.bmr_kcal)} kcal</td></tr>
            <tr><th class="sub">(표준)</th><td class="sub">${comma(r.bmr[0])} ~ ${comma(r.bmr[1])}</td></tr>
            <tr><th>비만도</th><td>${x.obesity_degree_pct} %</td></tr>
            <tr><th>권장섭취열량</th><td>${comma(x.recommended_kcal)} kcal</td></tr>
          </table>
        </section>
      </aside>
    </div>

    <footer>이 결과지는 AI PoC 검증을 위해 생성한 가상 데이터예요. 실제 인물의 측정 결과가 아니에요.</footer>
  </div>`;

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><style>${CSS}</style></head>
<body class="v-${variant}">
  <div class="scene">
    <div class="paper" style="transform:rotate(${rotate}deg)">${sheet}</div>
    <div class="shadow"></div>
  </div>
</body></html>`;
}

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color: #222; background: #fff; }
  .scene { width: 900px; height: 1000px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .paper { width: 820px; background: #fff; }
  .shadow { display: none; }

  /* 폰 촬영 흉내 */
  .v-tilt .scene, .v-shadow .scene, .v-combo .scene { background: #8d8a84; }
  .v-tilt .paper, .v-shadow .paper, .v-combo .paper { box-shadow: 0 6px 24px rgba(0,0,0,.35); }
  .v-blur .paper, .v-combo .paper { filter: blur(1.3px); }
  .v-shadow .shadow, .v-combo .shadow {
    display: block; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(115deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.35) 30%, rgba(0,0,0,0) 55%),
                radial-gradient(ellipse at 85% 90%, rgba(0,0,0,.25), transparent 50%);
  }

  .sheet { padding: 28px 30px 18px; border: 1px solid #ccc; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #333; padding-bottom: 12px; }
  .title { font-size: 28px; font-weight: 800; letter-spacing: -.5px; }
  .subtitle { font-size: 11px; color: #777; margin-top: 2px; }
  table.info { font-size: 12px; border-collapse: collapse; }
  table.info th { background: #eee; padding: 3px 8px; font-weight: 600; text-align: left; border: 1px solid #ccc; }
  table.info td { padding: 3px 10px; border: 1px solid #ccc; min-width: 70px; }

  .cols { display: grid; grid-template-columns: 1fr 240px; gap: 20px; margin-top: 14px; }
  section { margin-bottom: 16px; }
  h2 { font-size: 15px; font-weight: 800; background: #333; color: #fff; padding: 4px 10px; margin-bottom: 8px; }
  h2 small { font-weight: 400; font-size: 10px; color: #ccc; margin-left: 6px; }

  table.comp { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.comp th, table.comp td { border: 1px solid #bbb; padding: 6px 8px; }
  table.comp thead th { background: #f0f0f0; font-size: 12px; }
  table.comp tbody th { text-align: left; background: #fafafa; width: 34%; }
  table.comp td:nth-child(2) { font-weight: 800; font-size: 15px; text-align: center; }
  table.comp td:nth-child(3) { color: #666; text-align: center; }
  table.comp tr.total th, table.comp tr.total td { border-top: 2px solid #333; }

  .bars { border: 1px solid #bbb; padding: 8px 10px 10px; }
  .bar-row { display: grid; grid-template-columns: 96px 1fr; align-items: center; height: 30px; }
  .bar-row.scale { height: 18px; }
  .bar-label { font-size: 13px; font-weight: 700; }
  .bar-label small { font-weight: 400; font-size: 10px; color: #666; margin-left: 2px; }
  .bar-track { position: relative; height: 14px; border-left: 1px solid #999; background: repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), #e2e2e2 calc(10% - 1px) 10%); }
  .bar-track.ticks { background: none; border: 0; height: 14px; }
  .bar-track.ticks span { position: absolute; transform: translateX(-50%); font-size: 10px; color: #666; }
  .bar-fill { height: 100%; background: #444; }
  .bar-value { position: absolute; top: -3px; font-size: 13px; font-weight: 800; }
  p.range, .range { font-size: 11px; color: #666; margin-top: 4px; }

  aside section { border: 1px solid #bbb; padding-bottom: 8px; }
  aside h2 { margin-bottom: 6px; }
  .score .big { font-size: 46px; font-weight: 800; text-align: center; line-height: 1.1; }
  .score .big span { font-size: 15px; font-weight: 600; }
  .score p { font-size: 10px; color: #777; text-align: center; }
  table.kv { width: 100%; font-size: 12.5px; border-collapse: collapse; }
  table.kv th { text-align: left; font-weight: 600; padding: 3px 8px; color: #444; }
  table.kv td { text-align: right; padding: 3px 8px; font-weight: 700; }
  table.kv .sub { font-weight: 400; color: #777; font-size: 11px; }
  .gauge { padding: 4px 12px 0; }
  .gauge-track { position: relative; height: 8px; background: linear-gradient(90deg, #ddd, #888); border-radius: 4px; margin-top: 6px; }
  .gauge-dot { position: absolute; top: -4px; width: 16px; height: 16px; border-radius: 50%; background: #222; transform: translateX(-50%); }
  .gauge-ticks { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-top: 4px; }
  .gauge-value { font-size: 26px; font-weight: 800; text-align: center; margin-top: 2px; }
  .gauge .range { text-align: center; }
  footer { font-size: 10px; color: #888; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 4px; text-align: center; }
`;
