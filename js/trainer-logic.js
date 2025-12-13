(function () {
  "use strict";

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
      func: function (v) { return v.A & v.B; }
    },
    {
      id: "level2",
      num: 2,
      name: "альтернативный доступ",
      task: "Достаточно активации любого из датчиков A или B.",
      targetExpr: "F = A ∨ B",
      inputs: ["A", "B"],
      outputs: ["F"],
      func: function (v) { return v.A | v.B; }
    },
    {
      id: "level3",
      num: 3,
      name: "запрет",
      task: "Система активна, если датчик A НЕ активен.",
      targetExpr: "F = ¬A",
      inputs: ["A"],
      outputs: ["F"],
      func: function (v) { return v.A ? 0 : 1; }
    },
    {
      id: "level4",
      num: 4,
      name: "доступ с ограничением",
      task: "A должен быть активен, а B — выключен.",
      targetExpr: "F = A ∧ ¬B",
      inputs: ["A", "B"],
      outputs: ["F"],
      func: function (v) { return v.A & (v.B ? 0 : 1); }
    },
    {
      id: "level5",
      num: 5,
      name: "аварийный режим",
      task: "Доступ разрешён, если A активен или аварийный сигнал C включён, но B выключен.",
      targetExpr: "F = (A ∨ C) ∧ ¬B",
      inputs: ["A", "B", "C"],
      outputs: ["F"],
      func: function (v) { return (v.A | v.C) & (v.B ? 0 : 1); }
    },
    {
      id: "level6",
      num: 6,
      name: "инвертированная безопасность",
      task: "Система блокируется только если оба датчика A и B активны одновременно.",
      targetExpr: "F = ¬(A ∧ B)",
      inputs: ["A", "B"],
      outputs: ["F"],
      func: function (v) { return (v.A & v.B) ? 0 : 1; }
    },
    {
      id: "level7",
      num: 7,
      name: "тихая зона",
      task: "Система активна только если ни один датчик не подаёт сигнал.",
      targetExpr: "F = ¬(A ∨ B)",
      inputs: ["A", "B"],
      outputs: ["F"],
      func: function (v) { return (v.A | v.B) ? 0 : 1; }
    },
    {
      id: "level8",
      num: 8,
      name: "ровно один",
      task: "Система активна, если активен ровно один из датчиков A или B.",
      targetExpr: "F = A ⊕ B",
      inputs: ["A", "B"],
      outputs: ["F"],
      func: function (v) { return v.A ^ v.B; }
    },
    {
      id: "level9",
      num: 9,
      name: "контроль несоответствия",
      task: "A и B должны различаться, но только если C выключен.",
      targetExpr: "F = (A ⊕ B) ∧ ¬C",
      inputs: ["A", "B", "C"],
      outputs: ["F"],
      func: function (v) { return (v.A ^ v.B) & (v.C ? 0 : 1); }
    },
    {
      id: "level10",
      num: 10,
      name: "двухфакторная защита",
      task: "Система срабатывает, если A и B активны, либо если включён аварийный канал C.",
      targetExpr: "F = (A ∧ B) ∨ C",
      inputs: ["A", "B", "C"],
      outputs: ["F"],
      func: function (v) { return (v.A & v.B) | v.C; }
    },
    {
      id: "level11",
      num: 11,
      name: "отказоустойчивость",
      task: "Доступ разрешён, если A и B активны, либо если аварийный канал C выключен.",
      targetExpr: "F = (A ∧ B) ∨ ¬C",
      inputs: ["A", "B", "C"],
      outputs: ["F"],
      func: function (v) { return (v.A & v.B) | (v.C ? 0 : 1); }
    },
    {
      id: "level12",
      num: 12,
      name: "паранойя",
      task: "A и B должны совпадать, либо C активен. Если D активен — доступ запрещён всегда.",
      targetExpr: "F = (¬(A ⊕ B) ∨ C) ∧ ¬D",
      inputs: ["A", "B", "C", "D"],
      outputs: ["F"],
      func: function (v) { return ((!(v.A ^ v.B) ? 1 : 0) | v.C) & (v.D ? 0 : 1); }
    }
  ];

  var levelsList, levelTitle, levelTarget, levelTask, hintBtn;
  var board, workspace, dropHint, srcPortsEl, outPortsEl, wiresSvg;
  var waveExpected, waveActual;
  var playBtn, pauseBtn, stopBtn, truthBtn, resultLine, timeLine;
  var truthModal, truthBody;
  var restartBtn;

  var NODE_H = 140;
  var FIXED_W = 86;
  var GATE_W = 86;
  var BOARD_PAD_LR = 110;
  var GATE_GAP = 12;

  var state = {
    level: LEVELS[0],

    nodes: [],
    wires: [],
    nextId: 1,
    nextWireId: 1,

    connecting: null,
    tempPath: null,
    wireCommitted: false,

    dragGhost: null,
    dragGateType: null,
    dragPointerId: null,
    dragSourceEl: null,

    floorsLine: null,

    levelStartedAt: null,
    levelTimerInt: null,

    sim: {
      running: false,
      paused: false,
      startedAt: null,
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

  function ensureRestartButton() {
    restartBtn = document.getElementById("restartBtn");
    if (restartBtn) return;

    var controlsTop = board.closest(".trainer-v2")
      ? document.querySelector(".trainer-v2__controls-top")
      : null;

    if (!controlsTop) {
      controlsTop = playBtn && playBtn.parentNode ? playBtn.parentNode : null;
    }

    if (!controlsTop) return;

    restartBtn = document.createElement("button");
    restartBtn.type = "button";
    restartBtn.id = "restartBtn";
    restartBtn.className = "trainer-v2__btn trainer-v2__btn--restart";
    restartBtn.title = "Начать заново";
    restartBtn.innerHTML = "⟲";

    if (controlsTop.firstChild) controlsTop.insertBefore(restartBtn, controlsTop.firstChild);
    else controlsTop.appendChild(restartBtn);

    restartBtn.addEventListener("click", function () {
      restartLevel();
    });
  }

  function restartLevel() {
    stopSimulation(true);
    stopLevelTimer(true);
    resetCircuit();
    resetSimulationUI();
    primeExpectedWave();
    resultLine.textContent = "Результат: —";
    timeLine.textContent = "Время: 00:00";
  }

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
    if (state.levelTimerInt) {
      clearInterval(state.levelTimerInt);
      state.levelTimerInt = null;
    }
    if (hardReset) state.levelStartedAt = null;
  }

  function getLevelElapsedMs() {
    if (state.levelStartedAt == null) return 0;
    return Date.now() - state.levelStartedAt;
  }

  function renderLevels() {
    levelsList.innerHTML = "";

    LEVELS.forEach(function (lvl) {
      var li = document.createElement("li");
      li.className = "trainer-v2__level";
      li.setAttribute("data-level", lvl.id);

      var title = (lvl.num != null ? (lvl.num + " — " + lvl.name) : lvl.name);

      li.innerHTML =
        '<div>' +
          '<div class="trainer-v2__level-title">' + escapeHtml(title) + '</div>' +
          '<div class="trainer-v2__level-meta">' +
            '<div class="trainer-v2__level-mini">Входов: ' + lvl.inputs.length +
            " • Итераций: " + Math.pow(2, lvl.inputs.length) + "</div>" +
          "</div>" +
        "</div>" +
        '<div class="trainer-v2__level-right">' +
          '<div class="trainer-v2__level-status" data-status="pending">Не пройден</div>' +
          '<div class="trainer-v2__level-best" data-best="' + lvl.id + '">Лучшее время: —</div>' +
        "</div>";

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

  function resetCircuit() {
    state.nodes = [];
    state.wires = [];
    state.nextId = 1;
    state.nextWireId = 1;

    while (workspace.firstChild) workspace.removeChild(workspace.firstChild);
    workspace.appendChild(dropHint);

    dropHint.hidden = false;
    showFloorsLine(false);

    stopSimulation(true);
    redrawAll();
  }

  function bindPaletteDnD() {
    var chips = document.querySelectorAll(".trainer-v2__chip");
    Array.prototype.forEach.call(chips, function (chip) {
      chip.style.touchAction = "none";

      chip.addEventListener("pointerdown", function (e) {
        if (state.sim.running) return;

        e.preventDefault();

        state.dragGateType = chip.getAttribute("data-gate");
        state.dragPointerId = e.pointerId;
        state.dragSourceEl = chip;

        try { chip.setPointerCapture(e.pointerId); } catch (err) {}

        var ghost = chip.cloneNode(true);
        ghost.style.position = "fixed";
        ghost.style.left = e.clientX + "px";
        ghost.style.top = e.clientY + "px";
        ghost.style.pointerEvents = "none";
        ghost.style.opacity = "0.85";
        ghost.style.zIndex = "9999";
        ghost.style.transform = "translate(-50%, -50%)";

        document.body.appendChild(ghost);
        state.dragGhost = ghost;

        board.classList.add("trainer-v2__board--drag");
      });
    });
  }

  function bindBoardDnD() {
    workspace.addEventListener("pointerdown", function () {
      if (!state.dragGateType) return;
    });
  }

  function boardLinesY() {
    var boardRect = board.getBoundingClientRect();

    var srcNode = board.querySelector(".node--src");
    var outNode = board.querySelector(".node--out");

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

    var lines = boardLinesY();

    var floorY = Math.abs(y - lines.top) < Math.abs(y - lines.bottom)
      ? lines.top
      : lines.bottom;

    var node = {
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
    var padding = 12;
    var moved = true;

    while (moved) {
      moved = false;
      for (var i = 0; i < state.nodes.length; i++) {
        var other = state.nodes[i];
        if (other === node) continue;
        if (other.y !== node.y) continue;

        var overlap =
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
    ins.setAttribute("data-count", node.ins);

    for (var i = 0; i < node.ins; i++) {
      ins.appendChild(makePortEl({ nodeId: node.id, port: i, io: "in", label: "", isGateOut: false }));
    }

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
    }

    redrawAll();
  }

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

    dot.addEventListener("pointerdown", function (e) {
      if (state.sim.running) return;

      e.preventDefault();
      e.stopPropagation();

      if (cfg.io === "out") {
        state.wireCommitted = false;
        try { dot.setPointerCapture(e.pointerId); } catch (err) {}

        state.connecting = {
          fromEl: dot,
          from: { nodeId: cfg.nodeId, port: cfg.port }
        };

        ensureTempPath();
        return;
      }

      if (cfg.io === "in") {
        var toNode = cfg.nodeId;
        var toPort = cfg.port;

        var idx = -1;
        for (var i = 0; i < state.wires.length; i++) {
          var w = state.wires[i];
          if (w.to.nodeId === toNode && w.to.port === toPort) { idx = i; break; }
        }
        if (idx === -1) return;

        var oldWire = state.wires[idx];
        state.wires.splice(idx, 1);

        state.wireCommitted = false;
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

      e.preventDefault();
      e.stopPropagation();

      if (wrap.getAttribute("data-io") === "in") {
        tryConnect(state.connecting.from, {
          nodeId: wrap.getAttribute("data-node"),
          port: parseInt(wrap.getAttribute("data-port"), 10) || 0
        });
        state.wireCommitted = true;
      }

      cancelTempWire();
      redrawAll();
    });

    return wrap;
  }

  function tryConnect(from, to) {
    if (!from || !to) return;
    if (to.nodeId === from.nodeId) return;

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
      if (state.dragGhost) {
        state.dragGhost.style.left = e.clientX + "px";
        state.dragGhost.style.top = e.clientY + "px";

        var rect = board.getBoundingClientRect();
        var inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;

        board.classList.toggle("trainer-v2__board--drag", inside);
      }

      if (state.connecting) {
        redrawTempWire(e.clientX, e.clientY);
      }
    });

    window.addEventListener("pointerup", function (e) {
      if (state.dragGhost && state.dragGateType) {
        var rect = board.getBoundingClientRect();

        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          addGateNode(
            state.dragGateType,
            e.clientX - rect.left,
            e.clientY - rect.top
          );
        }

        try {
          if (state.dragSourceEl && state.dragPointerId != null) {
            state.dragSourceEl.releasePointerCapture(state.dragPointerId);
          }
        } catch (err) {}

        state.dragGhost.remove();
        state.dragGhost = null;
        state.dragGateType = null;
        state.dragPointerId = null;
        state.dragSourceEl = null;

        board.classList.remove("trainer-v2__board--drag");
      }

      if (state.connecting && !state.wireCommitted) {
        cancelTempWire();
      }

      state.wireCommitted = false;
    });

    window.addEventListener("pointercancel", function () {
      if (state.dragGhost) {
        state.dragGhost.remove();
        state.dragGhost = null;
      }
      state.dragGateType = null;
      state.dragPointerId = null;
      state.dragSourceEl = null;
      board.classList.remove("trainer-v2__board--drag");

      if (state.connecting) cancelTempWire();
      state.wireCommitted = false;
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

  function redrawWave() {
    var it = state.sim.iterations || [];

    var exp = it.map(function (r) { return r.expected; });
    var act = it.map(function (r) { return r.actual; });

    var expActive = (state.sim.running || state.sim.finished) ? state.sim.iterIndex : exp.length;
    var actActive = state.sim.iterIndex;

    drawWaveSvg(waveExpected, exp, expActive, it, "expected");
    drawWaveSvg(waveActual, act, actActive, it, "actual");
  }

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
    keys.sort();
    return keys.map(function (k) { return k + "=" + (inputs[k] ? 1 : 0); }).join(" ");
  }

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

  var STATS_KEY = "bat_trainer_stats_v2";

  function loadStats() {
    try {
      var raw = localStorage.getItem(STATS_KEY);
      if (!raw) return {};
      var p = JSON.parse(raw);
      return p && typeof p === "object" ? p : {};
    } catch (e) {
      return {};
    }
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
    var bestEls = document.querySelectorAll("[data-best]");
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

  function cssEscape(s) {
    s = String(s);
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(s);
    return s.replace(/[^a-zA-Z0-9_\-]/g, function (ch) {
      return "\\" + ch;
    });
  }
})();
