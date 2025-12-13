(function () {
  "use strict";

  // ====== GATES ======
  var GATE_IMPL = {
    AND: function (a, b) { return a & b; },
    OR: function (a, b) { return a | b; },
    XOR: function (a, b) { return a ^ b; },
    NAND: function (a, b) { return (a & b) ? 0 : 1; },
    NOR: function (a, b) { return (a | b) ? 0 : 1; },
    NOT: function (a) { return a ? 0 : 1; }
  };

  var GATE_LABELS = {
  AND: "AND (∧)",
  OR: "OR (∨)",
  XOR: "XOR (⊕)",
  NAND: "NAND (⊼)",
  NOR: "NOR (⊽)",
  NOT: "NOT (¬)"
};

  function gateInCount(type) {
    return type === "NOT" ? 1 : 2;
  }

var LEVELS = [
  {
    id: "level1",
    num: 1,
    name: "два датчика",
    task: "Система срабатывает только если оба датчика A и B активны.",
    targetExpr: "F = A ∧ B",
    inputs: ["A", "B"],
    outputs: ["F"],
    func: v => v.A & v.B
  },
  {
    id: "level2",
    num: 2,
    name: "альтернативный доступ",
    task: "Достаточно активации любого из датчиков A или B.",
    targetExpr: "F = A ∨ B",
    inputs: ["A", "B"],
    outputs: ["F"],
    func: v => v.A | v.B
  },
  {
    id: "level3",
    num: 3,
    name: "запрет",
    task: "Система активна, если датчик A НЕ активен.",
    targetExpr: "F = ¬A",
    inputs: ["A"],
    outputs: ["F"],
    func: v => v.A ? 0 : 1
  },
  {
    id: "level4",
    num: 4,
    name: "доступ с ограничением",
    task: "A должен быть активен, а B — выключен.",
    targetExpr: "F = A ∧ ¬B",
    inputs: ["A", "B"],
    outputs: ["F"],
    func: v => v.A & (v.B ? 0 : 1)
  },
  {
    id: "level5",
    num: 5,
    name: "аварийный режим",
    task: "Доступ разрешён, если A активен или аварийный сигнал C включён, но B выключен.",
    targetExpr: "F = (A ∨ C) ∧ ¬B",
    inputs: ["A", "B", "C"],
    outputs: ["F"],
    func: v => (v.A | v.C) & (v.B ? 0 : 1)
  },

  {
    id: "level6",
    num: 6,
    name: "инвертированная безопасность",
    task: "Система блокируется только если оба датчика A и B активны одновременно.",
    targetExpr: "F = ¬(A ∧ B)",
    inputs: ["A", "B"],
    outputs: ["F"],
    func: v => (v.A & v.B) ? 0 : 1
  },
  {
    id: "level7",
    num: 7,
    name: "тихая зона",
    task: "Система активна только если ни один датчик не подаёт сигнал.",
    targetExpr: "F = ¬(A ∨ B)",
    inputs: ["A", "B"],
    outputs: ["F"],
    func: v => (v.A | v.B) ? 0 : 1
  },

  {
    id: "level8",
    num: 8,
    name: "ровно один",
    task: "Система активна, если активен ровно один из датчиков A или B.",
    targetExpr: "F = A ⊕ B",
    inputs: ["A", "B"],
    outputs: ["F"],
    func: v => v.A ^ v.B
  },
  {
    id: "level9",
    num: 9,
    name: "контроль несоответствия",
    task: "A и B должны различаться, но только если C выключен.",
    targetExpr: "F = (A ⊕ B) ∧ ¬C",
    inputs: ["A", "B", "C"],
    outputs: ["F"],
    func: v => (v.A ^ v.B) & (v.C ? 0 : 1)
  },

  {
    id: "level10",
    num: 10,
    name: "двухфакторная защита",
    task: "Система срабатывает, если A и B активны, либо если включён аварийный канал C.",
    targetExpr: "F = (A ∧ B) ∨ C",
    inputs: ["A", "B", "C"],
    outputs: ["F"],
    func: v => (v.A & v.B) | v.C
  },
  {
    id: "level11",
    num: 11,
    name: "отказоустойчивость",
    task: "Доступ разрешён, если A и B активны, либо если аварийный канал C выключен.",
    targetExpr: "F = (A ∧ B) ∨ ¬C",
    inputs: ["A", "B", "C"],
    outputs: ["F"],
    func: v => (v.A & v.B) | (v.C ? 0 : 1)
  },
  {
    id: "level12",
    num: 12,
    name: "паранойя",
    task: "A и B должны совпадать, либо C активен. Если D активен — доступ запрещён всегда.",
    targetExpr: "F = (¬(A ⊕ B) ∨ C) ∧ ¬D",
    inputs: ["A", "B", "C", "D"],
    outputs: ["F"],
    func: v => ((!(v.A ^ v.B) ? 1 : 0) | v.C) & (v.D ? 0 : 1)
  }
];

  // ====== DOM ======
  var levelsList, levelTitle, levelTarget, levelTask, hintBtn;
  var board, workspace, dropHint, srcPortsEl, outPortsEl, wiresSvg;
  var waveExpected, waveActual;
  var playBtn, pauseBtn, stopBtn, truthBtn, resultLine, timeLine;
  var truthModal, truthBody;
  var restartBtn;

  // ====== CONSTANTS (layout) ======
  // Узкие блоки, как ты просила: гейты = ширина ист/вых.
  var NODE_H = 140;
  var FIXED_W = 86;  // ист/вых: поуже (примерно 1.7x относительно старого вида)
  var GATE_W = 86;   // логические блоки тоже такие же по ширине
  var BOARD_PAD_LR = 110;
  var GATE_GAP = 12;

  // ====== STATE ======
  var state = {
    level: LEVELS[0],

    nodes: [],   // gate nodes only
    wires: [],   // {id, from:{nodeId,port}, to:{nodeId,port}}
    nextId: 1,
    nextWireId: 1,

    // connecting
    connecting: null,
    tempPath: null,

    // DnD fix: keep current gate type here
    dragGateType: null,

    // floors line (2 этажа)
    floorsLine: null,

    // level timer (starts when first gate appears)
    levelStartedAt: null,
    levelTimerInt: null,

    // sim
    sim: {
      running: false,
      paused: false,
      startedAt: null, // simulation start moment (not the level timer)
      timerInt: null,
      stepInt: null,
      stepMs: 450,
      iterIndex: 0,
      iterations: [],
      finished: false
    },

    hintShown: false
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    levelsList = document.getElementById("levelsList");
    levelTitle = document.getElementById("levelTitle");
    levelTarget = document.getElementById("levelTarget");
    levelTask = document.getElementById("levelTask");
    hintBtn = document.getElementById("hintBtn");

    board = document.getElementById("board");
    workspace = document.getElementById("workspace");
    dropHint = document.getElementById("dropHint");
    srcPortsEl = document.getElementById("srcPorts");
    outPortsEl = document.getElementById("outPorts");
    wiresSvg = document.getElementById("wiresSvg");

    waveExpected = document.getElementById("waveExpected");
    waveActual = document.getElementById("waveActual");

    playBtn = document.getElementById("playBtn");
    pauseBtn = document.getElementById("pauseBtn");
    stopBtn = document.getElementById("stopBtn");
    truthBtn = document.getElementById("truthBtn");
    resultLine = document.getElementById("resultLine");
    timeLine = document.getElementById("timeLine");

    truthModal = document.getElementById("truthModal");
    truthBody = document.getElementById("truthBody");

    if (!levelsList || !board) return;

    ensureFloorsLine();
    ensureRestartButton();

    renderLevels();
    bindPaletteDnD();
    bindBoardDnD();
    bindGlobalPointerForWires();
    bindControls();
    bindModal();

    selectLevel(state.level.id);

    window.addEventListener("resize", function () {
      redrawWires();
      redrawWave();
    });
  }

  // ====== FLOORS LINE ======
  function ensureFloorsLine() {
    var line = board.querySelector(".trainer-v2__floors");
    if (!line) {
      line = document.createElement("div");
      line.className = "trainer-v2__floors";
      line.hidden = true;
      board.appendChild(line);
    }
    state.floorsLine = line;
  }

  function showFloorsLine(show) {
    if (!state.floorsLine) return;
    state.floorsLine.hidden = !show;
  }

  // ====== RESTART BUTTON (auto) ======
  function ensureRestartButton() {
    restartBtn = document.getElementById("restartBtn");
    if (restartBtn) return;

    // Вставляем кнопку “Начать заново” рядом с play/pause/stop, если контейнер есть
    var controlsTop = board.closest(".trainer-v2") ?
      document.querySelector(".trainer-v2__controls-top") : null;

    if (!controlsTop) {
      // fallback: добавим рядом с playBtn
      controlsTop = playBtn && playBtn.parentNode ? playBtn.parentNode : null;
    }

    if (!controlsTop) return;

    restartBtn = document.createElement("button");
    restartBtn.type = "button";
    restartBtn.id = "restartBtn";
    restartBtn.className = "trainer-v2__btn trainer-v2__btn--restart";
    restartBtn.title = "Начать заново";
    restartBtn.innerHTML = "⟲";

    // вставим первым (до play)
    if (controlsTop.firstChild) controlsTop.insertBefore(restartBtn, controlsTop.firstChild);
    else controlsTop.appendChild(restartBtn);

    restartBtn.addEventListener("click", function () {
      restartLevel();
    });
  }

  function restartLevel() {
    // Сбрасываем схему + таймер уровня + симуляцию
    stopSimulation(true);
    stopLevelTimer(true);
    resetCircuit();
    resetSimulationUI();
    primeExpectedWave();
    resultLine.textContent = "Результат: —";
    timeLine.textContent = "Время: 00:00";
  }

  // ====== LEVEL TIMER ======
  function startLevelTimerIfNeeded() {
    if (state.levelStartedAt != null) return;
    state.levelStartedAt = Date.now();

    if (state.levelTimerInt) clearInterval(state.levelTimerInt);
    state.levelTimerInt = setInterval(function () {
      if (state.levelStartedAt == null) return;
      var ms = Date.now() - state.levelStartedAt;
      timeLine.textContent = "Время: " + fmtTime(ms);
    }, 200);
  }

  function stopLevelTimer(hardReset) {
    if (state.levelTimerInt) { clearInterval(state.levelTimerInt); state.levelTimerInt = null; }
    if (hardReset) state.levelStartedAt = null;
  }

  function getLevelElapsedMs() {
    if (state.levelStartedAt == null) return 0;
    return Date.now() - state.levelStartedAt;
  }

  // ====== LEVELS UI ======
  function renderLevels() {
    levelsList.innerHTML = "";

    LEVELS.forEach(function (lvl) {
      var li = document.createElement("li");
      li.className = "trainer-v2__level";
      li.setAttribute("data-level", lvl.id);

      var title = (lvl.num != null ? (lvl.num + " — " + lvl.name) : lvl.name);

      // ВАЖНО: в списке уровней не светим целевую функцию. Только задача.
      li.innerHTML =
        '<div>' +
          '<div class="trainer-v2__level-title">' + escapeHtml(title) + '</div>' +
          '<div class="trainer-v2__level-meta">' +
  '<div class="trainer-v2__level-mini">Входов: ' + lvl.inputs.length +
  ' • Итераций: ' + Math.pow(2, lvl.inputs.length) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="trainer-v2__level-right">' +
          '<div class="trainer-v2__level-status" data-status="pending">Не пройден</div>' +
          '<div class="trainer-v2__level-best" data-best="' + lvl.id + '">Лучшее время: —</div>' +
        '</div>';

      li.addEventListener("click", function () {
        selectLevel(lvl.id);
      });

      levelsList.appendChild(li);
    });

    updateBestTimesUI();
    markDoneFromStorage();
  }

  function selectLevel(id) {
    var lvl = LEVELS.find(function (x) { return x.id === id; });
    if (!lvl) return;

    state.level = lvl;
    state.hintShown = false;

    Array.prototype.forEach.call(levelsList.children, function (li) {
      li.classList.toggle("trainer-v2__level--active", li.getAttribute("data-level") === id);
    });

    var headTitle = (lvl.num != null ? ("Уровень " + lvl.num + " — " + lvl.name) : lvl.name);
    levelTitle.textContent = headTitle;
    levelTask.textContent = lvl.task;

    levelTarget.textContent = "скрыто";
    hintBtn.textContent = "подсказка";

    stopLevelTimer(true);
    resetCircuit();
    renderFixedPorts();
    resetSimulationUI();

    // диаграмма должна быть видна сразу
    primeExpectedWave();

    hintBtn.onclick = function () {
      state.hintShown = !state.hintShown;
      levelTarget.textContent = state.hintShown ? lvl.targetExpr : "скрыто";
      hintBtn.textContent = state.hintShown ? "скрыть" : "подсказка";
    };
  }

  function renderFixedPorts() {
    srcPortsEl.innerHTML = "";
    outPortsEl.innerHTML = "";

    state.level.inputs.forEach(function (name, idx) {
      srcPortsEl.appendChild(makePortEl({
        nodeId: "src",
        port: idx,
        io: "out",
        label: name,
        isGateOut: false
      }));
    });

    state.level.outputs.forEach(function (name, idx) {
      outPortsEl.appendChild(makePortEl({
        nodeId: "out",
        port: idx,
        io: "in",
        label: name,
        isGateOut: false
      }));
    });
  }

  // ====== RESET ======
  function resetCircuit() {
    state.nodes = [];
    state.wires = [];
    state.nextId = 1;
    state.nextWireId = 1;

    // clear gate nodes only
    while (workspace.firstChild) workspace.removeChild(workspace.firstChild);
    workspace.appendChild(dropHint);

    dropHint.hidden = false;
    showFloorsLine(false);

    stopSimulation(true);
    redrawAll();
  }

  // ====== PALETTE DND ======
  function bindPaletteDnD() {
    var chips = document.querySelectorAll(".trainer-v2__chip");
    Array.prototype.forEach.call(chips, function (btn) {
      btn.addEventListener("dragstart", function (e) {
        var type = btn.getAttribute("data-gate") || "";
        state.dragGateType = type;
        e.dataTransfer.effectAllowed = "copy";
        try { e.dataTransfer.setData("text/plain", type); } catch (_) {}
      });

      btn.addEventListener("dragend", function () {
        state.dragGateType = null;
        board.classList.remove("trainer-v2__board--drag");
      });
    });
  }

  // ====== BOARD DND ======
  function bindBoardDnD() {
  workspace.addEventListener("dragover", function (e) {
    if (!state.dragGateType) return;
    e.preventDefault();
    board.classList.add("trainer-v2__board--drag");
  });

  workspace.addEventListener("dragleave", function () {
    board.classList.remove("trainer-v2__board--drag");
  });

  workspace.addEventListener("drop", function (e) {
    var type = state.dragGateType;
    if (!type) return;

    e.preventDefault();
    board.classList.remove("trainer-v2__board--drag");
    state.dragGateType = null;

    var rect = board.getBoundingClientRect();
    addGateNode(type, e.clientX - rect.left, e.clientY - rect.top);
  });
  }

  function boardLinesY() {
  var boardRect = board.getBoundingClientRect();

  var srcNode = board.querySelector(".node--src");
  var outNode = board.querySelector(".node--out");

  // fallback, если вдруг DOM еще не готов
  if (!srcNode || !outNode) {
    var h = board.clientHeight;
    return {
      top: Math.round(h * 0.25 - NODE_H / 2),
      bottom: Math.round(h * 0.75 - NODE_H / 2)
    };
  }

  var srcRect = srcNode.getBoundingClientRect();
  var outRect = outNode.getBoundingClientRect();

  return {
    top: Math.round((srcRect.top - boardRect.top) + srcRect.height / 2 - NODE_H / 2),
    bottom: Math.round((outRect.top - boardRect.top) + outRect.height / 2 - NODE_H / 2)
  };
}

  
  function addGateNode(type, x, y) {
  if (!GATE_IMPL[type]) return;
  if (state.sim.running) return;

  startLevelTimerIfNeeded();

  const lines = boardLinesY();

  // определяем этаж по Y мыши
  const floorY = Math.abs(y - lines.top) < Math.abs(y - lines.bottom)
    ? lines.top
    : lines.bottom;

  const node = {
    id: "G" + (state.nextId++),
    kind: "gate",
    type: type,
    x: clamp(x - GATE_W / 2, BOARD_PAD_LR, board.clientWidth - BOARD_PAD_LR - GATE_W),
    y: floorY,
    ins: gateInCount(type),
    outs: 1
  };

  resolveGateCollision(node);
  state.nodes.push(node);

  renderGateNode(node);

  dropHint.hidden = true;
  showFloorsLine(true);
  redrawAll();
}

  function resolveGateCollision(node) {
  const padding = 12;
  let moved = true;

  while (moved) {
    moved = false;
    for (const other of state.nodes) {
      if (other === node) continue;
      if (other.y !== node.y) continue;

      const overlap =
        node.x < other.x + GATE_W + padding &&
        node.x + GATE_W + padding > other.x;

      if (overlap) {
        node.x = other.x + GATE_W + padding;
        moved = true;
      }
    }
  }
}


  function renderGateNode(node) {
    // Если уже отрендерен — не плодим
    var old = workspace.querySelector('[data-node="' + cssEscape(node.id) + '"]');
    if (old) return;

    var el = document.createElement("div");
    el.className = "node node--gate";
    el.setAttribute("data-node", node.id);
    el.style.left = node.x + "px";
    el.style.top = node.y + "px";

    var title = document.createElement("div");
    title.className = "node__title";
    title.textContent = node.type;

    var ports = document.createElement("div");
    ports.className = "node__ports node__ports--gate";

    var ins = document.createElement("div");
    ins.className = "node__side node__side--in";

    for (var i = 0; i < node.ins; i++) {
      ins.appendChild(makePortEl({ nodeId: node.id, port: i, io: "in", label: "", isGateOut: false }));
    }

    // Выход снизу, выделенный, с буквой “В”
    var outBottom = document.createElement("div");
    outBottom.className = "node__out-bottom";
    outBottom.appendChild(makePortEl({
      nodeId: node.id,
      port: 0,
      io: "out",
      label: "",
      isGateOut: true
    }));

    ports.appendChild(ins);

    var del = document.createElement("button");
    del.type = "button";
    del.className = "node__del";
    del.innerHTML = "&times;";
    del.addEventListener("click", function () {
      if (state.sim.running) return;
      deleteNode(node.id);
    });

    el.appendChild(title);
    el.appendChild(del);
    el.appendChild(ports);
    el.appendChild(outBottom);
    workspace.appendChild(el);
  }

  function deleteNode(nodeId) {
    state.nodes = state.nodes.filter(function (n) { return n.id !== nodeId; });
    state.wires = state.wires.filter(function (w) {
      return w.from.nodeId !== nodeId && w.to.nodeId !== nodeId;
    });

    var el = workspace.querySelector('[data-node="' + cssEscape(nodeId) + '"]');
    if (el) el.remove();

    if (!state.nodes.length) {
      dropHint.hidden = false;
      showFloorsLine(false);
      // ВАЖНО: таймер не сбрасываем. Он продолжает идти, как ты просила.
    } else {
    }

    redrawAll();
  }

  // ====== PORTS / WIRES ======
  function makePortEl(cfg) {
    var wrap = document.createElement("div");
    wrap.className = "port";
    wrap.setAttribute("data-node", cfg.nodeId);
    wrap.setAttribute("data-port", String(cfg.port));
    wrap.setAttribute("data-io", cfg.io);

    var dot = document.createElement("div");
    dot.className = "port__dot";

    if (cfg.isGateOut) {
      dot.classList.add("port__dot--gateout");
      dot.textContent = "В";
    }

    wrap.appendChild(dot);

    if (cfg.label) {
      var lab = document.createElement("div");
      lab.className = "port__label";
      lab.textContent = cfg.label;
      wrap.appendChild(lab);
    }

    // ВАЖНО: старт соединения должен работать со ВСЕХ out-портов (и ист, и гейт)
    // Раньше у тебя это было только на dot и местами “не ловилось”.
    dot.addEventListener("pointerdown", function (e) {
  if (state.sim.running) return;

  e.preventDefault();
  e.stopPropagation();

  // 1) Обычное соединение: тянем ИЗ out-порта
  if (cfg.io === "out") {
    state.connecting = {
      fromEl: dot,
      from: { nodeId: cfg.nodeId, port: cfg.port }
    };
    ensureTempPath();
    return;
  }

  // 2) "Удаление/перетаскивание конца": тянем ИЗ того, кто был подключен к этому IN
  //    Если к этому входу уже приходит провод — выдергиваем его и начинаем перетаскивание.
  if (cfg.io === "in") {
    var toNode = cfg.nodeId;
    var toPort = cfg.port;

    var idx = -1;
    for (var i = 0; i < state.wires.length; i++) {
      var w = state.wires[i];
      if (w.to.nodeId === toNode && w.to.port === toPort) { idx = i; break; }
    }
    if (idx === -1) return; // нечего удалять/перетаскивать

    var oldWire = state.wires[idx];
    // удаляем провод сразу (если отпустишь в пустоте — он уже удалён)
    state.wires.splice(idx, 1);

    // начинаем тянуть новый "конец" от старого источника
    state.connecting = {
      fromEl: findPortDot(oldWire.from.nodeId, "out", oldWire.from.port),
      from: { nodeId: oldWire.from.nodeId, port: oldWire.from.port }
    };

    ensureTempPath();
    redrawAll();
  }
});



    wrap.addEventListener("pointerup", function (e) {
      if (!state.connecting) return;
      if (state.sim.running) return;

      e.preventDefault();
      e.stopPropagation();

      var io = wrap.getAttribute("data-io");
      if (io !== "in") {
        cancelTempWire();
        return;
      }

      var toNode = wrap.getAttribute("data-node");
      var toPort = parseInt(wrap.getAttribute("data-port"), 10) || 0;

      tryConnect(state.connecting.from, { nodeId: toNode, port: toPort });
      cancelTempWire();
      redrawAll();
    });

    return wrap;
  }

  function tryConnect(from, to) {
    if (!from || !to) return;
    if (to.nodeId === from.nodeId) return;

    // вход может иметь только 1 провод
    state.wires = state.wires.filter(function (w) {
      return !(w.to.nodeId === to.nodeId && w.to.port === to.port);
    });

    state.wires.push({
      id: "W" + (state.nextWireId++),
      from: from,
      to: to
    });
  }

  function bindGlobalPointerForWires() {
    window.addEventListener("pointermove", function (e) {
      if (!state.connecting) return;
      redrawTempWire(e.clientX, e.clientY);
    });

    window.addEventListener("pointerup", function (e) {
  if (!state.connecting) return;

  var el = e.target;

  // если отпустили НЕ на входном порте — считаем это удалением
  if (
    !el ||
    !el.closest ||
    !el.closest('.port[data-io="in"]')
  ) {
    cancelTempWire();
    return;
  }

  // если на входе — соединение уже обработано в makePortEl
});

  }

  function ensureTempPath() {
    if (state.tempPath) return;
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("class", "wire wire--temp");
    wiresSvg.appendChild(p);
    state.tempPath = p;
  }

  function redrawTempWire(clientX, clientY) {
    if (!state.connecting || !state.tempPath) return;

    var a = centerOfDot(state.connecting.fromEl);
    var b = { x: clientX, y: clientY };

    var rect = wiresSvg.getBoundingClientRect();
    b.x -= rect.left;
    b.y -= rect.top;

    state.tempPath.setAttribute("d", bezier(a.x, a.y, b.x, b.y));
  }

  function cancelTempWire() {
    state.connecting = null;
    if (state.tempPath) {
      state.tempPath.remove();
      state.tempPath = null;
    }
  }

  function redrawAll() {
    redrawWires();
    redrawWave();
  }

  function redrawWires() {
    var temp = state.tempPath;

    wiresSvg.innerHTML = "";
    if (temp) wiresSvg.appendChild(temp);

    wiresSvg.setAttribute("width", board.clientWidth);
    wiresSvg.setAttribute("height", board.clientHeight);

    state.wires.forEach(function (w) {
      var fromDot = findPortDot(w.from.nodeId, "out", w.from.port);
      var toDot = findPortDot(w.to.nodeId, "in", w.to.port);
      if (!fromDot || !toDot) return;

      var a = centerOfDot(fromDot);
      var b = centerOfDot(toDot);

      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "wire");
      path.setAttribute("data-wire-id", w.id);
      path.setAttribute("d", bezier(a.x, a.y, b.x, b.y));

      // dblclick удаляет провод (мы включили pointer-events в CSS для path)
      path.addEventListener("dblclick", function () {
        if (state.sim.running) return;
        var id = path.getAttribute("data-wire-id");
        state.wires = state.wires.filter(function (x) { return x.id !== id; });
        redrawAll();
      });

      wiresSvg.appendChild(path);
    });
  }

  function findPortDot(nodeId, io, port) {
    if (nodeId === "src") {
      return srcPortsEl.querySelector('.port[data-node="src"][data-io="out"][data-port="' + port + '"] .port__dot');
    }
    if (nodeId === "out") {
      return outPortsEl.querySelector('.port[data-node="out"][data-io="in"][data-port="' + port + '"] .port__dot');
    }
    var nodeEl = workspace.querySelector('[data-node="' + cssEscape(nodeId) + '"]');
    if (!nodeEl) return null;
    return nodeEl.querySelector('.port[data-node="' + cssEscape(nodeId) + '"][data-io="' + io + '"][data-port="' + port + '"] .port__dot');
  }

  function centerOfDot(dotEl) {
    var svgRect = wiresSvg.getBoundingClientRect();
    var r = dotEl.getBoundingClientRect();
    return {
      x: (r.left + r.width / 2) - svgRect.left,
      y: (r.top + r.height / 2) - svgRect.top
    };
  }

  function bezier(x1, y1, x2, y2) {
    var dx = Math.max(40, Math.abs(x2 - x1) * 0.45);
    var c1x = x1 + dx;
    var c1y = y1;
    var c2x = x2 - dx;
    var c2y = y2;
    return "M " + x1 + " " + y1 + " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + x2 + " " + y2;
  }

  // ====== SIMULATION ======
  function bindControls() {
    playBtn.addEventListener("click", function () {
      if (state.sim.running && state.sim.paused) {
        resumeSimulation();
        return;
      }
      if (state.sim.running) return;
      startSimulation();
    });

    pauseBtn.addEventListener("click", function () {
      if (!state.sim.running) return;
      if (state.sim.paused) return;
      pauseSimulation();
    });

    stopBtn.addEventListener("click", function () {
      stopSimulation(false);
    });

    truthBtn.addEventListener("click", function () {
      if (!state.sim.finished) return;
      openTruthModal();
    });

    if (restartBtn) {
      // уже повешено в ensureRestartButton
    }
  }

  function resetSimulationUI() {
    resultLine.textContent = "Результат: —";
    timeLine.textContent = "Время: 00:00";
    truthBtn.disabled = true;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    playBtn.textContent = "▶";
  }

  function buildIterationsForLevel() {
    var names = state.level.inputs.slice();
    var total = Math.pow(2, names.length);
    var it = [];

    for (var mask = 0; mask < total; mask++) {
      var v = {};
      for (var i = 0; i < names.length; i++) {
        v[names[i]] = (mask >> (names.length - i - 1)) & 1;
      }
      it.push({ inputs: v, expected: state.level.func(v), actual: 0, ok: false });
    }
    return it;
  }

  function primeExpectedWave() {
    var it = buildIterationsForLevel();
    state.sim.iterations = it;
    state.sim.iterIndex = 0;
    state.sim.finished = false;
    redrawWave();
  }

  function startSimulation() {
    // Нельзя “пройти” уровень вообще без логических блоков.
    if (!state.nodes.length) {
      resultLine.textContent = "Результат: ошибка (добавь хотя бы один логический блок)";
      return;
    }

    if (!hasAnyOutConnection()) {
      resultLine.textContent = "Результат: ошибка (нет подключения к выходу)";
      return;
    }

    state.sim.running = true;
    state.sim.paused = false;
    state.sim.finished = false;
    state.sim.iterIndex = 0;
    state.sim.iterations = buildIterationsForLevel();
    state.sim.startedAt = Date.now();

    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    truthBtn.disabled = true;

    resultLine.textContent = "Результат: выполняется…";

    if (state.sim.timerInt) clearInterval(state.sim.timerInt);
    state.sim.timerInt = setInterval(function () {
      if (!state.sim.running || state.sim.paused) return;
      // Во время симуляции показываем ТАЙМЕР УРОВНЯ, а не симуляции.
      var ms = getLevelElapsedMs();
      timeLine.textContent = "Время: " + fmtTime(ms);
    }, 200);

    tickStep();
    if (state.sim.stepInt) clearInterval(state.sim.stepInt);
    state.sim.stepInt = setInterval(function () {
      if (!state.sim.running || state.sim.paused) return;
      tickStep();
    }, state.sim.stepMs);
  }

  function pauseSimulation() {
    state.sim.paused = true;
    pauseBtn.disabled = true;
    resultLine.textContent = "Результат: пауза";
  }

  function resumeSimulation() {
    if (!state.sim.running) return;
    state.sim.paused = false;
    pauseBtn.disabled = false;
    resultLine.textContent = "Результат: выполняется…";
  }

  function stopSimulation(hardReset) {
    state.sim.running = false;
    state.sim.paused = false;

    if (state.sim.timerInt) { clearInterval(state.sim.timerInt); state.sim.timerInt = null; }
    if (state.sim.stepInt) { clearInterval(state.sim.stepInt); state.sim.stepInt = null; }

    pauseBtn.disabled = true;
    stopBtn.disabled = true;

    if (hardReset) {
      state.sim.finished = false;
      state.sim.iterations = [];
      state.sim.iterIndex = 0;
      truthBtn.disabled = true;
      redrawWave();
      return;
    }

    if (!state.sim.finished) {
      resultLine.textContent = "Результат: остановлено";
    }
  }

  function tickStep() {
    var i = state.sim.iterIndex;
    if (i >= state.sim.iterations.length) {
      finishSimulation();
      return;
    }

    var row = state.sim.iterations[i];
    var actual = evaluateCircuit(row.inputs);

row.actual = actual.valid ? actual.value : 0;
row.ok = actual.valid ? (row.actual === row.expected) : false;

row.values = actual.values || {};


    state.sim.iterIndex++;
    redrawWave();
  }

  function finishSimulation() {
    state.sim.finished = true;
    state.sim.running = false;
    state.sim.paused = false;

    if (state.sim.stepInt) { clearInterval(state.sim.stepInt); state.sim.stepInt = null; }
    if (state.sim.timerInt) { clearInterval(state.sim.timerInt); state.sim.timerInt = null; }

    pauseBtn.disabled = true;
    stopBtn.disabled = true;

    var allOk = state.sim.iterations.every(function (r) { return r.ok; });
    var ms = getLevelElapsedMs();

    if (allOk) {
      resultLine.textContent = "Результат: успех";
      saveBestTime(state.level.id, ms);
      markLevelDone(state.level.id);
      updateBestTimesUI();
    } else {
      resultLine.textContent = "Результат: ошибка";
    }

    timeLine.textContent = "Время: " + fmtTime(ms);
    truthBtn.disabled = false;
  }

  function hasAnyOutConnection() {
    return state.wires.some(function (w) { return w.to.nodeId === "out"; });
  }

  // ====== CIRCUIT EVAL ======
  function evaluateCircuit(inputMap) {
    var inMap = {};
    state.wires.forEach(function (w) {
      inMap[w.to.nodeId + ":" + w.to.port] = w.from;
    });

    var values = {};
    state.level.inputs.forEach(function (name, idx) {
      values["src:" + idx] = inputMap[name] || 0;
    });

    var remaining = state.nodes.slice();
    var safety = 0;

    function getFromRef(ref) {
      if (ref.nodeId === "src") return values["src:" + ref.port];
      if (ref.nodeId === "out") return undefined;
      return values[ref.nodeId];
    }

    while (remaining.length && safety < 400) {
      safety++;
      var progressed = false;

      for (var i = 0; i < remaining.length; i++) {
        var n = remaining[i];
        var need = n.ins;

        var aRef = inMap[n.id + ":0"];
        var bRef = inMap[n.id + ":1"];

        if (!aRef) continue;
        var aVal = getFromRef(aRef);
        if (aVal === undefined) continue;

        if (need === 2) {
          if (!bRef) continue;
          var bVal = getFromRef(bRef);
          if (bVal === undefined) continue;
          values[n.id] = GATE_IMPL[n.type](aVal, bVal);
        } else {
          values[n.id] = GATE_IMPL[n.type](aVal);
        }

        remaining.splice(i, 1);
        i--;
        progressed = true;
      }

      if (!progressed) break;
    }

    var outRef = inMap["out:0"];
    if (!outRef) return { valid: false, reason: "Выход не подключён" };
    var outVal = getFromRef(outRef);
    if (outVal === undefined) return { valid: false, reason: "Выход не имеет значения" };

    return { valid: true, value: outVal, values: values };
  }

  // ====== WAVES DRAW ======
  function redrawWave() {
    var it = state.sim.iterations || [];

    var exp = it.map(function (r) { return r.expected; });
    var act = it.map(function (r) { return r.actual; });

    // expected — показываем полностью всегда
    var expActive = (state.sim.running || state.sim.finished) ? state.sim.iterIndex : exp.length;
    var actActive = state.sim.iterIndex;

    drawWaveSvg(waveExpected, exp, expActive, it, "expected");
    drawWaveSvg(waveActual, act, actActive, it, "actual");
  }

  // Убрали “0/1” справа/слева — вместо этого рисуем точки-вершины с подсказкой inputs.
  function drawWaveSvg(svg, arr, activeCount, iterations, mode) {
    svg.innerHTML = "";
    var w = svg.clientWidth || 600;
    var h = svg.clientHeight || 46;

    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("preserveAspectRatio", "none");

    if (!arr || !arr.length) {
      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", "0");
      line.setAttribute("y1", String(h / 2));
      line.setAttribute("x2", String(w));
      line.setAttribute("y2", String(h / 2));
      line.setAttribute("class", "wave wave--empty");
      svg.appendChild(line);
      return;
    }

    var n = arr.length;
    var step = w / n;

    var y0 = h * 0.75;
    var y1 = h * 0.25;

    var d = "";
    var x = 0;

    for (var i = 0; i < n; i++) {
      var v = arr[i] ? 1 : 0;
      var y = v ? y1 : y0;

      if (i === 0) d += "M " + x + " " + y;
      else d += " L " + x + " " + y;

      x = (i + 1) * step;
      d += " L " + x + " " + y;
    }

    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "wave");
    svg.appendChild(path);

    // точки-вершины
    for (var k = 0; k < n; k++) {
      var vx = (k + 0.5) * step;
      var vv = arr[k] ? 1 : 0;
      var vy = vv ? y1 : y0;

      var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
c.setAttribute("cx", String(vx));
c.setAttribute("cy", String(vy));
c.setAttribute("r", "6");
c.setAttribute("class", "wave__pt");

var tip = iterationLabel(iterations, k);
if (tip) {
  // Нормальный tooltip для SVG
  var t = document.createElementNS("http://www.w3.org/2000/svg", "title");
  t.textContent = tip;
  c.appendChild(t);
}

svg.appendChild(c);

    }

    var done = Math.max(0, Math.min(activeCount, n));
    var mask = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    mask.setAttribute("x", String(done * step));
    mask.setAttribute("y", "0");
    mask.setAttribute("width", String(w - done * step));
    mask.setAttribute("height", String(h));
    mask.setAttribute("class", "wave__mask");
    svg.appendChild(mask);
  }

  function iterationLabel(iterations, idx) {
    if (!iterations || !iterations[idx] || !iterations[idx].inputs) return "";
    var inputs = iterations[idx].inputs;
    var keys = Object.keys(inputs);
    keys.sort(); // стабильный порядок
    return keys.map(function (k) { return k + "=" + (inputs[k] ? 1 : 0); }).join(" ");
  }

  // ====== TRUTH MODAL ======
  function bindModal() {
    truthModal.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.getAttribute("data-close") === "1") closeTruthModal();
    });

    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !truthModal.hidden) closeTruthModal();
    });
  }

  function openTruthModal() {
    var names = state.level.inputs.slice();
    truthBody.innerHTML = "";

    var table = document.createElement("table");
    table.className = "truthv2";

    var thead = document.createElement("thead");
    var trh = document.createElement("tr");

    names.forEach(function (n) {
      var th = document.createElement("th");
      th.textContent = n;
      trh.appendChild(th);
    });

    state.nodes.forEach(function (n) {
  var th = document.createElement("th");
  th.textContent = GATE_LABELS[n.type] || n.type;
  th.className = "truthv2__gate";
  trh.appendChild(th);
});

    var thE = document.createElement("th");
    thE.textContent = "ожид.";
    trh.appendChild(thE);

    var thA = document.createElement("th");
    thA.textContent = "факт.";
    trh.appendChild(thA);

    thead.appendChild(trh);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");

    state.sim.iterations.forEach(function (row) {
      var tr = document.createElement("tr");
      if (!row.ok) tr.classList.add("truthv2__bad");

      names.forEach(function (n) {
        var td = document.createElement("td");
        td.textContent = String(row.inputs[n] || 0);
        tr.appendChild(td);
      });

      state.nodes.forEach(function (n) {
  var td = document.createElement("td");
  td.textContent =
    row.values && row.values[n.id] !== undefined
      ? row.values[n.id]
      : "—";
  td.className = "truthv2__gate";
  tr.appendChild(td);
});


      var tdE = document.createElement("td");
      tdE.textContent = String(row.expected);
      tr.appendChild(tdE);

      var tdA = document.createElement("td");
      tdA.textContent = String(row.actual);
      tr.appendChild(tdA);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    truthBody.appendChild(table);
    truthModal.hidden = false;
  }

  function closeTruthModal() {
    truthModal.hidden = true;
  }

  // ====== PROGRESS / BEST TIME ======
  var STATS_KEY = "bat_trainer_stats_v2";

  function loadStats() {
    try {
      var raw = localStorage.getItem(STATS_KEY);
      if (!raw) return {};
      var p = JSON.parse(raw);
      return p && typeof p === "object" ? p : {};
    } catch (e) { return {}; }
  }

  function saveStats(stats) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
  }

  function saveBestTime(levelId, ms) {
    var stats = loadStats();
    var cur = stats[levelId];
    if (!cur || !cur.bestMs || ms < cur.bestMs) {
      stats[levelId] = { bestMs: ms, done: true };
    } else {
      stats[levelId].done = true;
    }
    saveStats(stats);
  }

  function updateBestTimesUI() {
    var stats = loadStats();
    var bestEls = document.querySelectorAll('[data-best]');
    Array.prototype.forEach.call(bestEls, function (el) {
      var id = el.getAttribute("data-best");
      var s = stats[id];
      el.textContent = (s && s.bestMs ? fmtTime(s.bestMs) : "—");
    });
  }

  function markDoneFromStorage() {
    var stats = loadStats();
    Object.keys(stats).forEach(function (id) {
      if (stats[id] && stats[id].done) markLevelDone(id);
    });
  }

  function markLevelDone(levelId) {
    var li = levelsList.querySelector('[data-level="' + cssEscape(levelId) + '"]');
    if (!li) return;
    var st = li.querySelector("[data-status]");
    if (st) {
      st.setAttribute("data-status", "done");
      st.textContent = "Пройден";
      st.classList.add("trainer-v2__level-status--done");
    }
  }

  // ====== UTIL ======
  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? "0" + m : "" + m) + ":" + (s < 10 ? "0" + s : "" + s);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // нормальный cssEscape, чтобы селекторы не ломались
  function cssEscape(s) {
    s = String(s);
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(s);
    return s.replace(/[^a-zA-Z0-9_\-]/g, function (ch) {
      return "\\" + ch;
    });
  }
  
})();
