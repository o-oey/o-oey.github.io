var canvas = document.getElementById("g");
var stage = document.getElementById("stage");
var ctx = canvas.getContext("2d");
var out = document.getElementById("out");
var errEl = document.getElementById("err");
var exprEl = document.getElementById("expr");
var resEl = document.getElementById("res");
var domEl = document.getElementById("dom");
var view2 = { cx: 0, cy: 0, scale: 46 };
var view3 = { yaw: 0.7, pitch: 0.55, zoom: 1, zScale: 1 };
var mode = "3d";
var cssW = 800, cssH = 500;
var fn2 = null, fn3 = null;
var mesh = [];
var dragging = false, lx = 0, ly = 0;
var EX2 = [["sine","sin(x)"],["parabola","0.12*x^2-2"],["damped","sin(3*x)*exp(-0.18*abs(x))"],["rational","x/(1+x^2)"]];
var EX3 = [["wave","sin(x)*cos(y)"],["paraboloid","0.15*(x^2+y^2)"],["saddle","0.18*(x^2-y^2)"],["ripple","sin(sqrt(x^2+y^2)*2)"],["gaussian","2*exp(-(x^2+y^2)/4)"],["sombrero","sin(sqrt(x^2+y^2)*3)/(sqrt(x^2+y^2)+0.35)"]];
var ALLOWED = /^(sin|cos|tan|asin|acos|atan|abs|sqrt|log|ln|exp|min|max|floor|ceil|round|pi|e|x|y)$/i;
function preprocess(expr, vars) {
  var s = String(expr).trim().replace(/\s+/g, "");
  if (!s) throw new Error("empty expression");
  if (!/^[0-9A-Za-z+\-*/^().,]+$/.test(s)) throw new Error("unsupported characters");
  s = s.replace(/\^/g, "**");
  s = s.replace(/(\d)(x|y|pi|e|[A-Za-z]+)/gi, "$1*$2");
  s = s.replace(/(x|y|pi|e|\))(\(|x|y|pi|e|[A-Za-z])/gi, "$1*$2");
  s = s.replace(/([A-Za-z]+)/g, function (w) {
    if (!ALLOWED.test(w)) throw new Error("unknown name: " + w);
    if ((w.toLowerCase() === "y") && vars.indexOf("y") < 0) throw new Error("y is only valid in 3D");
    return w.toLowerCase();
  });
  return s;
}
function compile(expr, dim) {
  var src = preprocess(expr, dim === 3 ? ["x", "y"] : ["x"]);
  var raw = new Function("X", "Y", "var sin=Math.sin,cos=Math.cos,tan=Math.tan,asin=Math.asin,acos=Math.acos,atan=Math.atan,abs=Math.abs,sqrt=Math.sqrt,log=Math.log,ln=Math.log,exp=Math.exp,min=Math.min,max=Math.max,floor=Math.floor,ceil=Math.ceil,round=Math.round,pi=Math.PI,e=Math.E,x=X,y=Y; return (" + src + ");");
  raw(0.3, 0.2);
  return function (x, y) {
    try {
      var z = raw(x, y == null ? 0 : y);
      return typeof z === "number" && isFinite(z) ? z : NaN;
    } catch (e) { return NaN; }
  };
}
function rebuild() {
  errEl.textContent = "";
  exprEl.classList.remove("bad");
  try {
    if (mode === "3d") { fn3 = compile(exprEl.value, 3); buildMesh(); }
    else { fn2 = compile(exprEl.value, 2); }
  } catch (e) {
    fn2 = fn3 = null;
    exprEl.classList.add("bad");
    errEl.textContent = e.message;
  }
  draw();
}
function buildMesh() {
  mesh = [];
  if (!fn3) return;
  var n = Number(resEl.value), R = Number(domEl.value), i, j, x, y, z, row;
  for (j = 0; j <= n; j++) {
    row = [];
    y = -R + (2 * R * j) / n;
    for (i = 0; i <= n; i++) {
      x = -R + (2 * R * i) / n;
      z = fn3(x, y);
      row.push({ x: x, y: y, z: isFinite(z) ? z : null });
    }
    mesh.push(row);
  }
}
function size() {
  var box = stage.getBoundingClientRect();
  cssW = Math.max(320, Math.floor(box.width || window.innerWidth));
  cssH = Math.max(280, Math.floor(box.height || window.innerHeight - 70));
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
function project3(p) {
  var cy = Math.cos(view3.yaw), sy = Math.sin(view3.yaw);
  var cp = Math.cos(view3.pitch), sp = Math.sin(view3.pitch);
  var x = p.x * cy - p.y * sy;
  var z = p.x * sy + p.y * cy;
  var y = p.z * view3.zScale * cp - z * sp;
  var depth = p.z * view3.zScale * sp + z * cp;
  var s = Math.min(cssW, cssH) * 0.09 * view3.zoom;
  return { x: cssW * 0.48 + x * s, y: cssH * 0.54 - y * s, d: depth };
}
function lerpColor(t) {
  t = Math.max(0, Math.min(1, t));
  var a = [30, 109, 134], b = [180, 51, 40];
  return "rgb(" + Math.round(a[0]+(b[0]-a[0])*t) + "," + Math.round(a[1]+(b[1]-a[1])*t) + "," + Math.round(a[2]+(b[2]-a[2])*t) + ")";
}
function draw3() {
  ctx.fillStyle = "#f7f1e4";
  ctx.fillRect(0, 0, cssW, cssH);
  var R = Number(domEl.value);
  var axes = [
    [{x:-R,y:0,z:0},{x:R,y:0,z:0},"#8a4d1c","x"],
    [{x:0,y:-R,z:0},{x:0,y:R,z:0},"#2c7a48","y"],
    [{x:0,y:0,z:-R*0.6},{x:0,y:0,z:R*0.6},"#1e6d86","z"]
  ];
  axes.forEach(function (ax) {
    var a = project3(ax[0]), b = project3(ax[1]);
    ctx.strokeStyle = ax[2]; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = ax[2]; ctx.font = "12px ui-sans-serif, sans-serif"; ctx.fillText(ax[3], b.x + 6, b.y);
  });
  if (!mesh.length) return;
  var zmin = Infinity, zmax = -Infinity, i, j, a, b, c, d, quads = [];
  for (j = 0; j < mesh.length; j++) {
    for (i = 0; i < mesh[j].length; i++) {
      if (mesh[j][i].z != null) {
        if (mesh[j][i].z < zmin) zmin = mesh[j][i].z;
        if (mesh[j][i].z > zmax) zmax = mesh[j][i].z;
      }
    }
  }
  if (!isFinite(zmin)) return;
  if (zmax === zmin) zmax = zmin + 1;
  view3.zScale = (2 * R) / Math.max(2, (zmax - zmin));
  for (j = 0; j < mesh.length - 1; j++) {
    for (i = 0; i < mesh[j].length - 1; i++) {
      a = mesh[j][i]; b = mesh[j][i+1]; c = mesh[j+1][i+1]; d = mesh[j+1][i];
      if (a.z == null || b.z == null || c.z == null || d.z == null) continue;
      var avg = (a.z + b.z + c.z + d.z) / 4;
      var pa = project3(a), pb = project3(b), pc = project3(c), pd = project3(d);
      quads.push({ pts:[pa,pb,pc,pd], d:(pa.d+pb.d+pc.d+pd.d)/4, t:(avg-zmin)/(zmax-zmin) });
    }
  }
  quads.sort(function (u, v) { return u.d - v.d; });
  quads.forEach(function (q) {
    ctx.beginPath();
    ctx.moveTo(q.pts[0].x, q.pts[0].y);
    ctx.lineTo(q.pts[1].x, q.pts[1].y);
    ctx.lineTo(q.pts[2].x, q.pts[2].y);
    ctx.lineTo(q.pts[3].x, q.pts[3].y);
    ctx.closePath();
    ctx.fillStyle = lerpColor(q.t);
    ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(28,25,20,.18)"; ctx.lineWidth = 0.6; ctx.stroke();
  });
  out.innerHTML = '<div><span class="k">z</span> ' + exprEl.value + '</div><div><span class="k">range</span> ' + zmin.toFixed(2) + " ... " + zmax.toFixed(2) + "</div>";
}
function tick(raw) {
  raw = Math.max(raw, 1e-6);
  var p = Math.pow(10, Math.floor(Math.log10(raw)));
  var f = raw / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}
function toWorld(px, py) {
  return { x: view2.cx + (px - cssW / 2) / view2.scale, y: view2.cy - (py - cssH / 2) / view2.scale };
}
function toPx(x, y) {
  return { x: cssW / 2 + (x - view2.cx) * view2.scale, y: cssH / 2 - (y - view2.cy) * view2.scale };
}
function fmt(n) {
  if (!isFinite(n)) return "undefined";
  var a = Math.abs(n);
  if (a !== 0 && (a >= 1e4 || a < 1e-3)) return n.toExponential(3);
  return String(Math.round(n * 1000) / 1000);
}
