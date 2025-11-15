(function () {
    // ---------- НАСТРОЙКИ ----------
    var ALL_INPUT_NAMES = ["A", "B", "C", "D", "E", "F"];
    var MAX_FREE_INPUTS = 6;
    var MAX_FREE_GATES = 10;

    var STATS_KEY = "bat_trainer_stats";

    // ---------- УРОВНИ ----------
    var LEVELS = [
        {
            id: "level1",
            title: "Уровень 1 — базовое И",
            story: "Дверь открывается, только если срабатывают оба датчика A и B.",
            targetExpr: "F = A ∧ B",
            inputs: ["A", "B"],
            maxInputs: 2,
            maxGates: 2,
            func: function (vars) {
                return vars.A & vars.B;
            }
        },
        {
            id: "level2",
            title: "Уровень 2 — охрана склада",
            story: "Склад открыт, если Анна предъявляет код A и охрана B не заблокировала доступ, или есть аварийный пропуск C.",
            targetExpr: "F = (A ∧ ¬B) ∨ C",
            inputs: ["A", "B", "C"],
            maxInputs: 3,
            maxGates: 3,
            func: function (vars) {
                var notB = vars.B ? 0 : 1;
                var aAndNotB = vars.A & notB;
                return aAndNotB | vars.C;
            }
        },
        {
            id: "level3",
            title: "Уровень 3 — дата-центр",
            story: "В дата-центр можно войти, если либо Анна, либо оператор запускают доступ (но не оба), и при этом аварийный датчик C молчит или Анна лично подтверждает вход.",
            targetExpr: "F = (A ⊕ B) ∧ (¬C ∨ A)",
            inputs: ["A", "B", "C"],
            maxInputs: 3,
            maxGates: 4,
            func: function (vars) {
                var xorAB = vars.A ^ vars.B;
                var notC = vars.C ? 0 : 1;
                var orPart = notC | vars.A;
                return xorAB & orPart;
            }
        }
    ];

    // ---------- ЛОГИЧЕСКИЕ БЛОКИ ----------
    var GATE_IMPL = {
        AND: function (a, b) { return a & b; },
        OR: function (a, b) { return a | b; },
        XOR: function (a, b) { return a ^ b; },
        NAND: function (a, b) { return (a & b) ? 0 : 1; },
        NOR: function (a, b) { return (a | b) ? 0 : 1; },
        NOT: function (a) { return a ? 0 : 1; }
    };

    // ---------- СОСТОЯНИЕ ----------
    var state = {
        mode: "levels",
        currentLevel: LEVELS[0],

        inputs: [],
        gates: [],
        nextGateId: 1,

        levelStarted: false,
        levelStartTime: null,
        levelTimerInterval: null,

        stats: loadStats()
    };

    // ---------- DOM ----------
    var root;
    var modeTabs;
    var panels;
    var levelItems;

    var modeLabel;
    var levelLabel;
    var targetExprLabel;
    var levelStoryEl;
    var hintBtn;
    var resultMessage;
    var truthTableContainer;

    var checkBtn;
    var resetBtn;
    var startLevelBtn;
    var timerLabel;

    var inputsContainer;
    var addInputBtn;

    var gatesContainer;
    var addGateBtn;
    var boardDropzone;
    var boardPlaceholder;
    var wiresList;

    var paletteItems;

    // drag&drop
    var draggedGateType = null;

    // ---------- ИНИЦИАЛИЗАЦИЯ ----------
    function init() {
        root = document.querySelector(".section--trainer");
        if (!root) return;

        modeTabs = root.querySelectorAll(".trainer-modes__tab");
        panels = root.querySelectorAll("[data-mode-panel]");
        levelItems = root.querySelectorAll(".level-list__item");

        modeLabel = root.querySelector("#trainerModeLabel");
        levelLabel = root.querySelector("#trainerLevelLabel");
        targetExprLabel = root.querySelector("#trainerTargetExpr");
        levelStoryEl = root.querySelector("#trainerLevelStory");
        hintBtn = root.querySelector("#toggleHintBtn");

        resultMessage = root.querySelector("#trainerResultMessage");
        truthTableContainer = root.querySelector("#trainerTruthTable");

        checkBtn = root.querySelector("#trainerCheckBtn");
        resetBtn = root.querySelector("#trainerResetBtn");
        startLevelBtn = root.querySelector("#startLevelBtn");
        timerLabel = root.querySelector("#timerLabel");

        inputsContainer = root.querySelector("#inputsContainer");
        addInputBtn = root.querySelector("#addInputBtn");

        gatesContainer = root.querySelector("#gatesContainer");
        addGateBtn = root.querySelector("#addGateBtn");
        boardDropzone = root.querySelector("#boardDropzone");
        boardPlaceholder = root.querySelector("#boardPlaceholder");

        wiresList = root.querySelector("#wiresList");

        paletteItems = root.querySelectorAll(".palette-item");

        // переключение режимов
        modeTabs.forEach(function (btn) {
            btn.addEventListener("click", function () {
                setMode(btn.getAttribute("data-mode"));
            });
        });

        // выбор уровня
        levelItems.forEach(function (item) {
            item.addEventListener("click", function () {
                var id = item.getAttribute("data-level-id");
                selectLevel(id);
            });
        });

        // входы
        addInputBtn.addEventListener("click", function () {
            addInput();
        });

        // блоки
        addGateBtn.addEventListener("click", function () {
            addGate(null);
        });

        // действия
        checkBtn.addEventListener("click", handleCheck);
        resetBtn.addEventListener("click", handleReset);

        if (startLevelBtn) {
            startLevelBtn.addEventListener("click", startLevel);
        }

        // подсказка (целевая функция)
        if (hintBtn) {
            hintBtn.addEventListener("click", function () {
                var hidden = targetExprLabel.classList.toggle("trainer-card__target--hidden");
                hintBtn.textContent = hidden ? "Показать подсказку" : "Скрыть подсказку";
            });
        }

        // drag&drop из палитры
        paletteItems.forEach(function (item) {
            item.addEventListener("dragstart", function (e) {
                draggedGateType = item.getAttribute("data-gate-type");
                try {
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData("text/plain", draggedGateType);
                } catch (err) { }
            });
            item.addEventListener("dragend", function () {
                draggedGateType = null;
            });
        });

        // дроп на доску (даже пустую)
        if (boardDropzone) {
            boardDropzone.addEventListener("dragover", function (e) {
                if (!draggedGateType) return;
                e.preventDefault();
                boardDropzone.classList.add("gate-slot--hover");
            });
            boardDropzone.addEventListener("dragleave", function () {
                boardDropzone.classList.remove("gate-slot--hover");
            });
            boardDropzone.addEventListener("drop", function (e) {
                if (!draggedGateType) return;
                e.preventDefault();
                boardDropzone.classList.remove("gate-slot--hover");
                addGate(draggedGateType);
            });
        }

        setMode("levels");
        selectLevel("level1");
    }

    // ---------- РЕЖИМЫ / УРОВНИ ----------
    function setMode(mode) {
        state.mode = mode;

        modeTabs.forEach(function (btn) {
            var m = btn.getAttribute("data-mode");
            btn.classList.toggle("trainer-modes__tab--active", m === mode);
        });

        panels.forEach(function (panel) {
            var m = panel.getAttribute("data-mode-panel");
            panel.hidden = m !== mode;
        });

        if (mode === "levels") {
            modeLabel.textContent = "Режим: уровни";
            checkBtn.disabled = !state.levelStarted;
            if (startLevelBtn) startLevelBtn.parentElement.parentElement.style.display = "";
        } else {
            modeLabel.textContent = "Режим: свободный";
            stopLevelTimer();
            state.levelStarted = false;
            checkBtn.disabled = false;
            if (startLevelBtn) startLevelBtn.parentElement.parentElement.style.display = "none";
        }

        initInputsForMode();
        resetCircuit();
        renderAll();
    }

    function selectLevel(id) {
        var level = LEVELS.find(function (l) { return l.id === id; });
        if (!level) return;

        state.currentLevel = level;

        levelItems.forEach(function (item) {
            item.classList.toggle(
                "level-list__item--active",
                item.getAttribute("data-level-id") === id
            );
        });

        levelLabel.textContent = level.title;
        targetExprLabel.textContent = "Целевая функция: " + level.targetExpr;
        levelStoryEl.textContent = level.story;

        // подсказку по умолчанию прячем
        targetExprLabel.classList.add("trainer-card__target--hidden");
        if (hintBtn) hintBtn.textContent = "Показать подсказку";

        stopLevelTimer();
        state.levelStarted = false;
        if (timerLabel) timerLabel.textContent = "Время: 00:00";
        if (checkBtn) checkBtn.disabled = true;

        initInputsForMode();
        resetCircuit();
        renderAll();
        updateBestTimeLabels();
    }

    // ---------- ВХОДЫ ----------
    function initInputsForMode() {
        if (state.mode === "levels") {
            state.inputs = state.currentLevel.inputs.map(function (name) {
                return { name: name, isRandom: false, value: 0 };
            });
            addInputBtn.disabled = true;
        } else {
            state.inputs = ALL_INPUT_NAMES.slice(0, 3).map(function (name) {
                return { name: name, isRandom: false, value: 0 };
            });
            addInputBtn.disabled = state.inputs.length >= MAX_FREE_INPUTS;
        }
        renderInputs();
    }

    function addInput() {
        if (state.mode === "levels") return;
        if (state.inputs.length >= MAX_FREE_INPUTS) return;

        var used = state.inputs.map(function (i) { return i.name; });
        var candidate = null;
        for (var i = 0; i < ALL_INPUT_NAMES.length; i++) {
            if (used.indexOf(ALL_INPUT_NAMES[i]) === -1) {
                candidate = ALL_INPUT_NAMES[i];
                break;
            }
        }
        if (!candidate) return;

        state.inputs.push({ name: candidate, isRandom: false, value: 0 });
        addInputBtn.disabled = state.inputs.length >= MAX_FREE_INPUTS;
        cleanInvalidConnections();
        renderInputs();
        renderGates();
        renderWires();
    }

    function removeInput(name) {
        if (state.mode === "levels") return;
        state.inputs = state.inputs.filter(function (i) { return i.name !== name; });
        addInputBtn.disabled = state.inputs.length >= MAX_FREE_INPUTS;
        cleanInvalidConnections();
        renderInputs();
        renderGates();
        renderWires();
    }

    function renderInputs() {
        inputsContainer.innerHTML = "";

        state.inputs.forEach(function (input) {
            var wrapper = document.createElement("div");
            wrapper.className = "field trainer-input-item";
            wrapper.setAttribute("data-input-name", input.name);

            var top = document.createElement("div");
            top.className = "trainer-input-item__top";

            var nameSpan = document.createElement("span");
            nameSpan.className = "trainer-input-item__name";
            nameSpan.textContent = input.name;

            var controls = document.createElement("div");
            controls.className = "trainer-input-item__controls";

            var randomLabel = document.createElement("label");
            randomLabel.className = "trainer-input-item__random";
            var randomCheckbox = document.createElement("input");
            randomCheckbox.type = "checkbox";
            randomCheckbox.checked = input.isRandom;
            randomCheckbox.disabled = state.mode === "levels";
            randomLabel.appendChild(randomCheckbox);
            randomLabel.appendChild(document.createTextNode(" rnd"));

            controls.appendChild(randomLabel);

            if (state.mode === "free") {
                var delBtn = document.createElement("button");
                delBtn.type = "button";
                delBtn.className = "trainer-input-item__delete";
                delBtn.innerHTML = "&times;";
                delBtn.addEventListener("click", function () {
                    removeInput(input.name);
                });
                controls.appendChild(delBtn);
            }

            top.appendChild(nameSpan);
            top.appendChild(controls);

            var select = document.createElement("select");
            select.className = "field__control input-var";
            select.disabled = input.isRandom;

            var opt0 = document.createElement("option");
            opt0.value = "0";
            opt0.textContent = "0";
            var opt1 = document.createElement("option");
            opt1.value = "1";
            opt1.textContent = "1";
            select.appendChild(opt0);
            select.appendChild(opt1);
            select.value = String(input.value);

            randomCheckbox.addEventListener("change", function () {
                input.isRandom = randomCheckbox.checked;
                select.disabled = input.isRandom;
            });

            select.addEventListener("change", function () {
                input.value = parseInt(select.value, 10) || 0;
            });

            wrapper.appendChild(top);
            wrapper.appendChild(select);
            inputsContainer.appendChild(wrapper);
        });
    }

    function getCurrentInputMap(useRandom) {
        var map = {};
        state.inputs.forEach(function (input) {
            if (input.isRandom && useRandom) {
                map[input.name] = Math.random() < 0.5 ? 0 : 1;
            } else {
                map[input.name] = input.value;
            }
        });
        return map;
    }

    // ---------- БЛОКИ ----------
    function addGate(forcedType) {
        if (state.mode === "levels" && state.gates.length >= state.currentLevel.maxGates) {
            resultMessage.textContent = "Достигнут лимит блоков для этого уровня.";
            return;
        }
        if (state.mode === "free" && state.gates.length >= MAX_FREE_GATES) {
            resultMessage.textContent = "Слишком много блоков в схеме.";
            return;
        }

        var gate = {
            id: "G" + state.nextGateId++,
            type: forcedType || "",
            in1: null,
            in2: null,
            isOutput: false
        };
        state.gates.push(gate);
        renderGates();
        renderWires();
    }

    function removeGate(id) {
        state.gates = state.gates.filter(function (g) { return g.id !== id; });
        cleanInvalidConnections();
        renderGates();
        renderWires();
    }

    function cleanInvalidConnections() {
        var validSources = state.inputs.map(function (i) { return i.name; });
        state.gates.forEach(function (g) {
            validSources.push(g.id);
        });

        state.gates.forEach(function (g) {
            if (g.in1 && validSources.indexOf(g.in1) === -1) g.in1 = null;
            if (g.in2 && validSources.indexOf(g.in2) === -1) g.in2 = null;
        });
    }

    function getSourcesForGateIndex(index) {
        var sources = state.inputs.map(function (i) { return i.name; });
        for (var i = 0; i < index; i++) {
            sources.push(state.gates[i].id);
        }
        return sources;
    }

    function renderGates() {
        gatesContainer.innerHTML = "";

        state.gates.forEach(function (gate, index) {
            var slot = document.createElement("div");
            slot.className = "gate-slot";
            slot.setAttribute("data-gate-id", gate.id);

            var header = document.createElement("div");
            header.className = "gate-slot__header";

            var nameSpan = document.createElement("span");
            nameSpan.className = "gate-slot__name";
            nameSpan.textContent = gate.id;

            var hintSpan = document.createElement("span");
            hintSpan.className = "gate-slot__hint";
            hintSpan.textContent = index === 0 ? "Первый блок" : "Блок #" + (index + 1);

            header.appendChild(nameSpan);
            header.appendChild(hintSpan);

            var delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "gate-slot__delete";
            delBtn.innerHTML = "&times;";
            delBtn.addEventListener("click", function () {
                removeGate(gate.id);
            });

            var typeField = document.createElement("label");
            typeField.className = "field";
            var typeLabel = document.createElement("span");
            typeLabel.className = "field__label";
            typeLabel.textContent = "Тип оператора";
            var typeSelect = document.createElement("select");
            typeSelect.className = "field__control gate-slot__type";

            var typeOptions = [
                { v: "", t: "Нет" },
                { v: "AND", t: "И (∧)" },
                { v: "OR", t: "ИЛИ (∨)" },
                { v: "XOR", t: "XOR (⊕)" },
                { v: "NOT", t: "НЕ (¬)" },
                { v: "NAND", t: "NAND" },
                { v: "NOR", t: "NOR" }
            ];
            typeOptions.forEach(function (opt) {
                var o = document.createElement("option");
                o.value = opt.v;
                o.textContent = opt.t;
                typeSelect.appendChild(o);
            });
            typeSelect.value = gate.type || "";

            typeSelect.addEventListener("change", function () {
                gate.type = typeSelect.value || "";
            });

            typeField.appendChild(typeLabel);
            typeField.appendChild(typeSelect);

            var row = document.createElement("div");
            row.className = "trainer__row";

            var in1Field = document.createElement("label");
            in1Field.className = "field";
            var in1Label = document.createElement("span");
            in1Label.className = "field__label";
            in1Label.textContent = "Вход 1";
            var in1Select = document.createElement("select");
            in1Select.className = "field__control gate-slot__in1";

            var in2Field = document.createElement("label");
            in2Field.className = "field";
            var in2Label = document.createElement("span");
            in2Label.className = "field__label";
            in2Label.textContent = "Вход 2";
            var in2Select = document.createElement("select");
            in2Select.className = "field__control gate-slot__in2";

            fillSourcesForGate(index, in1Select, in2Select, gate);

            in1Select.addEventListener("change", function () {
                gate.in1 = in1Select.value || null;
                renderWires();
            });

            in2Select.addEventListener("change", function () {
                gate.in2 = in2Select.value || null;
                renderWires();
            });

            in1Field.appendChild(in1Label);
            in1Field.appendChild(in1Select);

            in2Field.appendChild(in2Label);
            in2Field.appendChild(in2Select);

            row.appendChild(in1Field);
            row.appendChild(in2Field);

            var finalLabel = document.createElement("label");
            finalLabel.className = "gate-slot__final-label";
            var finalRadio = document.createElement("input");
            finalRadio.type = "radio";
            finalRadio.name = "finalGate";
            finalRadio.checked = gate.isOutput;
            finalRadio.addEventListener("change", function () {
                state.gates.forEach(function (g) { g.isOutput = false; });
                gate.isOutput = finalRadio.checked;
            });
            finalLabel.appendChild(finalRadio);
            finalLabel.appendChild(document.createTextNode("Выход схемы"));

            slot.appendChild(header);
            slot.appendChild(delBtn);
            slot.appendChild(typeField);
            slot.appendChild(row);
            slot.appendChild(finalLabel);

            gatesContainer.appendChild(slot);
        });

        // включаем/выключаем плейсхолдер доски
        if (boardDropzone) {
            if (state.gates.length > 0) {
                boardDropzone.classList.add("trainer-board__dropzone--has-gates");
            } else {
                boardDropzone.classList.remove("trainer-board__dropzone--has-gates");
            }
        }

        renderWires();
    }

    function fillSourcesForGate(index, in1Select, in2Select, gate) {
        var sources = getSourcesForGateIndex(index);

        function fillSelect(select, current) {
            select.innerHTML = "";
            var emptyOpt = document.createElement("option");
            emptyOpt.value = "";
            emptyOpt.textContent = "—";
            select.appendChild(emptyOpt);

            sources.forEach(function (src) {
                var opt = document.createElement("option");
                opt.value = src;
                opt.textContent = src;
                select.appendChild(opt);
            });

            if (current && sources.indexOf(current) !== -1) {
                select.value = current;
            } else {
                select.value = "";
            }
        }

        fillSelect(in1Select, gate.in1);
        fillSelect(in2Select, gate.in2);
    }

    // ---------- СОЕДИНЕНИЯ ----------
    function renderWires() {
        wiresList.innerHTML = "";

        state.gates.forEach(function (gate) {
            if (gate.in1) {
                var item1 = document.createElement("span");
                item1.className = "trainer-wires__item";
                item1.textContent = gate.in1 + " → " + gate.id + ".in1";
                wiresList.appendChild(item1);
            }
            if (gate.in2) {
                var item2 = document.createElement("span");
                item2.className = "trainer-wires__item";
                item2.textContent = gate.in2 + " → " + gate.id + ".in2";
                wiresList.appendChild(item2);
            }
        });

        if (!wiresList.children.length) {
            var empty = document.createElement("span");
            empty.className = "trainer-wires__item";
            empty.textContent = "Соединений пока нет";
            wiresList.appendChild(empty);
        }
    }

    // ---------- СБРОС / ОТРИСОВКА ----------
    function resetCircuit() {
        state.gates = [];
        state.nextGateId = 1;

        state.inputs.forEach(function (i) {
            i.value = 0;
        });

        if (state.mode === "levels") {
            if (checkBtn) checkBtn.disabled = !state.levelStarted;
        }

        renderInputs();
        renderGates();
        resultMessage.textContent = "";
        truthTableContainer.innerHTML = "";
    }

    function renderAll() {
        renderInputs();
        renderGates();
        renderWires();
        updateBestTimeLabels();
    }

    // ---------- ВЫЧИСЛЕНИЕ СХЕМЫ ----------
    function evaluateCircuit(config, inputValues) {
        var values = Object.assign({}, inputValues);
        var gates = config.gates;

        if (!gates.length) {
            return { valid: false, reason: "В схеме нет ни одного блока." };
        }

        for (var i = 0; i < gates.length; i++) {
            var gate = gates[i];
            if (!gate.type) continue;

            var impl = GATE_IMPL[gate.type];
            if (!impl) {
                return { valid: false, reason: "Неизвестный тип блока " + gate.id };
            }

            var a = gate.in1 ? values[gate.in1] : undefined;
            var b = gate.in2 ? values[gate.in2] : undefined;

            if (gate.type === "NOT") {
                if (a === undefined) {
                    return { valid: false, reason: "Блоку " + gate.id + " не задан вход." };
                }
                values[gate.id] = impl(a);
            } else {
                if (a === undefined || b === undefined) {
                    return { valid: false, reason: "Блоку " + gate.id + " не заданы оба входа." };
                }
                values[gate.id] = impl(a, b);
            }
        }

        var finalGate = gates.find(function (g) { return g.isOutput; }) || gates[gates.length - 1];
        if (!finalGate) {
            return { valid: false, reason: "Не выбран выходной блок." };
        }

        if (values[finalGate.id] === undefined) {
            return { valid: false, reason: "Выходной блок не имеет значения." };
        }

        return {
            valid: true,
            outputName: finalGate.id,
            outputValue: values[finalGate.id],
            allValues: values
        };
    }

    // ---------- ТАБЛИЦА ИСТИННОСТИ ----------
    function renderTruthTable(config, mode) {
        truthTableContainer.innerHTML = "";

        var inputNames = state.inputs.map(function (i) { return i.name; });
        var hasRandom = state.inputs.some(function (i) { return i.isRandom; });

        if (mode === "free" && hasRandom) {
            var info = document.createElement("p");
            info.className = "trainer-result__info";
            info.textContent =
                "Таблица истинности не строится, пока есть рандомные входы. " +
                "Используй «Проверить схему», чтобы смотреть реакцию на случайный набор.";
            truthTableContainer.appendChild(info);
            return false;
        }

        var rowsCount = Math.pow(2, inputNames.length);
        var table = document.createElement("table");
        table.className = "truth-table";

        var thead = document.createElement("thead");
        var headRow = document.createElement("tr");

        inputNames.forEach(function (name) {
            var th = document.createElement("th");
            th.textContent = name;
            headRow.appendChild(th);
        });

        var thF = document.createElement("th");
        thF.textContent = "F (схема)";
        headRow.appendChild(thF);

        if (mode === "levels") {
            var thTarget = document.createElement("th");
            thTarget.textContent = "F (цель)";
            headRow.appendChild(thTarget);
        }

        thead.appendChild(headRow);
        table.appendChild(thead);

        var tbody = document.createElement("tbody");
        var allOk = true;

        for (var mask = 0; mask < rowsCount; mask++) {
            var vars = {};
            for (var i = 0; i < inputNames.length; i++) {
                vars[inputNames[i]] = (mask >> (inputNames.length - i - 1)) & 1;
            }

            var evalResult = evaluateCircuit(config, vars);
            var fSchema = evalResult.valid ? evalResult.outputValue : null;

            var tr = document.createElement("tr");
            inputNames.forEach(function (name) {
                var td = document.createElement("td");
                td.textContent = vars[name];
                tr.appendChild(td);
            });

            var tdF = document.createElement("td");
            tdF.textContent = fSchema === null ? "-" : fSchema;
            tr.appendChild(tdF);

            if (mode === "levels") {
                var expected = state.currentLevel.func(vars);
                var tdTarget = document.createElement("td");
                tdTarget.textContent = expected;
                if (!evalResult.valid || fSchema !== expected) {
                    tr.classList.add("truth-table__row--mismatch");
                    allOk = false;
                }
                tr.appendChild(tdTarget);
            }

            tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        truthTableContainer.appendChild(table);
        return allOk;
    }

    // ---------- КНОПКИ ----------
    function handleCheck() {
        var config = { gates: state.gates.slice() };

        if (state.mode === "levels") {
            var allOk = renderTruthTable(config, "levels");
            if (!allOk) {
                resultMessage.textContent =
                    "Схема не совпадает с целевой функцией для всех наборов входов. " +
                    "Смотри подсвеченные строки в таблице.";
                return;
            }

            resultMessage.textContent = "Идеально! Схема полностью совпадает с целевой функцией.";

            if (state.levelStarted && state.levelStartTime) {
                var ms = Date.now() - state.levelStartTime;
                stopLevelTimer();
                saveBestTime(state.currentLevel.id, ms);
                updateBestTimeLabels();
                var formatted = formatTime(ms);
                resultMessage.textContent += " Время прохождения: " + formatted + ".";
                state.levelStarted = false;
                if (checkBtn) checkBtn.disabled = true;
            }

            markLevelDone(state.currentLevel.id);
        } else {
            var inputsMap = getCurrentInputMap(true);
            var evalResult = evaluateCircuit(config, inputsMap);
            if (!evalResult.valid) {
                resultMessage.textContent = "Схема невалидна: " + evalResult.reason;
                truthTableContainer.innerHTML = "";
                return;
            }

            resultMessage.textContent =
                "Схема посчитана для текущего набора входов. F = " +
                evalResult.outputValue +
                ". Таблица истинности построена ниже (если нет рандомных входов).";

            renderTruthTable(config, "free");
        }
    }

    function handleReset() {
        resetCircuit();
    }

    // ---------- ТАЙМЕР ----------
    function startLevel() {
        state.levelStarted = true;
        state.levelStartTime = Date.now();
        if (checkBtn) checkBtn.disabled = false;

        if (state.levelTimerInterval) {
            clearInterval(state.levelTimerInterval);
        }
        state.levelTimerInterval = setInterval(function () {
            if (!timerLabel || !state.levelStarted || !state.levelStartTime) return;
            var ms = Date.now() - state.levelStartTime;
            timerLabel.textContent = "Время: " + formatTime(ms);
        }, 200);

        resetCircuit();
    }

    function stopLevelTimer() {
        if (state.levelTimerInterval) {
            clearInterval(state.levelTimerInterval);
            state.levelTimerInterval = null;
        }
    }

    function formatTime(ms) {
        var totalSeconds = Math.floor(ms / 1000);
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;
        var mStr = minutes < 10 ? "0" + minutes : String(minutes);
        var sStr = seconds < 10 ? "0" + seconds : String(seconds);
        return mStr + ":" + sStr;
    }

    // ---------- СТАТИСТИКА ----------
    function loadStats() {
        try {
            var raw = localStorage.getItem(STATS_KEY);
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    function saveStats() {
        try {
            localStorage.setItem(STATS_KEY, JSON.stringify(state.stats));
        } catch (e) { }
    }

    function saveBestTime(levelId, ms) {
        if (!state.stats[levelId] || ms < state.stats[levelId].bestMs) {
            state.stats[levelId] = { bestMs: ms };
            saveStats();
        }
    }

    function updateBestTimeLabels() {
        levelItems.forEach(function (item) {
            var id = item.getAttribute("data-level-id");
            var best = state.stats[id];
            var bestSpan = item.querySelector(".level-list__best");
            if (!bestSpan) return;
            if (best && best.bestMs) {
                bestSpan.textContent = "Лучшее время: " + formatTime(best.bestMs);
            } else {
                bestSpan.textContent = "Лучшее время: —";
            }
        });
    }

    function markLevelDone(levelId) {
        levelItems.forEach(function (item) {
            if (item.getAttribute("data-level-id") === levelId) {
                item.classList.add("level-list__item--done");
                var status = item.querySelector(".level-list__status");
                if (status) {
                    status.setAttribute("data-status", "done");
                    status.textContent = "Пройден";
                }
            }
        });
    }

    // ---------- ГОТОВО ----------
    document.addEventListener("DOMContentLoaded", init);
})();
