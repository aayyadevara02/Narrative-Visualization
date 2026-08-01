/* ============================================================
   What Makes an Elite Hitter? — Martini Glass narrative viz
   Data: BATTERS (from data.js), 2023 MLB batters w/ 300+ PA
   ============================================================ */

/* ---------- shared chart scaffold ---------- */
const margin = { top: 30, right: 40, bottom: 55, left: 95 };
const svgW = 900, svgH = 520;
const width = svgW - margin.left - margin.right;
const height = svgH - margin.top - margin.bottom;

const svg = d3.select("#chart");
const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("#tooltip");

/* ---------- derived data ---------- */
const ALL = BATTERS.slice().sort((a, b) => d3.descending(a.opsPlus, b.opsPlus));
const TOP10 = ALL.slice(0, 10);
const BOTTOM10 = ALL.slice(-10);
const TEAMS = Array.from(new Set(ALL.map(d => d.team))).sort();

const STAT_META = {
  ba:  { label: "Batting Average",   fmt: d3.format(".3f") },
  obp: { label: "On-Base %",         fmt: d3.format(".3f") },
  slg: { label: "Slugging %",        fmt: d3.format(".3f") },
  hr:  { label: "Home Runs",         fmt: d3.format("d") },
  so:  { label: "Strikeouts",        fmt: d3.format("d") },
  bb:  { label: "Walks",             fmt: d3.format("d") }
};

/* ---------- parameters (state) ---------- */
const state = {
  scene: 0,
  xStat: "obp",
  yStat: "slg",
  team: "ALL"
};

/* ---------- helpers ---------- */
function clearChart() {
  g.selectAll("*").remove();
}

function addAnnotations(items, type) {
  const makeAnnotations = d3.annotation()
    .type(type || d3.annotationCalloutCircle)
    .annotations(items);
  g.append("g").attr("class", "annotation-group").call(makeAnnotations);
}

// Keeps an annotation's note box fully inside the plotting area, regardless
// of the anchor point's position, so labels never run off the SVG.
function clampOffset(x, y, dx, dy, boxW, boxH, pad) {
  boxW = boxW || 160; boxH = boxH || 56; pad = pad || 8;
  let nx = x + dx, ny = y + dy;
  const halfW = boxW / 2, halfH = boxH / 2;
  if (nx - halfW < pad) nx = pad + halfW;
  if (nx + halfW > width - pad) nx = width - pad - halfW;
  if (ny - halfH < pad) ny = pad + halfH;
  if (ny + halfH > height - pad) ny = height - pad - halfH;
  return { dx: nx - x, dy: ny - y };
}

function showTooltip(html, event) {
  tooltip
    .style("opacity", 1)
    .html(html)
    .style("left", (event.offsetX + 16) + "px")
    .style("top", (event.offsetY - 10) + "px");
}
function moveTooltip(event) {
  tooltip
    .style("left", (event.offsetX + 16) + "px")
    .style("top", (event.offsetY - 10) + "px");
}
function hideTooltip() {
  tooltip.style("opacity", 0);
}

function playerHTML(d) {
  return `<strong>${d.name}</strong> (${d.team})<br>
    OPS+: ${d.opsPlus} &nbsp;|&nbsp; OPS: ${d.ops}<br>
    BA/OBP/SLG: ${d.ba} / ${d.obp} / ${d.slg}<br>
    HR: ${d.hr} &nbsp; BB: ${d.bb} &nbsp; SO: ${d.so}`;
}

/* ============================================================
   SCENE 0 — "The Field": distribution of OPS+ for all 155
   ============================================================ */
function renderScene0() {
  const values = ALL.map(d => d.opsPlus);
  const x = d3.scaleLinear().domain(d3.extent(values)).nice().range([0, width]);
  const bins = d3.bin().domain(x.domain()).thresholds(16)(values);
  const y = d3.scaleLinear().domain([0, d3.max(bins, b => b.length)]).nice().range([height, 0]);

  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(6));

  g.append("text").attr("class", "axis-label")
    .attr("x", width / 2).attr("y", height + 42).attr("text-anchor", "middle")
    .text("OPS+");
  g.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2).attr("y", -46).attr("text-anchor", "middle")
    .text("Number of batters");

  g.selectAll(".bar").data(bins).join("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.x0) + 1)
    .attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr("height", d => height - y(d.length));

  // reference line at league-average OPS+ = 100
  g.append("line").attr("class", "ref-line")
    .attr("x1", x(100)).attr("x2", x(100))
    .attr("y1", 0).attr("y2", height);

  {
    const anchorX = x(100), anchorY = 4;
    const off = clampOffset(anchorX, anchorY, 300, -18, 170, 56);
    addAnnotations([{
      note: {
        title: "League average = 100",
        label: "Most hitters land within a narrow band around this line.",
        wrap: 170
      },
      x: anchorX, y: anchorY,
      dx: off.dx, dy: off.dy,
      color: "#c0392b"
    }], d3.annotationLabel);
  }
}

/* ============================================================
   SCENE 1 — "The Outliers": Top 10 OPS+, horizontal bars
   ============================================================ */
function renderScene1() {
  const data = TOP10;
  const y = d3.scaleBand().domain(data.map(d => d.name)).range([0, height]).padding(0.25);
  // pad the domain so the longest bar leaves room for its annotation label
  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.opsPlus) * 1.25]).nice().range([0, width]);

  g.append("g").attr("class", "axis").call(d3.axisLeft(y));
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  g.append("text").attr("class", "axis-label")
    .attr("x", width / 2).attr("y", height + 42).attr("text-anchor", "middle")
    .text("OPS+");

  g.selectAll(".bar").data(data).join("rect")
    .attr("class", d => "bar" + (d.name === "Shohei Ohtani" ? " highlight" : ""))
    .attr("y", d => y(d.name))
    .attr("x", 0)
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.opsPlus))
    .on("mouseenter", (event, d) => showTooltip(playerHTML(d), event))
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);

  const ohtani = data.find(d => d.name === "Shohei Ohtani");
  {
    const anchorX = x(ohtani.opsPlus), anchorY = y(ohtani.name) + y.bandwidth() / 2;
    const off = clampOffset(anchorX, anchorY, 20, 50, 150, 50);
    addAnnotations([{
      note: {
        title: "185",
        label: "Ohtani's OPS+ is 22 points higher than the next hitter on this list.",
        wrap: 150
      },
      x: anchorX, y: anchorY,
      dx: off.dx, dy: off.dy,
      color: "#c0392b"
    }], d3.annotationLabel);
  }
}

/* ============================================================
   SCENE 2 — "Two Paths to Greatness": OBP vs SLG, top 10 only
   ============================================================ */
function scatterScales(data, padFrac = 0.08) {
  const xExt = d3.extent(data, d => d.obp);
  const yExt = d3.extent(data, d => d.slg);
  const xPad = (xExt[1] - xExt[0]) * padFrac || 0.01;
  const yPad = (yExt[1] - yExt[0]) * padFrac || 0.01;
  const x = d3.scaleLinear().domain([xExt[0] - xPad, xExt[1] + xPad]).range([0, width]);
  const y = d3.scaleLinear().domain([yExt[0] - yPad, yExt[1] + yPad]).range([height, 0]);
  return { x, y };
}

function drawScatterAxes(x, y, xLabel, yLabel) {
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format(".3f")));
  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d3.format(".3f")));
  g.append("text").attr("class", "axis-label")
    .attr("x", width / 2).attr("y", height + 42).attr("text-anchor", "middle")
    .text(xLabel);
  g.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2).attr("y", -48).attr("text-anchor", "middle")
    .text(yLabel);
}

function renderScene2() {
  const { x, y } = scatterScales(TOP10, 0.18);
  drawScatterAxes(x, y, "On-Base Percentage (OBP)", "Slugging Percentage (SLG)");

  const r = d3.scaleSqrt().domain(d3.extent(TOP10, d => d.opsPlus)).range([6, 14]);

  g.selectAll(".dot-point").data(TOP10).join("circle")
    .attr("class", "dot-point top")
    .attr("cx", d => x(d.obp))
    .attr("cy", d => y(d.slg))
    .attr("r", d => r(d.opsPlus))
    .on("mouseenter", (event, d) => showTooltip(playerHTML(d), event))
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);

  const byName = n => TOP10.find(d => d.name === n);
  const ohtani = byName("Shohei Ohtani"), arraez = byName("Luis Arraez"), acuna = byName("Ronald Acuna Jr.");

  // offsets below were checked against every point's actual pixel position
  // (not just the annotated one) so labels land in genuinely empty space
  const oOff = clampOffset(x(ohtani.obp), y(ohtani.slg), 45, -5, 150, 50);
  const aOff = clampOffset(x(arraez.obp), y(arraez.slg), -50, -35, 20, 100);
  const cOff = clampOffset(x(acuna.obp), y(acuna.slg), -20, -20, 150, 50);

  addAnnotations([
    {
      note: { title: "Power path", label: "Ohtani: elite slugging, more strikeouts.", wrap: 150 },
      x: x(ohtani.obp), y: y(ohtani.slg), dx: oOff.dx, dy: oOff.dy,
      subject: { radius: r(ohtani.opsPlus) + 3 }, color: "#c0392b"
    },
    {
      note: { title: "Contact path", label: "Arraez: elite average and OBP, almost no power.", wrap: 150 },
      x: x(arraez.obp), y: y(arraez.slg), dx: aOff.dx, dy: aOff.dy,
      subject: { radius: r(arraez.opsPlus) + 3 }, color: "#16213e"
    },
    {
      note: { title: "Balanced path", label: "Acuña: strong on both axes at once.", wrap: 150 },
      x: x(acuna.obp), y: y(acuna.slg), dx: cOff.dx, dy: cOff.dy,
      subject: { radius: r(acuna.opsPlus) + 3 }, color: "#d4a017"
    }
  ]);
}

/* ============================================================
   SCENE 3 — "No Shortcuts at the Bottom": top10 + bottom10
   ============================================================ */
function renderScene3() {
  const combined = TOP10.concat(BOTTOM10);
  const { x, y } = scatterScales(combined, 0.12);
  drawScatterAxes(x, y, "On-Base Percentage (OBP)", "Slugging Percentage (SLG)");

  const r = d3.scaleSqrt().domain(d3.extent(combined, d => d.opsPlus)).range([5, 14]);

  g.selectAll(".dot-point").data(combined).join("circle")
    .attr("class", d => "dot-point " + (TOP10.includes(d) ? "top" : "bottom"))
    .attr("cx", d => x(d.obp))
    .attr("cy", d => y(d.slg))
    .attr("r", d => r(d.opsPlus))
    .on("mouseenter", (event, d) => showTooltip(playerHTML(d), event))
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);

  const lowest = BOTTOM10[BOTTOM10.length - 1];
  // route the label into the open gap between the top-tier and bottom-tier
  // clusters rather than into the crowded bottom-left corner
  const lOff = clampOffset(x(lowest.obp), y(lowest.slg), 25, -140, 170, 56);
  addAnnotations([{
    note: {
      title: "The bottom tier",
      label: "Low OPS+ hitters trail on both OBP and SLG at once. There's no single shortcut to elite production.",
      wrap: 170
    },
    x: x(lowest.obp), y: y(lowest.slg), dx: lOff.dx, dy: lOff.dy,
    subject: { radius: r(lowest.opsPlus) + 3 }, color: "#6b6b76"
  }]);
}

/* ============================================================
   SCENE 4 — "Explore the Full Field": all 155, interactive
   ============================================================ */
function renderScene4() {
  const xKey = state.xStat, yKey = state.yStat;
  const xExt = d3.extent(ALL, d => d[xKey]);
  const yExt = d3.extent(ALL, d => d[yKey]);
  const xPad = (xExt[1] - xExt[0]) * 0.06, yPad = (yExt[1] - yExt[0]) * 0.06;
  const x = d3.scaleLinear().domain([xExt[0] - xPad, xExt[1] + xPad]).range([0, width]);
  const y = d3.scaleLinear().domain([yExt[0] - yPad, yExt[1] + yPad]).range([height, 0]);

  drawScatterAxes(x, y, STAT_META[xKey].label, STAT_META[yKey].label);

  const color = d3.scaleSequential(d3.interpolateRgb("#8ea3c9", "#c0392b"))
    .domain(d3.extent(ALL, d => d.opsPlus));

  g.selectAll(".dot-point").data(ALL, d => d.name).join("circle")
    .attr("class", "dot-point")
    .attr("cx", d => x(d[xKey]))
    .attr("cy", d => y(d[yKey]))
    .attr("r", 5)
    .attr("fill", d => color(d.opsPlus))
    .attr("opacity", d => (state.team === "ALL" || d.team === state.team) ? 0.9 : 0.12)
    .on("mouseenter", (event, d) => showTooltip(playerHTML(d), event))
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);
}

function updateScene4() {
  if (state.scene !== 4) return;
  clearChart();
  renderScene4();
}

/* ============================================================
   scene registry + navigation (triggers)
   ============================================================ */
const SCENES = [
  {
    title: "The Field",
    text: "In 2023, 155 MLB batters logged at least 300 plate appearances. Their OPS+ (park and league adjusted measure where 100 is average) mostly clusters close to that average line.",
    render: renderScene0
  },
  {
    title: "The Outliers",
    text: "A handful of hitters pull ahead of the pack. Shohei Ohtani's OPS+ of 185 sits well above even the other elite bats on this list.",
    render: renderScene1
  },
  {
    title: "Two Paths to Greatness",
    text: "Zooming into the top 10, OPS+ is really built from two ingredients: On-Base Percentage and Slugging Percentage. Different hitters lean on different ingredients to get to the same elite result.",
    render: renderScene2
  },
  {
    title: "No Shortcuts at the Bottom",
    text: "Compare the top 10 against the 10 lowest OPS+ qualified hitters. The bottom group isn't just weak in one category, it trails on both OBP and SLG simultaneously.",
    render: renderScene3
  },
  {
    title: "Explore the Full Field",
    text: "Now it's your turn. Explore all 155 qualified batters below. Switch the axes, filter by team and hover any point for a full stat line.",
    render: renderScene4
  }
];

function buildDots() {
  const wrap = d3.select("#scene-dots");
  wrap.selectAll(".dot").data(SCENES).join("span")
    .attr("class", (d, i) => "dot" + (i === state.scene ? " active" : ""));
}

function goToScene(idx) {
  state.scene = Math.max(0, Math.min(SCENES.length - 1, idx));
  const scene = SCENES[state.scene];

  d3.select("#scene-title").text(scene.title);
  d3.select("#scene-text").text(scene.text);
  d3.select("#btn-back").attr("disabled", state.scene === 0 ? true : null);
  d3.select("#btn-next").attr("disabled", state.scene === SCENES.length - 1 ? true : null);
  d3.select("#explore-controls").classed("hidden", state.scene !== SCENES.length - 1);

  d3.selectAll(".dot").classed("active", (d, i) => i === state.scene);

  hideTooltip();
  clearChart();
  scene.render();
}

/* ---------- wire up triggers ---------- */
d3.select("#btn-back").on("click", () => goToScene(state.scene - 1));
d3.select("#btn-next").on("click", () => goToScene(state.scene + 1));

function populateExploreControls() {
  const statOptions = Object.keys(STAT_META);
  const selX = d3.select("#select-x");
  const selY = d3.select("#select-y");
  const selTeam = d3.select("#select-team");

  selX.selectAll("option").data(statOptions).join("option")
    .attr("value", d => d).text(d => STAT_META[d].label);
  selY.selectAll("option").data(statOptions).join("option")
    .attr("value", d => d).text(d => STAT_META[d].label);

  selX.property("value", state.xStat);
  selY.property("value", state.yStat);

  selTeam.selectAll("option").data(["ALL", ...TEAMS]).join("option")
    .attr("value", d => d).text(d => d === "ALL" ? "All teams" : d);
  selTeam.property("value", state.team);

  selX.on("change", function () { state.xStat = this.value; updateScene4(); });
  selY.on("change", function () { state.yStat = this.value; updateScene4(); });
  selTeam.on("change", function () { state.team = this.value; updateScene4(); });
}

/* ---------- init ---------- */
buildDots();
populateExploreControls();
goToScene(0);
