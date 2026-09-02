function draw2() {
  ctx.fillStyle = "#f7f1e4";
  ctx.fillRect(0, 0, cssW, cssH);
  var step = tick(88 / view2.scale);
  var a = toWorld(0, 0), b = toWorld(cssW, cssH);
  var x0 = Math.floor(a.x / step) * step;
  var y0 = Math.floor(b.y / step) * step;
  ctx.font = "11px ui-monospace, monospace";
  ctx.textBaseline = "top";
  var x, y, p;
  for (x = x0; x <= b.x + step; x += step) {
    p = toPx(x, 0);
    ctx.strokeStyle = Math.abs(x) < step * 1e-9 ? "#1c1914" : "#e4dccb";
    ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, cssH); ctx.stroke();
  }
  for (y = y0; y <= a.y + step; y += step) {
    p = toPx(0, y);
    ctx.strokeStyle = Math.abs(y) < step * 1e-9 ? "#1c1914" : "#e4dccb";
    ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(cssW, p.y); ctx.stroke();
  }
  if (!fn2) return;
  ctx.beginPath();
  ctx.strokeStyle = "#b43328";
  ctx.lineWidth = 2.1;
  var pen = false, prev = NaN;
  for (var i = 0; i <= cssW; i++) {
    var xv = toWorld(i, 0).x;
    var yv = fn2(xv);
    if (!isFinite(yv) || (isFinite(prev) && Math.abs(yv - prev) * view2.scale > cssH * 0.65)) {
      pen = false; prev = yv; continue;
    }
    p = toPx(xv, yv);
    if (!pen) { ctx.moveTo(p.x, p.y); pen = true; }
    else ctx.lineTo(p.x, p.y);
    prev = yv;
  }
  ctx.stroke();
  out.innerHTML = '<div><span class="k">y</span> ' + exprEl.value + "</div>";
}
function draw() {
  if (mode === "3d") draw3();
  else draw2();
}
function setMode(next) {
  mode = next;
  document.getElementById("mode2").classList.toggle("on", mode === "2d");
  document.getElementById("mode3").classList.toggle("on", mode === "3d");
  document.getElementById("hintbar").textContent = mode === "3d" ? "drag orbit \u00b7 scroll zoom" : "scroll zoom \u00b7 drag pan";
  document.getElementById("help").textContent = mode === "3d"
    ? "z = f(x, y). Drag to orbit, scroll to zoom. Height colors run teal to rust."
    : "y = f(x). Scroll to zoom, drag to pan.";
  fillExamples();
  if (mode === "3d" && exprEl.value.indexOf("y") < 0) exprEl.value = "sin(x)*cos(y)";
  if (mode === "2d" && exprEl.value.indexOf("y") >= 0) exprEl.value = "sin(x)";
  rebuild();
}
function fillExamples() {
  var box = document.getElementById("ex");
  box.innerHTML = "";
  (mode === "3d" ? EX3 : EX2).forEach(function (pair) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = pair[0];
    b.onclick = function () { exprEl.value = pair[1]; rebuild(); };
    box.appendChild(b);
  });
}
exprEl.addEventListener("input", rebuild);
resEl.addEventListener("input", function () {
  document.getElementById("resVal").textContent = resEl.value;
  if (mode === "3d") { buildMesh(); draw(); }
});
domEl.addEventListener("input", function () {
  document.getElementById("domVal").textContent = "\u00b1" + domEl.value;
  if (mode === "3d") { buildMesh(); draw(); }
});
document.getElementById("home").onclick = function () {
  view2.cx = 0; view2.cy = 0; view2.scale = 46;
  view3.yaw = 0.7; view3.pitch = 0.55; view3.zoom = 1;
  draw();
};
document.getElementById("mode2").onclick = function () { setMode("2d"); };
document.getElementById("mode3").onclick = function () { setMode("3d"); };
canvas.addEventListener("pointerdown", function (e) {
  dragging = true; lx = e.clientX; ly = e.clientY;
  canvas.classList.add("drag");
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup", function () { dragging = false; canvas.classList.remove("drag"); });
canvas.addEventListener("pointercancel", function () { dragging = false; canvas.classList.remove("drag"); });
canvas.addEventListener("pointermove", function (e) {
  if (!dragging) {
    if (mode === "2d" && fn2) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var wpt = toWorld(mx, 0);
      out.innerHTML = '<div><span class="k">x</span> ' + fmt(wpt.x) + '</div><div><span class="k">y</span> ' + fmt(fn2(wpt.x)) + "</div>";
    }
    return;
  }
  var dx = e.clientX - lx, dy = e.clientY - ly;
  lx = e.clientX; ly = e.clientY;
  if (mode === "3d") {
    view3.yaw += dx * 0.008;
    view3.pitch = Math.max(0.12, Math.min(1.35, view3.pitch + dy * 0.008));
  } else {
    view2.cx -= dx / view2.scale;
    view2.cy += dy / view2.scale;
  }
  draw();
});
canvas.addEventListener("wheel", function (e) {
  e.preventDefault();
  if (mode === "3d") {
    view3.zoom = Math.max(0.35, Math.min(3.2, view3.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
  } else {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left, my = e.clientY - rect.top;
    var before = toWorld(mx, my);
    view2.scale = Math.min(480, Math.max(6, view2.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    var after = toWorld(mx, my);
    view2.cx += before.x - after.x;
    view2.cy += before.y - after.y;
  }
  draw();
}, { passive: false });
window.addEventListener("resize", size);
fillExamples();
setMode("3d");
size();
