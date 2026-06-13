let balance = Number(localStorage.getItem("balance")) || 0;
let history = JSON.parse(localStorage.getItem("history")) || [];
let slotHistory = JSON.parse(localStorage.getItem("slotHistory")) || [];
let playerExp = Number(localStorage.getItem("playerExp")) || 0;
let rebirthCount = Number(localStorage.getItem("rebirthCount")) || 0;
let debtorLevel =
  Number(localStorage.getItem("debtorLevel")) || 0;

let todaySlotCount = Number(localStorage.getItem("todaySlotCount")) || 0;

let lastSlotDate = localStorage.getItem("lastSlotDate") || "";

let stats = JSON.parse(localStorage.getItem("stats")) || {
  bestBalance: balance,
  bestWin: 0,
  totalPlays: 0,
  totalBet: 0,
  totalReward: 0,
};

const symbols = ["🍄", "🌶️", "🦞", "🍒", "🎰", "🌊", "☄️"];

const payout = {
  "🍒": 3,
  "🍄": 5,
  "🦞": 8,
  "🌶️": 10,
  "🌊": 20,
  "☄️": 30,
  "🎰": 50,
};

let spinning = false;
let stopFlags = [false, false, false];
let currentResult = [];
let currentBet = 0;
let spinTimer = null;
let isPremium = false;
let isMaxBetMode = localStorage.getItem("isMaxBetMode") === "true";

let timingInterval = null;
let timingPosition = 0;
let timingDirection = 1;
let timingRunning = false;
let timingTimeout = null;
let timingCountdown = null;
let abyssCountdown = null;
let abyssActive = false;
let abyssResults = [];
let nextSlotPremium = false;
let premiumRush = false;

let isContinueFreeSpin =
  localStorage.getItem("isContinueFreeSpin") === "true";

let continueRushCount =
  Number(localStorage.getItem("continueRushCount")) || 0;

let stRushNoSlotCount =
  Number(localStorage.getItem("stRushNoSlotCount")) || 0;

let demonContractCount =
  Number(localStorage.getItem("demonContractCount")) || 0;

let previousBalanceForJackpot = balance;

window.onload = function () {
  const lastBet = localStorage.getItem("lastBet");

  if (lastBet) {
    document.getElementById("betAmount").value = lastBet;

    document.getElementById("betDisplay").innerText = lastBet;
  }

  const betAmount = document.getElementById("betAmount");

  if (betAmount) {
    betAmount.addEventListener("input", function () {
      localStorage.setItem("lastBet", this.value);
      document.getElementById("betDisplay").innerText = this.value;
    });
  }

  resetSlotCountIfNeeded();
  update();
  updateShopDisplay();
};

document.getElementById("dailyBtn").onclick = function () {
  const today = new Date().toDateString();

  if (localStorage.getItem("lastDaily") === today) {
    alert("今日はもう受け取ってる！");
    return;
  }

  balance += 500;
  addExp(5);

  history.unshift(`${getDateTime()} +500円`);

  localStorage.setItem("lastDaily", today);

  save();
};

document.getElementById("salaryBtn").onclick = function () {
  const now = new Date();

  if (now.getDate() !== 25) {
    alert("25日しか受け取れない！");
    return;
  }

  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

  if (localStorage.getItem("salaryMonth") === monthKey) {
    alert("今月は受取済み！");
    return;
  }

  balance += 15000;
  addExp(30);

  history.unshift(`${getDateTime()} +150000000円 給料`);

  localStorage.setItem("salaryMonth", monthKey);

  save();
};

function addExpense() {
  const amount = Number(document.getElementById("expense").value);

  if (!amount) return;

  balance -= amount;
  addExp(1);

  history.unshift(`${getDateTime()} -${amount}円`);

  save();

  document.getElementById("expense").value = "";
}

function resetSlotCountIfNeeded() {
  const today = new Date().toDateString();

  if (lastSlotDate !== today) {
    todaySlotCount = 0;
    lastSlotDate = today;

    localStorage.setItem("todaySlotCount", todaySlotCount);

    localStorage.setItem("lastSlotDate", lastSlotDate);
  }
}

function setContinueFreeSpin(flag) {
  isContinueFreeSpin = flag;
  localStorage.setItem("isContinueFreeSpin", flag ? "true" : "false");
}

function judgeContinue() {
  const rate = getContinueRate();

  if (rate <= 0) return "fail";

  // 実際の継続率は最大90%
  const continueRate = Math.min(rate, 0.9);

  // 3連までは世界財閥こない
  if (continueRushCount < 4) {
    if (Math.random() < continueRate) return "continue";
    return "fail";
  }

  let auditRate = 0;

  if (rate >= 10) {
    auditRate = 0.10; // 1000%以上
  } else if (rate >= 5) {
    auditRate = 0.15;
  } else if (rate >= 3) {
    auditRate = 0.20;
  } else if (rate >= 1) {
    auditRate = 0.25; // 100%以上
  } else if (rate >= 0.7) {
    auditRate = 0.30; // 70%以上
  }

  if (auditRate > 0 && Math.random() < auditRate) {
    return "audit";
  }

  if (Math.random() < continueRate) {
    return "continue";
  }

  return "fail";
}

function updateContinueUI() {
  const btn = document.querySelector(".spin-button");

  if (!btn) return;

  if (isContinueFreeSpin) {
    btn.innerText = `ST RUSH🔥 ${continueRushCount}連`;
  } else {
    btn.innerText = "スロットを回す";
  }
}

function playSlot() {
  if (spinning && !spinTimer) {
    spinning = false;
  }

  console.log("spinning", spinning, "spinTimer", spinTimer);

  if (spinning) return;

  resetSlotCountIfNeeded();

if (!isContinueFreeSpin && todaySlotCount >= getDailySlotLimit()) {
  showSlotLimitMessage();
  return;
}

  if (balance <= 0) {
    alert("残高がないのでスロットできません！");
    return;
  }

const maxBet = Math.min(balance, Math.max(5, Math.floor(balance * 0.1)));

let bet = Number(document.getElementById("betAmount").value);

if (isContinueFreeSpin) {
  bet = Number(localStorage.getItem("lastBet")) || bet || 5;

  document.getElementById("betAmount").value = bet;
  document.getElementById("betDisplay").innerText = formatMoney(bet);
} else {
  if (isMaxBetMode) {
    bet = maxBet;
    document.getElementById("betAmount").value = bet;
    document.getElementById("betDisplay").innerText = bet;
  }

  localStorage.setItem("lastBet", bet);

  if (!bet || bet <= 0) {
    alert("賭け金を入力してね！");
    return;
  }

  if (bet > maxBet) {
    alert(`賭け金は残高の10%まで！最大${maxBet}円だよ`);
    return;
  }

  if (bet > balance) {
    alert("残高が足りない！");
    return;
  }
}

  playCoinSound();
  addExp(3);

  spinning = true;
  stopFlags = [false, false, false];
  currentBet = bet;
isPremium = premiumRush || nextSlotPremium || Math.random() < getPremiumRate();
nextSlotPremium = false;

if (isContinueFreeSpin) {
  currentResult = createRushHitResult();
} else {
  currentResult = [];

  for (let i = 0; i < 9; i++) {
    currentResult.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }

  if (isPremium) {
    currentResult[3] = "🎰";
    currentResult[4] = "🎰";
    currentResult[5] = "🎰";
  }
}

  for (let i = 0; i < 9; i++) {
    const cell = document.getElementById(`cell${i}`);

    cell.classList.remove("hit");
  }

document.getElementById("betDisplay").innerText = formatMoney(bet);

document.getElementById("payoutDisplay").innerText = formatMoney(0);

  clearGogoLamp();

  document.querySelector(".diagonal-left").classList.remove("show");
  document.querySelector(".diagonal-right").classList.remove("show");

  if (isContinueFreeSpin) {
    document.getElementById("slotMessage").innerText =
      `🔥ST RUSH中🔥\n当たり確定！ 残り猶予 ${10 - stRushNoSlotCount}`;
  } else if (isPremium) {
    document.getElementById("gogoLamp").classList.add("hit-rainbow");
    document.getElementById("slotMessage").innerText = "🌈プレミア気配…！";

    playPremiumSound();
  } else {
    document.getElementById("slotMessage").innerText = "STOPを押して";
  }

  spinTimer = setInterval(function () {
    for (let col = 0; col < 3; col++) {
      if (stopFlags[col]) continue;

      for (let row = 0; row < 3; row++) {
        const index = row * 3 + col;

        document.getElementById(`cell${index}`).innerText =
          symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
  }, 70);
}

function createRushHitResult() {
  const rushLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [6, 4, 2],
  ];

  const result = [];

  for (let i = 0; i < 9; i++) {
    result.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }

  const line = rushLines[Math.floor(Math.random() * rushLines.length)];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];

  line.forEach(function (index) {
    result[index] = symbol;
  });

  return result;
}

window.stopReel = function (col) {
  if (!spinning) return;
  if (stopFlags[col]) return;

  stopFlags[col] = true;

  playStopSound();

  for (let row = 0; row < 3; row++) {
    const index = row * 3 + col;

    document.getElementById(`cell${index}`).innerText = currentResult[index];
  }

  if (stopFlags[0] && stopFlags[1] && stopFlags[2]) {
    clearInterval(spinTimer);
    spinTimer = null;
    spinning = false;

    finishSlot(currentResult, currentBet);
  }
};

function finishSlot(result, bet) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [6, 4, 2],
  ];

  let totalReward = 0;
  let hitLines = [];

  lines.forEach(function (line) {
    const a = result[line[0]];
    const b = result[line[1]];
    const c = result[line[2]];

    if (a === b && b === c) {
      let reward = bet * payout[a];

      if (isPremium) {
        reward *= 10;
      }

      totalReward += reward;

      hitLines.push({
        line: line,
        symbol: a,
        reward: reward,
        rate: payout[a],
      });
    }
  });

  stats.totalPlays += 1;
  stats.totalBet += bet;

  const wasContinueFreeSpin = isContinueFreeSpin;

  setContinueFreeSpin(false);

  if (!wasContinueFreeSpin) {
    todaySlotCount++;
    localStorage.setItem("todaySlotCount", todaySlotCount);
  }

  let message = "";

  if (hitLines.length > 0) {
    addExp(10);

    balance += totalReward;

stats.totalReward += totalReward;

if (totalReward > stats.bestWin) {
  stats.bestWin = totalReward;
}

    hitLines.forEach(function (hit) {
      hit.line.forEach(function (index) {
        document.getElementById(`cell${index}`).classList.add("hit");
      });
    });

    const strongestHit = hitLines.reduce(function (best, hit) {
      return hit.rate > best.rate ? hit : best;
    }, hitLines[0]);

    setGogoLampBySymbol(strongestHit.symbol);

    const canEnterRush =
      strongestHit.symbol === "🎰" ||
      strongestHit.symbol === "☄️";

    document.getElementById("payoutDisplay").innerText =
      formatMoney(totalReward);

    hitLines.forEach(function (hit) {
      if (hit.line.toString() === [0, 4, 8].toString()) {
        document.querySelector(".diagonal-left").classList.add("show");
      }

      if (hit.line.toString() === [6, 4, 2].toString()) {
        document.querySelector(".diagonal-right").classList.add("show");
      }
    });

    playWinSound();

    if (isPremium) {
      message = `🌈レインボーGOGO！ +${formatMoney(totalReward)}`;
    } else if (hitLines.length >= 3) {
      message = `💥BIG BONUS💥 +${formatMoney(totalReward)}`;
    } else if (hitLines.length >= 2) {
      message = `🔥SUPER HIT🔥 +${formatMoney(totalReward)}`;
    } else {
      message = `HIT +${formatMoney(totalReward)}`;
    }

    if (!wasContinueFreeSpin) {
      if (canEnterRush && Math.random() < 0.20) {
        continueRushCount = 1;
        stRushNoSlotCount = 0;

        localStorage.setItem("continueRushCount", continueRushCount);
        localStorage.setItem("stRushNoSlotCount", stRushNoSlotCount);

        setContinueFreeSpin(true);

        message += `\n🔥ST RUSH突入🔥 ${continueRushCount}連`;
      }
    } else {
      if (strongestHit.symbol === "🎰") {
        stRushNoSlotCount = 0;
        message += `\n🎰カウントリセット！残り10`;
      } else {
        stRushNoSlotCount++;
        message += `\n⏳STカウント ${stRushNoSlotCount}/10`;
      }

      if (stRushNoSlotCount >= 10) {
        continueRushCount = 0;
        stRushNoSlotCount = 0;

        localStorage.setItem("continueRushCount", continueRushCount);
        localStorage.setItem("stRushNoSlotCount", stRushNoSlotCount);

        setContinueFreeSpin(false);

        message += `\n💀10カウント以内に🎰なし\nST RUSH強制終了`;
      } else {
        const continueResult = judgeContinue();

        if (continueResult === "continue") {
          continueRushCount++;

          localStorage.setItem("continueRushCount", continueRushCount);
          localStorage.setItem("stRushNoSlotCount", stRushNoSlotCount);

          setContinueFreeSpin(true);

          message += `\n🔥ST継続 ${continueRushCount}連`;
        } else if (continueResult === "audit") {
          continueRushCount = 0;
          stRushNoSlotCount = 0;

          localStorage.setItem("continueRushCount", continueRushCount);
          localStorage.setItem("stRushNoSlotCount", stRushNoSlotCount);

          setContinueFreeSpin(false);

          triggerObservationCollapse();

          message += `\n⚖️世界財務監査\n過剰な継続RUSHを検知。強制終了`;
        } else {
          continueRushCount = 0;
          stRushNoSlotCount = 0;

          localStorage.setItem("continueRushCount", continueRushCount);
          localStorage.setItem("stRushNoSlotCount", stRushNoSlotCount);

          setContinueFreeSpin(false);

          message += `\nST RUSH終了…`;
        }
      }
    }
  } else {
    document.getElementById("payoutDisplay").innerText = formatMoney(0);

    balance -= bet;
    message = `ハズレ… -${formatMoney(bet)}`;
  }

  document.getElementById("slotMessage").innerText = message;

  slotHistory.unshift(`${getDateTime()} 🎰 ${result.join("")} ${message}`);

  save();

  if (Math.random() < getGuerillaRate()) {
    if (
      confirm(
        `⚡⚡⚡
ゲリラチャレンジ発生！

成功で最大9999倍

挑戦しますか？
⚡⚡⚡`
      )
    ) {
      triggerTimingChallenge();
    }
  }

  maybeTriggerAbyss();

  isPremium = false;
}

function clearGogoLamp() {
  const lamp = document.getElementById("gogoLamp");
  if (!lamp) return;

  lamp.classList.remove(
    "on",
    "premium",
    "hit-green",
    "hit-blue",
    "hit-red",
    "hit-rainbow",
    "hit-hot",
    "hit-god"
  );
}

function setGogoLampBySymbol(symbol) {
  const lamp = document.getElementById("gogoLamp");
  if (!lamp) return;

  clearGogoLamp();

  if (symbol === "🍒" || symbol === "🍄") {
    lamp.classList.add("hit-green");
  } else if (symbol === "🦞" || symbol === "🌶️") {
    lamp.classList.add("hit-blue");
  } else if (symbol === "🌊" || symbol === "☄️") {
    lamp.classList.add("hit-red");
  } else if (symbol === "🎰") {
    lamp.classList.add("hit-rainbow");
  }
}

function triggerBalanceJackpot() {
  const balanceBox = document.querySelector(".balance-wide");

  if (!balanceBox) return;

  const lamp = document.getElementById("gogoLamp");
  if (lamp) {
    clearGogoLamp();
    lamp.classList.add("hit-hot");
  }

  balanceBox.classList.remove("balance-jackpot");

  void balanceBox.offsetWidth;

  balanceBox.classList.add("balance-jackpot");

  playJackpotSound();

  if (navigator.vibrate) {
    navigator.vibrate([100,50,100,50,300]);
  }

  setTimeout(function () {
    balanceBox.classList.remove("balance-jackpot");
  }, 3000);
}

function triggerGodJackpot() {

  const lamp = document.getElementById("gogoLamp");
  if (lamp) {
    clearGogoLamp();
    lamp.classList.add("hit-god");
  }

  document.body.classList.add("god-jackpot");

  const flash = document.createElement("div");
  flash.className = "god-flash";

  document.body.appendChild(flash);

  if (navigator.vibrate) {
    navigator.vibrate([
      300,100,
      300,100,
      500
    ]);
  }

  playJackpotSound();
  playJackpotSound();

  showToast(
    "💥 GOD JACKPOT 💥"
  );

  setTimeout(() => {
    document.body.classList.remove("god-jackpot");
  }, 3500);

  setTimeout(() => {
    flash.remove();
  }, 1500);
}

function triggerObservationCollapse() {

  alert(
`⚠️観測異常⚠️

継続率が100%を突破

世界政府 財務監視局が介入します`
  );

  document.body.classList.add(
    "observation-collapse"
  );

  setTimeout(function () {

    alert(
`観測終了

世界の整合性を維持するため
継続チェーンを強制停止します`
    );

    document.body.classList.remove(
      "observation-collapse"
    );

  }, 3000);

}

function save() {
  const beforeBalance = previousBalanceForJackpot;

  if (balance <= 0) {
    balance = 0;

    localStorage.setItem("balance", balance);

    update();

    previousBalanceForJackpot = balance;

    showDebtModal();

    return;
  }

  if (balance > stats.bestBalance) {
    stats.bestBalance = balance;
  }

  localStorage.setItem("balance", balance);
  localStorage.setItem("history", JSON.stringify(history));
  localStorage.setItem("slotHistory", JSON.stringify(slotHistory));
  localStorage.setItem("stats", JSON.stringify(stats));
  localStorage.setItem("playerExp", playerExp);
  localStorage.setItem("debtorLevel", debtorLevel);
localStorage.setItem(
  "demonContractCount",
  demonContractCount
);

  update();

  if (
  beforeBalance > 0 &&
  balance >= beforeBalance * 90
) {

  triggerGodJackpot();

} else if (
  beforeBalance > 0 &&
  balance >= beforeBalance * 10
) {

  triggerBalanceJackpot();

}

  previousBalanceForJackpot = balance;
}

function update() {
  resetSlotCountIfNeeded();

  if (balance > stats.bestBalance) {
    stats.bestBalance = balance;
    localStorage.setItem("stats", JSON.stringify(stats));
    localStorage.setItem("playerExp", playerExp);
  }

document.getElementById("balance").innerText = formatMoney(balance);

  const maxBetText = document.getElementById("maxBetText");

  if (maxBetText) {
    const currentMaxBet = Math.min(
      balance,
      Math.max(5, Math.floor(balance * 0.1)),
    );

    maxBetText.innerText = `最大賭け金：${formatMoney(currentMaxBet)}`;
  }

  const betAmountInput = document.getElementById("betAmount");
  const betDisplay = document.getElementById("betDisplay");

  if (betAmountInput && betDisplay) {
    if (isMaxBetMode) {
      const currentMaxBet = Math.min(
        balance,
        Math.max(5, Math.floor(balance * 0.1)),
      );

      betAmountInput.value = currentMaxBet;
      betDisplay.innerText = formatMoney(currentMaxBet);
      localStorage.setItem("lastBet", currentMaxBet);
    } else {
      betDisplay.innerText = formatMoney(Number(betAmountInput.value || 5));
    }
  }

  const remainSlot = Math.max(0, getDailySlotLimit() - todaySlotCount);

  setText("slotLimit", `${remainSlot}回`);

  updateStats();
  updateTimers();
  updateShopDisplay();
  updateRebirthButton();
  updateCompressDisplay();
  updateContinueUI();

  const timingBet = document.getElementById("timingBet");
  const timingCard = document.getElementById("timingCard");

  if (timingBet && timingCard && timingCard.style.display !== "none") {
    syncTimingBetToMax();
  }
}

function updateStats() {
  if (balance > stats.bestBalance) {
    stats.bestBalance = balance;
  }

  const profit = stats.totalReward - stats.totalBet;

  setText("bestBalance", formatMoney(stats.bestBalance));
  setText("bestWin", formatMoney(stats.bestWin));
  setText("totalPlays", `${stats.totalPlays.toLocaleString()}回`);
  setText("totalBet", formatMoney(stats.totalBet));
  setText("totalReward", formatMoney(stats.totalReward));
  setText("slotProfit", formatMoney(profit));

  setText("playerLevel", getLevel());
  setText("rebirthCount", rebirthCount);
  setText("rankTitle", getRankTitle());
  setText("playerExp", playerExp.toLocaleString());
  setText(
  "wealthBonus",
  `${getWealthBonus().toFixed(1)}倍`
);
  setText("debtorLevel", debtorLevel);
  setText("debtTitle", getDebtTitle());
  setText("demonBuffDisplay", getDemonBuffText());
  setText(
  "demonContractDisplay",
  `😈契約回数：${demonContractCount}回`
);

  localStorage.setItem("stats", JSON.stringify(stats));
}

function setText(id, text) {
  document.querySelectorAll(`#${id}`).forEach(function (el) {
    el.innerText = text;
  });
}

window.setBet = function (amount) {
  isMaxBetMode = false;
  localStorage.setItem("isMaxBetMode", "false");

  document.getElementById("betAmount").value = amount;
  document.getElementById("betDisplay").innerText = amount;

  localStorage.setItem("lastBet", amount);
};

window.setMaxBet = function () {
  isMaxBetMode = true;
  localStorage.setItem("isMaxBetMode", "true");

  const maxBet = Math.min(balance, Math.max(5, Math.floor(balance * 0.1)));

  document.getElementById("betAmount").value = maxBet;
  document.getElementById("betDisplay").innerText = maxBet;

  localStorage.setItem("lastBet", maxBet);
};

function formatMoney(num) {
  const units = [
    { value: 1e68, name: "無量大数" },
    { value: 1e64, name: "不可思議" },
    { value: 1e60, name: "那由他" },
    { value: 1e56, name: "阿僧祇" },
    { value: 1e52, name: "恒河沙" },
    { value: 1e48, name: "極" },
    { value: 1e44, name: "載" },
    { value: 1e40, name: "正" },
    { value: 1e36, name: "澗" },
    { value: 1e32, name: "溝" },
    { value: 1e28, name: "穣" },
    { value: 1e24, name: "𥝱" },
    { value: 1e20, name: "垓" },
    { value: 1e16, name: "京" },
    { value: 1e12, name: "兆" },
    { value: 1e8, name: "億" },
  ];

  for (const unit of units) {
    if (num >= unit.value) {
      return (num / unit.value).toFixed(1) + unit.name + "円";
    }
  }

  return Math.floor(num).toLocaleString() + "円";
}

function getDateTime() {
  const now = new Date();

  return (
    now.toLocaleDateString() +
    " " +
    now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

document.addEventListener("DOMContentLoaded", function () {
  window.resetHistory = function () {
    if (confirm("生活履歴をリセットする？")) {
      history = [];
      save();
    }
  };

  window.resetSlotHistory = function () {
    if (confirm("スロット履歴をリセットする？")) {
      slotHistory = [];
      save();
    }
  };
});

function playTone(freq, duration, type = "square", volume = 0.05) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  const audioCtx = new AudioContext();

  const oscillator = audioCtx.createOscillator();

  const gainNode = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = freq;

  gainNode.gain.value = volume;

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();

  setTimeout(function () {
    oscillator.stop();
    audioCtx.close();
  }, duration);
}

function playCoinSound() {
  playTone(880, 80, "square", 0.04);

  setTimeout(function () {
    playTone(1320, 90, "square", 0.04);
  }, 90);
}

function playStopSound() {
  playTone(300, 60, "square", 0.035);
}

function playWinSound() {
  playTone(660, 120, "triangle", 0.05);

  setTimeout(function () {
    playTone(880, 120, "triangle", 0.05);
  }, 120);

  setTimeout(function () {
    playTone(1320, 180, "triangle", 0.05);
  }, 240);
}

function playJackpotSound() {

  playTone(1200, 100, "triangle", 0.08);

  setTimeout(() => {
    playTone(1600, 120, "triangle", 0.09);
  }, 100);

  setTimeout(() => {
    playTone(2200, 150, "triangle", 0.10);
  }, 220);

  setTimeout(() => {
    playTone(3200, 350, "triangle", 0.12);
  }, 350);

}

function playPremiumSound() {
  playTone(520, 120, "triangle", 0.05);

  setTimeout(function () {
    playTone(780, 120, "triangle", 0.05);
  }, 120);

  setTimeout(function () {
    playTone(1040, 180, "triangle", 0.05);
  }, 240);
}

function playJackpotSound() {
  playTone(1200, 100, "triangle", 0.08);

  setTimeout(() => {
    playTone(1600, 150, "triangle", 0.08);
  }, 100);

  setTimeout(() => {
    playTone(2200, 250, "triangle", 0.08);
  }, 250);
}

function updateTimers() {
  const now = new Date();

  const todayKey = now.toDateString();

  const lastDaily = localStorage.getItem("lastDaily");

  const dailyTimer = document.getElementById("dailyTimer");

  if (dailyTimer) {
    if (lastDaily === todayKey) {
      const tomorrow = new Date();

      tomorrow.setDate(now.getDate() + 1);

      tomorrow.setHours(0, 0, 0, 0);

      const diffMs = tomorrow - now;

      const hours = Math.ceil(diffMs / (1000 * 60 * 60));

      dailyTimer.innerText = `あと${hours}時間`;
    } else {
      dailyTimer.innerText = "受取OK";
    }
  }

  const salaryTimer = document.getElementById("salaryTimer");

  if (salaryTimer) {
    let next25 = new Date(now.getFullYear(), now.getMonth(), 25);

    if (now.getDate() > 25) {
      next25 = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    }

    const diffMs = next25 - now;

    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (now.getDate() === 25) {
      salaryTimer.innerText = "受取OK";
    } else {
      salaryTimer.innerText = `あと${days}日`;
    }
  }
}

function triggerTimingChallenge() {
  const timingCard = document.getElementById("timingCard");

  if (!timingCard) return;

  timingCard.style.display = "block";

syncTimingBetToMax();

let seconds = 20 + getLevelBuffs().guerillaBonus;

  document.getElementById("timingMessage").innerText =
    `⚡ゲリラチャレンジ発生⚡ ${seconds}秒間遊び放題！`;

  setText("timingTimer", `⏳残り${seconds}秒`);

  timingCard.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  if (timingTimeout) {
    clearTimeout(timingTimeout);
  }

  if (timingCountdown) {
    clearInterval(timingCountdown);
  }

  timingCountdown = setInterval(function () {
    seconds--;

    setText("timingTimer", `⏳残り${seconds}秒`);

    if (seconds <= 0) {
      clearInterval(timingCountdown);

      if (timingInterval) {
        clearInterval(timingInterval);
        timingInterval = null;
      }

      timingRunning = false;

      timingCard.style.display = "none";

      setText("timingMessage", "挑戦待ち");
      setText("timingTimer", "");

      const btn = document.getElementById("timingMainBtn");

      if (btn) {
        btn.innerText = "スタート";
      }
    }
  }, 1000);
}

window.toggleTiming = function () {
  const btn = document.getElementById("timingMainBtn");

  if (!timingRunning) {
    startTiming();

    if (timingRunning && btn) {
      btn.innerText = "STOP";
    }
  } else {
    stopTiming();

    if (btn) {
      btn.innerText = "スタート";
    }
  }
};

function startTiming() {
  if (timingRunning) {
    return;
  }

  const bet = Number(document.getElementById("timingBet").value);

  if (!bet || bet <= 0) {
    alert("賭け金を入力してね！");
    return;
  }

  if (bet > balance) {
    alert("残高不足！");
    return;
  }

  timingRunning = true;
  timingPosition = 0;
  timingDirection = 1;

  const cursor = document.getElementById("timingCursor");

  if (cursor) {
    cursor.style.left = "0%";
  }

  timingInterval = setInterval(function () {
    timingPosition += 2 * timingDirection;

    if (timingPosition >= 100) {
      timingPosition = 100;
      timingDirection = -1;
    }

    if (timingPosition <= 0) {
      timingPosition = 0;
      timingDirection = 1;
    }

    if (cursor) {
      cursor.style.left = timingPosition + "%";
    }
  }, 20);

  document.getElementById("timingMessage").innerText = "STOPを押せ！";
}

function stopTiming() {
  if (!timingRunning) return;

  timingRunning = false;
  clearInterval(timingInterval);

  const bet = Number(document.getElementById("timingBet").value);

  let message = "";

  if (timingPosition >= 45 && timingPosition <= 55) {

    const multiplier = getTimingMultiplier();
    const reward = bet * multiplier;

    if (multiplier >= 999) {

      message = `🌈🌈🌈
神降臨
${multiplier}倍
+${formatMoney(reward)}
🌈🌈🌈`;

      alert(`🌈 ${multiplier}倍 JACKPOT！ 🌈`);

    } else if (multiplier >= 99) {

      message = `🔥🔥🔥
激アツ
${multiplier}倍
+${formatMoney(reward)}
🔥🔥🔥`;

    } else {

      message = `🎯PERFECT！
${multiplier}倍
+${formatMoney(reward)}`;
    }

    balance += reward;

    playWinSound();

  } else {

const penalty = Math.min(balance, bet);
balance -= penalty;
message = `💥OUT！ -${formatMoney(penalty)}`;
  }

  document.getElementById("timingMessage").innerText = message;

  slotHistory.unshift(`${getDateTime()} 🎯 ${message}`);

  syncTimingBetToMax();

  save();

  const btn = document.getElementById("timingMainBtn");

  if (btn) {
    btn.innerText = "スタート";
  }
}

const rankTable = [
  { level: 1, title: "500円玉に選ばれし者" },
  { level: 2, title: "銭鬼の幼生" },
  { level: 3, title: "残高観測者" },
  { level: 4, title: "硬貨結界の見習い" },
  { level: 5, title: "青銅の銭鬼" },
  { level: 6, title: "支出を拒む者" },
  { level: 7, title: "収支均衡の番人" },
  { level: 8, title: "小銭結界師" },
  { level: 9, title: "財布の守護鬼" },
  { level: 10, title: "黄金契約者" },

  { level: 11, title: "金喰い童子" },
  { level: 12, title: "硬貨夜叉" },
  { level: 13, title: "銭喰天狗" },
  { level: 14, title: "黄金の使徒" },
  { level: 15, title: "倹約魔術師" },
  { level: 16, title: "財運祈祷師" },
  { level: 17, title: "小判陰陽師" },
  { level: 18, title: "残高召喚士" },
  { level: 19, title: "金運修羅" },
  { level: 20, title: "金喰天狗" },

  { level: 25, title: "黄金龍王" },
  { level: 30, title: "財禍の鬼神" },
  { level: 35, title: "貨幣大明王" },
  { level: 40, title: "破産冥王" },
  { level: 45, title: "煉獄財神" },
  { level: 50, title: "雷神・銭天" },

  { level: 75, title: "夜叉王" },
  { level: 100, title: "金運覇王" },
  { level: 150, title: "天地開闢龍神" },
  { level: 200, title: "虚無財神" },
  { level: 300, title: "万象観測神" },
  { level: 500, title: "森羅万象の支配者" },
  { level: 750, title: "⛧ 原初神候補 ⛧" },
  { level: 1000, title: "⛧ 原初神 ⛧" },
];

const debtRankTable = [
  {
    level: 0,
    title: "無借金の民",
    comment: "まだ人間として扱われている。"
  },
  {
    level: 1,
    title: "生活保護候補生",
    comment: "世界政府は貴様を要保護対象に指定した。"
  },
  {
    level: 3,
    title: "借金見習い",
    comment: "まだ引き返せる。たぶんな。"
  },
  {
    level: 5,
    title: "債務者",
    comment: "信用情報が震え始めた。"
  },
  {
    level: 10,
    title: "多重債務兵",
    comment: "借りる場所が増えただけで強くなった気がしている。"
  },
  {
    level: 20,
    title: "闇金の友",
    comment: "もう友達ではない。"
  },
  {
    level: 30,
    title: "奈落の借金王",
    comment: "返済計画は伝説となった。"
  },
  {
    level: 50,
    title: "破産魔導士",
    comment: "魔法の言葉『来月なんとかなる』を習得。"
  },
  {
    level: 75,
    title: "債務冥王",
    comment: "支払い期限という概念を冥界へ送った。"
  },
  {
    level: 100,
    title: "漆黒の連帯保証人",
    comment: "知人が電話に出なくなった。"
  },
  {
    level: 200,
    title: "負債神",
    comment: "借金が本体であり、人間部分は付属品。"
  },
  {
    level: 500,
    title: "☠️借金という概念☠️",
    comment: "もはや貴様自身が負債である。"
  }
];

function getDebtTitle() {
  let title = "無借金の民";

  debtRankTable.forEach(function(rank) {
    if (debtorLevel >= rank.level) {
      title = rank.title;
    }
  });

  return title;
}

function getDebtRank() {
  let currentRank = debtRankTable[0];

  debtRankTable.forEach(function(rank) {
    if (debtorLevel >= rank.level) {
      currentRank = rank;
    }
  });

  return currentRank;
}

function addExp(amount) {

  playerExp += Math.floor(
    amount *
    getExpRate() *
    getWealthBonus()
  );

  localStorage.setItem(
    "playerExp",
    playerExp
  );
}

function getLevel() {
  return Math.min(1000, Math.floor(Math.sqrt(playerExp / 10)) + 1);
}

function getRankTitle() {
  const level = getLevel();
  let title = "500円玉に選ばれし者";

  rankTable.forEach(function (rank) {
    if (level >= rank.level) {
      title = rank.title;
    }
  });

  return title;
}

function getLevelBuffs() {
  const level = getLevel();

  return {
    slotBonus: Math.floor(level / 10) * 5,

    // Lv1000でも +5%
    premiumBonus: Math.floor(level / 100) * 0.005,

    guerillaBonus: Math.floor(level / 50),

    continueBonus: Math.floor(level / 200) * 0.1,
  };
}

const shopItems = {

title1: {
  name: "🩸契約の第一硬貨",
  price: 10000, // 1万円
  type: "title",
  slotBonus: 10,
},

title2: {
  name: "👁️金喰天狗の魔眼",
  price: 10000000, // 1000万円
  type: "title",
  slotBonus: 20,
},

title3: {
  name: "🐉黄金龍王の逆鱗",
  price: 10000000000, // 100億円
  type: "title",
  slotBonus: 30,
},

title4: {
  name: "☠️財禍鬼神の心核",
  price: 1000000000000000, // 1000兆円
  type: "title",
  slotBonus: 60,
},

title5: {
  name: "📜貨幣大明王の禁書",
  price: 100000000000000000000, // 100垓円
  type: "title",
  slotBonus: 2000,
},

skin1: {
  name: "🎨黒金スキン",
  price: 1000000,
  type: "skin",
  unlockRebirth: 1,
},

skin2: {
  name: "🌈レインボー覚醒",
  price: 20000000,
  type: "skin",
  unlockRebirth: 5,
},

skin3: {
  name: "☠️奈落モード",
  price: 100000000,
  type: "skin",
  unlockRebirth: 10,
},

skin4: {
  name: "👑黄金神格",
  price: 100000000000,
  type: "skin",
  unlockRebirth: 20,
},

skin5: {
  name: "⚡終焉の観測者",
  price: 10000000000000,
  type: "skin",
  unlockRebirth: 25,
},

skin6: {
  name: "🌌虚空宇宙",
  price: 1e18,
  type: "skin",
  unlockRebirth: 30,
},

skin7: {
  name: "🕳️因果律崩壊",
  price: 1e20,
  type: "skin",
  unlockRebirth: 40,
},

skin8: {
  name: "👁️超越存在",
  price: 1e23,
  type: "skin",
  unlockRebirth: 50,
},

skin9: {
  name: "🌠多元宇宙管理者",
  price: 1e56,
  type: "skin",
  unlockRebirth: 75,
},

skin10: {
  name: "♾️存在崩壊",
  price: 1e71,
  type: "skin",
  unlockRebirth: 100,
},

effect1: {
  name: "♻️継続の札",
  price: 10000000,
  type: "effect",
  continueBonus: 0.05,
},
effect2: {
  name: "🔥不滅ボーナス",
  price: 100000000000,
  type: "effect",
  continueBonus: 0.1,
},
effect3: {
  name: "🌈輪廻ラッシュ",
  price: 10000000000000,
  type: "effect",
  continueBonus: 0.2,
},

end1: {
  name: "第一世界樹の根",
  price: 1e16,
  type: "end",
  slotBonus: 1000,
},

end2: {
  name: "黄金因果律",
  price: 1e20,
  type: "end",
  premiumBonus: 0.03,
},

end3: {
  name: "虚無観測機関",
  price: 1e24,
  type: "end",
  continueBonus: 5.0,
},

end4: {
  name: "原初貨幣神の玉座",
  price: 1e28,
  type: "end",
  doubleBuff: true,
},

end5: {
  name: "存在税徴収権",
  price: 1e32,
  type: "end",
  specialTitle: "存在税執行官",
},

end6: {
  name: "世界財政管理機構",
  price: 1e36,
  type: "end",
  specialTitle: "世界予算編成者",
},

end7: {
  name: "全宇宙歳入庁",
  price: 1e40,
  type: "end",
  slotBonus: 5000,
},

end8: {
  name: "時間軸徴税機関",
  price: 1e44,
  type: "end",
  premiumBonus: 0.08,
},

end9: {
  name: "無限残高炉",
  price: 1e48,
  type: "end",
  continueBonus: 20,
},

end10: {
  name: "貨幣律そのもの",
  price: 1e52,
  type: "end",
  specialTitle: "貨幣律",
},

end11: {
  name: "全次元予算会議",
  price: 1e56,
  type: "end",
  specialTitle: "次元監査神",
},

end12: {
  name: "支出という概念の抹消",
  price: 1e60,
  type: "end",
  specialTitle: "無支出存在",
},

end13: {
  name: "貨幣創世記",
  price: 1e64,
  type: "end",
  specialTitle: "原初貨幣神",
},

end14: {
  name: "宇宙会計監査院",
  price: 1e68,
  type: "end",
  specialTitle: "全能監査者",
},

end15: {
  name: "概念外存在",
  price: 1e240,
  type: "end",
  specialTitle: "⛧概念外存在⛧",
},

};

function getItemPrice(item) {
  return Math.floor(item.price * Math.pow(1.5, rebirthCount));
}

function getCompressCost(baseCost) {
  return Math.floor(baseCost * Math.pow(1.5, rebirthCount));
}

let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || [];

function getShopBuffs() {
  let slotBonus = 0;
  let premiumBonus = 0;
  let continueBonus = 0;
  let doubleBuff = false;
  let currentTitle = "なし";

  ownedItems.forEach(function (id) {
    const item = shopItems[id];

    if (!item) return;

    if (item.slotBonus) {
      slotBonus += item.slotBonus;
    }

    if (item.premiumBonus) {
      premiumBonus += item.premiumBonus;
    }

    if (item.continueBonus) {
      continueBonus += item.continueBonus;
    }

    if (item.doubleBuff) {
      doubleBuff = true;
    }

    if (item.type === "title") {
      currentTitle = item.name;
    }

    if (item.specialTitle) {
      currentTitle = item.specialTitle;
    }
  });

  if (doubleBuff) {
    slotBonus *= 2;
    premiumBonus *= 2;
    continueBonus *= 2;
  }

  return {
    slotBonus: slotBonus,
    premiumBonus: premiumBonus,
    continueBonus: continueBonus,
    currentTitle: currentTitle,
  };
}

function getDailySlotLimit() {
  const buffs = getShopBuffs();
  const levelBuffs = getLevelBuffs();
  const rebirth = getRebirthBuffs();
  const demon = getDemonBuffs();

  let total =
    50 +
    buffs.slotBonus +
    levelBuffs.slotBonus +
    rebirth.slotBonus +
    demon.slotBonus;

  if (demon.doubleBuff) {
    total *= 2;
  }

  return total;
}

function getPremiumRate() {
  const buffs = getShopBuffs();
  const levelBuffs = getLevelBuffs();
  const rebirth = getRebirthBuffs();
  const demon = getDemonBuffs();

  let total =
    0.005 +
    buffs.premiumBonus +
    levelBuffs.premiumBonus +
    rebirth.premiumBonus +
    demon.premiumBonus;

  if (demon.doubleBuff) {
    total *= 2;
  }

  return total;
}

function getContinueRate() {
  const buffs = getShopBuffs();
  const levelBuffs = getLevelBuffs();
  const rebirth = getRebirthBuffs();
  const demon = getDemonBuffs();

  let total =
    buffs.continueBonus +
    levelBuffs.continueBonus +
    rebirth.continueBonus +
    demon.continueBonus;

  if (demon.doubleBuff) {
    total *= 2;
  }

  return total;
}

function getExpRate() {
  const demon = getDemonBuffs();

  let total =
    (1 + rebirthCount) *
    (1 + demon.expBonus);

  if (demon.doubleBuff) {
    total *= 2;
  }

  return total;
}

function getWealthBonus() {
  return (
    1 +
    Math.log10(
      Math.max(balance, 1)
    )
  );
}

function getGuerillaRate() {
  return 0.005;
}

/* ゲリラ賭け金上限（残高50%） */
function getTimingMaxBet() {
  return Math.max(5, Math.floor(balance * 0.5));
}

/* ゲリラ賭け金を自動同期 */
function syncTimingBetToMax() {
  const timingBet = document.getElementById("timingBet");

  if (!timingBet) return;

  if (balance <= 0) {
    timingBet.value = 0;
    return;
  }

  timingBet.value = Math.max(5, Math.floor(balance * 0.5));
}

function getRebirthBuffs() {
  return {
    slotBonus: rebirthCount * 20,

    // 転生1回につき +0.1%
    premiumBonus: rebirthCount * 0.001,

    continueBonus: rebirthCount * 0.1,
  };
}

function getDemonBuffs() {
  return {
    slotBonus:
      (demonContractCount >= 5 ? 10 : 0) +
      (demonContractCount >= 50 ? 100 : 0),

    premiumBonus:
      (demonContractCount >= 3 ? 0.005 : 0) +
      (demonContractCount >= 30 ? 0.03 : 0),

    continueBonus:
      (demonContractCount >= 10 ? 0.05 : 0),

    expBonus:
      (demonContractCount >= 20 ? 0.5 : 0),

    doubleBuff:
      demonContractCount >= 100
  };
}

function getDemonBuffText() {
  const buffs = [];

  if (demonContractCount >= 3) buffs.push("加護");
  if (demonContractCount >= 5) buffs.push("+10回");
  if (demonContractCount >= 10) buffs.push("継続+5%");
  if (demonContractCount >= 20) buffs.push("EXP+50%");
  if (demonContractCount >= 30) buffs.push("祝福");
  if (demonContractCount >= 50) buffs.push("+100回");
  if (demonContractCount >= 100) buffs.push("全2倍");

  if (demonContractCount <= 0) {
    return "未契約";
  }

  if (buffs.length === 0) {
    return `${demonContractCount}回 / なし`;
  }

  return `${demonContractCount}回 / ${buffs.join("・")}`;
}

function getDemonComment() {

  if (demonContractCount >= 100) {
    return `「……もう契約ではない。」

「貴様は、こちら側だ。」

「さあ、世界を喰らえ。」`;
  }

  if (demonContractCount >= 50) {
    return `「がっはっはっは！！」

「契約崩壊だ。」

「もう戻れんぞ、人間。」`;
  }

  if (demonContractCount >= 30) {
    return `「ふむ……」

「貴様には祝福をくれてやろう。」

「もっと回せ。もっと狂え。」`;
  }

  if (demonContractCount >= 20) {
    return `「魂の担保は十分だ。」

「経験も、欲望も、すべて膨れ上がる。」

「よい契約者になったな。」`;
  }

  if (demonContractCount >= 10) {
    return `「その眼……奈落を見たな。」

「もう普通の回転では満足できまい。」`;
  }

  if (demonContractCount >= 5) {
    return `「また来たかっ！」

「契約依存症だな。」`;
  }

  if (demonContractCount >= 1) {
    return `「がっはっはっ！」

「スロットの欲には抗えまい。」`;
  }

  return `「ワシと契約するか？」`;
}

function getTimingMultiplier() {
  const level = getLevel();
  const rebirth = rebirthCount;

  const levelBonus =
    Math.min(0.15, Math.floor(level / 100) * 0.015);

  const rebirthBonus =
    Math.min(0.25, rebirth * 0.03);

  const bonus = levelBonus + rebirthBonus;

  const roll = Math.random();

  if (roll < 0.001 + bonus * 0.03) {
    return 9999;
  }

  if (roll < 0.01 + bonus * 0.12) {
    return 999;
  }

  if (roll < 0.05 + bonus * 0.35) {
    return 99;
  }

  if (roll < 0.15 + bonus * 0.55) {
    return 50;
  }

  if (roll < 0.35 + bonus * 0.75) {
    return 20;
  }

  return Math.floor(Math.random() * 10) + 5;
}

function updateRebirthButton() {
  const btn = document.getElementById("rebirthBtn");

  if (!btn) return;

  if (getLevel() >= 1000) {
    btn.style.opacity = "1";
  } else {
    btn.style.opacity = "0.35";
  }
}

window.rebirth = function () {
  if (getLevel() < 1000) {
    showToast(`レベル1000で転生可能です\n現在Lv ${getLevel()}`);

    return;
  }

  if (
    !confirm(
      "転生しますか？\n\n所持金はそのまま。\nLvは1に戻ります。\nEXP獲得量と各種バフが強化されます。\nただしショップ価格もインフレします。",
    )
  ) {
    return;
  }

  rebirthCount++;

  playerExp = 0;

  /* 転生時はスロット回数を全回復 */
  todaySlotCount = 0;
  lastSlotDate = new Date().toDateString();

  localStorage.setItem("todaySlotCount", todaySlotCount);
  localStorage.setItem("lastSlotDate", lastSlotDate);

  isMaxBetMode = false;
  localStorage.setItem("isMaxBetMode", "false");
  localStorage.removeItem("lastBet");

  /* スキンだけ残す */
  ownedItems = ownedItems.filter((id) => shopItems[id]?.type === "skin");

  localStorage.setItem("ownedItems", JSON.stringify(ownedItems));

  localStorage.setItem("rebirthCount", rebirthCount);
  localStorage.setItem("playerExp", playerExp);

  history.unshift(`${getDateTime()} 🌈${rebirthCount}回目の転生`);

  save();

  alert(
    `🌈転生完了！
                                                                                        
                                                                                        能力アイテムは失われた...
                                                                                        
                                                                                        しかし魂は強くなった
                                                                                        
                                                                                        現在 ${rebirthCount}回転生`,
  );
};

window.buyShopItem = function (id) {
  const item = shopItems[id];

  if (!item) {
    return;
  }

  const price = getItemPrice(item);
  
  if (
  item.unlockRebirth &&
  rebirthCount < item.unlockRebirth
) {
  alert(
    `転生${item.unlockRebirth}回で解放されます`
  );
  return;
}
  
  const beforeLimit = getDailySlotLimit();

  if (ownedItems.includes(id)) {
    alert("これはもう購入済み！");
    return;
  }

  if (balance < price) {
    alert("残高が足りない！");
    return;
  }

  if (
    !confirm(
      `${item.name} を購入する？\n${price.toLocaleString()}円を消費します。`,
    )
  ) {
    return;
  }

if (id === "end15") {

  if (
    !confirm(
`終焉に到達しますか？

この選択を行うと
500円LIFEは観測終了します。

本当に進みますか？`
    )
  ) {
    return;
  }

}

    balance -= price;
  addExp(50);

  ownedItems.push(id);

  if (id === "end15") {
    triggerEnding();
  }

  localStorage.setItem("ownedItems", JSON.stringify(ownedItems));

  const afterLimit = getDailySlotLimit();
  const gainedLimit = afterLimit - beforeLimit;

  if (gainedLimit > 0) {
    todaySlotCount = Math.max(0, todaySlotCount - gainedLimit);
    localStorage.setItem("todaySlotCount", todaySlotCount);
  }

  history.unshift(
    `${getDateTime()} 🏪 ${item.name} 購入 -${price.toLocaleString()}円`,
  );

  const shopMessage = document.getElementById("shopMessage");

  if (shopMessage) {
    shopMessage.innerText = `${item.name} を購入しました！`;
  }

  save();

  updateShopDisplay();
};

function setAllText(id, text) {
  document.querySelectorAll(`#${id}`).forEach(function (el) {
    el.innerText = text;
  });
}

function updateShopDisplay() {
  const buffs = getShopBuffs();

  setAllText("buffSlotLimit", `${getDailySlotLimit()}回`);

  setAllText("buffPremiumRate", `${(getPremiumRate() * 100).toFixed(1)}%`);

  setAllText("buffContinueRate", `${Math.round(getContinueRate() * 100)}%`);

  setAllText("buffExpRate", `${getExpRate()}倍`);

  setAllText("buffGuerillaRate", `${Math.round(getGuerillaRate() * 100)}%`);

  setAllText("currentTitle", buffs.currentTitle);

document.body.classList.remove(
  "skin-black-gold",
  "skin-rainbow",
  "skin-dark",
  "skin-god",
  "skin-observer",
  "skin-void",
  "skin-causality",
  "skin-transcend",
  "skin-multiverse",
  "skin-collapse"
);

if (ownedItems.includes("skin10")) {
  document.body.classList.add("skin-collapse");

} else if (ownedItems.includes("skin9")) {
  document.body.classList.add("skin-multiverse");

} else if (ownedItems.includes("skin8")) {
  document.body.classList.add("skin-transcend");

} else if (ownedItems.includes("skin7")) {
  document.body.classList.add("skin-causality");

} else if (ownedItems.includes("skin6")) {
  document.body.classList.add("skin-void");

} else if (ownedItems.includes("skin5")) {
  document.body.classList.add("skin-observer");

} else if (ownedItems.includes("skin4")) {
  document.body.classList.add("skin-god");

} else if (ownedItems.includes("skin3")) {
  document.body.classList.add("skin-dark");

} else if (ownedItems.includes("skin2")) {
  document.body.classList.add("skin-rainbow");

} else if (ownedItems.includes("skin1")) {
  document.body.classList.add("skin-black-gold");
}

  const collectionList = document.getElementById("collectionList");

  if (collectionList) {
    if (ownedItems.length === 0) {
      collectionList.innerHTML = "未購入";
    } else {
      collectionList.innerHTML = ownedItems
        .map(function (id) {
          const item = shopItems[id];

          if (!item) {
            return "";
          }

          return `
<div class="collection-item">
【${item.name}】
</div>
`;
        })
        .join("");
    }
  }

Object.keys(shopItems).forEach(function (id) {
  const btn = document.getElementById(`shop-${id}`);
  if (!btn) return;

  const item = shopItems[id];
  const price = getItemPrice(item);

  btn.classList.remove("owned", "can-buy", "cant-buy", "locked");
  btn.disabled = false;

  if (item.unlockRebirth && rebirthCount < item.unlockRebirth) {
    btn.innerHTML = `
      🔒 ${item.name}<br>
      転生${item.unlockRebirth}回で解放
    `;
    btn.classList.add("locked");
    btn.disabled = true;
    return;
  }

  let effectText = "";

  if (item.slotBonus) effectText = `+${item.slotBonus}回/日`;
  if (item.premiumBonus) effectText = `確率+${(item.premiumBonus * 100).toFixed(1)}%`;
  if (item.continueBonus) effectText = `継続率+${Math.round(item.continueBonus * 100)}%`;
  if (item.doubleBuff) effectText = "全バフ2倍";
  if (item.specialTitle) effectText = "禁忌遺物";
  if (id === "end15") effectText = "観測終了";

btn.innerHTML = `
  <span class="item-name">${item.name}</span>
  <span class="item-price">${formatMoney(price)}</span>
  <small>${effectText}</small>
`;

if (ownedItems.includes(id)) {

  btn.classList.add("owned");
  btn.disabled = true;

  btn.insertAdjacentHTML(
    "beforeend",
    `<div class="buy-tag owned-tag">✅購入済</div>`
  );

} else if (balance >= price) {

  btn.classList.add("can-buy");

  btn.insertAdjacentHTML(
    "beforeend",
    `<div class="buy-tag can-tag">💸買える！</div>`
  );

} else {

  btn.classList.add("cant-buy");

  btn.insertAdjacentHTML(
    "beforeend",
    `<div class="buy-tag cant-tag">❌不足</div>`
  );

}
});
}

function showToast(text) {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");

    toast.id = "toast";

    document.body.appendChild(toast);
  }

  toast.innerText = text;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

window.compressMoney = function (baseCost, exp) {
  const cost = getCompressCost(baseCost);

  if (balance < cost) {
    showToast("残高が足りません");
    return;
  }

  balance -= cost;

  playerExp += exp;

  history.unshift(
    `${getDateTime()} 🌀資産圧縮 ${formatMoney(cost)} → EXP+${exp.toLocaleString()}`,
  );

  const msg = document.getElementById("compressMessage");

  if (msg) {
    msg.innerText = `🌀圧縮成功！ EXP+${exp.toLocaleString()}`;
  }

  save();

  showToast(`🌀資産圧縮成功\nEXP+${exp.toLocaleString()}`);
};

function updateCompressDisplay() {
  const compressItems = [
    { id: "compressCost1", cost: getCompressCost(10000000) },
    { id: "compressCost2", cost: getCompressCost(100000000) },
    { id: "compressCost3", cost: getCompressCost(1000000000) },
    { id: "compressCost4", cost: getCompressCost(1000000000000) },
    { id: "compressCost5", cost: getCompressCost(100000000000000) },
  ];

  compressItems.forEach(function (item) {
    setText(item.id, `${formatMoney(item.cost)}消費`);

    const costText = document.getElementById(item.id);
    if (!costText) return;

    const btn = costText.closest("button");
    if (!btn) return;

    btn.classList.remove("compress-can", "compress-cant");

    if (balance >= item.cost) {
      btn.classList.add("compress-can");
    } else {
      btn.classList.add("compress-cant");
    }
  });
}

function maybeTriggerAbyss() {
  if (abyssActive) return;

  if (Math.random() < 0.001) {
    triggerAbyssChallenge();
  }
}

function triggerAbyssChallenge() {
  const abyssCard = document.getElementById("abyssCard");
  const abyssGrid = document.getElementById("abyssGrid");
  const abyssActions = document.getElementById("abyssActions");

  if (!abyssCard || !abyssGrid || !abyssActions) return;

  abyssActive = true;
  abyssCard.style.display = "block";
  abyssGrid.innerHTML = "";
  abyssActions.style.display = "flex";

  setText("abyssMessage", "⚠️異常な資産変動を検知。\n深淵の裂け目が出現した。\n\n20秒以内に決断せよ。");
  
  let seconds = 20;
  setText("abyssTimer", `残り${seconds}秒`);

  abyssCard.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  if (abyssCountdown) {
    clearInterval(abyssCountdown);
  }

  abyssCountdown = setInterval(function () {
    seconds--;

    setText("abyssTimer", `残り${seconds}秒`);

    if (seconds <= 0) {
      history.unshift(`${getDateTime()} 🕳️奈落を拒絶 欲望に勝利`);
      closeAbyssChallenge("奈落は閉じた。\n貴様は欲望に勝利した。");
      save();
    }
  }, 1000);
}

function startAbyssGame() {
  const abyssGrid = document.getElementById("abyssGrid");
  const abyssActions = document.getElementById("abyssActions");

  if (!abyssGrid || !abyssActions) return;

  abyssActions.style.display = "none";
  abyssGrid.innerHTML = "";

  setText("abyssMessage", "9つの奈落。\n3つは本物。\n選べ。");

  abyssResults = [
    "bad",
    "bad",
    "bad",
    "money",
    "exp",
    "slot",
    "premium",
    "rush",
    "blessing",
  ].sort(() => Math.random() - 0.5);

  abyssResults.forEach(function (_, index) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "abyss-hole";
    btn.innerText = "🕳️";

    btn.onclick = function () {
      chooseAbyss(index);
    };

    abyssGrid.appendChild(btn);
  });
}

function declineAbyss() {
  history.unshift(`${getDateTime()} 🕳️奈落を拒絶 欲望に勝利`);
  closeAbyssChallenge("奈落を見なかったことにした。\n理性が勝利した。");
  save();
}

function chooseAbyss(index) {
  if (!abyssActive) return;

  const result = abyssResults[index];
  let message = "";

  if (result === "bad") {
    const base = Math.floor(balance * 0.1);
    const multiplier = Math.floor(Math.random() * 999) + 1;
    const penalty = Math.min(balance, base * multiplier);

    balance -= penalty;

playAbyssBadEffect();

    message =
      `☠️本物の奈落☠️\n` +
      `残高10% × ${multiplier}倍\n` +
      `-${formatMoney(penalty)}`;

    slotHistory.unshift(`${getDateTime()} 🕳️奈落OUT -${formatMoney(penalty)}`);
  }

if (result === "money") {
  let multiplier;

  const roll = Math.random();

if (roll < 0.50) {

  multiplier = Math.floor(Math.random() * 9) + 2;
  // 2～10倍

} else if (roll < 0.85) {

  multiplier = Math.floor(Math.random() * 40) + 10;
  // 10～49倍

} else if (roll < 0.97) {

  multiplier = Math.floor(Math.random() * 450) + 50;
  // 50～499倍

} else {

  multiplier = Math.floor(Math.random() * 500) + 500;
  // 500～999倍
}

  const reward = balance * (multiplier - 1);

  balance += reward;

  message =
    `💰黄金奈落💰\n` +
    `残高${multiplier}倍\n` +
    `+${formatMoney(reward)}`;

  slotHistory.unshift(
    `${getDateTime()} 🕳️黄金奈落 ${multiplier}倍 +${formatMoney(reward)}`
  );
}

  if (result === "exp") {
    playerExp = Math.max(1, playerExp * 1000);

    message =
      `🌌叡智奈落🌌\n` +
      `EXPが1000倍になった`;

    slotHistory.unshift(`${getDateTime()} 🕳️叡智奈落 EXP1000倍`);
  }

  if (result === "slot") {
    const remain = Math.max(1, getDailySlotLimit() - todaySlotCount);
    todaySlotCount = Math.max(0, todaySlotCount - remain * 99);

    localStorage.setItem("todaySlotCount", todaySlotCount);

    message =
      `🎰回転奈落🎰\n` +
      `スロット残回数が100倍になった`;

    slotHistory.unshift(`${getDateTime()} 🕳️回転奈落 残回数100倍`);
  }

  if (result === "premium") {
    nextSlotPremium = true;

    message =
      `🌈祝福奈落🌈\n` +
      `次回スロット、プレミア確定`;

    slotHistory.unshift(`${getDateTime()} 🕳️祝福奈落 次回プレミア確定`);
  }

  if (result === "rush") {
    premiumRush = true;

    setTimeout(function () {
      premiumRush = false;
    }, 60000);

    message =
      `⚡暴走奈落⚡\n` +
      `60秒間、プレミア率100%`;

    slotHistory.unshift(`${getDateTime()} 🕳️暴走奈落 プレミア率100%`);
  }

  if (result === "blessing") {
    playerExp += 100000;

    message =
      `👑深淵の加護👑\n` +
      `EXP+100,000`;

    slotHistory.unshift(`${getDateTime()} 🕳️深淵の加護 EXP+100,000`);
  }

setText("abyssMessage", message);

const buttons = document.querySelectorAll(".abyss-hole");
if (buttons[index]) {
  buttons[index].disabled = true;
  buttons[index].innerText = "済";
  buttons[index].classList.add("used");
}

save();
}

function closeAbyssChallenge(message) {
  const abyssCard = document.getElementById("abyssCard");

  if (abyssCountdown) {
    clearInterval(abyssCountdown);
    abyssCountdown = null;
  }

  abyssActive = false;

  if (message) {
    setText("abyssTimer", message);
  }

  if (abyssCard) {
    setTimeout(function () {
      abyssCard.style.display = "none";
    }, 1500);
  }
}

function playAbyssBadEffect() {
  document.body.classList.add("abyss-bad-effect");

  setTimeout(function () {
    document.body.classList.remove("abyss-bad-effect");
  }, 800);
}

function showDebtModal() {
  const modal = document.getElementById("debtModal");
  const debtText = document.getElementById("debtText");

  if (!modal || !debtText) return;

  debtText.innerText =
`世界政府 財務監視局より通達

資産消失を確認

対象個体：
Lv${getLevel()}
「${getRankTitle()}」

生活維持不能個体に指定

債務ランク +1

救済契約を締結しますか？`;

  modal.style.display = "flex";
}

function acceptDebt() {
  const beforeDebtTitle = getDebtTitle();

  debtorLevel++;
  balance = 500;

  const afterDebtTitle = getDebtTitle();
  const debtRank = getDebtRank();

  history.unshift(
    `${getDateTime()} ☠️債務認定 Lv${debtorLevel}「${afterDebtTitle}」`
  );

  document.getElementById("debtModal").style.display = "none";

  alert("🪙創造主の慈悲🪙\n\n500円を付与\n\n『次は計画的に使え』");

  if (beforeDebtTitle !== afterDebtTitle) {
    alert(
      `☠️ 債務ランクアップ ☠️\n\n新称号\n${afterDebtTitle}\n\n${debtRank.comment}`
    );
  }

  save();
}

function showSlotLimitMessage() {

  alert(
`スロット回数がゼロになりました！`
  );

  setTimeout(function () {

    document.body.classList.add("demon-arrival");

    setTimeout(function () {

      document.body.classList.remove("demon-arrival");

      offerDemonContract();

    }, 900);

  }, 1000);

}

function offerDemonContract() {

  const fee =
    100000 * Math.pow(10, demonContractCount);

  const taxRate =
    Math.min(0.95, 0.70 + demonContractCount * 0.05);

  const tax =
    Math.floor(balance * taxRate);

  const totalCost =
    fee + tax;

  const yes = confirm(
`？？？
${getDemonComment()}
- - - - - - - - - - - - 
手数料 ${formatMoney(fee)}
残高 ${(taxRate * 100).toFixed(0)}%

支払えば
スロット50回復旧
- - - - - - - - - - - - 
契約する？`
  );

  if (!yes) {

    alert(
`
？？？
「ふむ。」

「利口なヤツだったか。」

？？？は去っていった…`
    );

    return;
  }

  if (balance < totalCost) {

    alert(
`がっはっはっ‼︎
おもしろい奴だ。
金が足りんぞ？`
    );

    return;
  }

  balance -= totalCost;

  todaySlotCount =
    Math.max(0, todaySlotCount - 50);

  localStorage.setItem(
    "todaySlotCount",
    todaySlotCount
  );

  demonContractCount++;

  localStorage.setItem(
    "demonContractCount",
    demonContractCount
  );

  history.unshift(
`${getDateTime()} 😈悪魔契約
-${formatMoney(totalCost)}
スロット+50回`
  );

  alert(
`？？？
「がっはっはっは！！」

「人間とは愚かなものだ。」

「契約成立だ。」
？？？は去っていった…`
  );

  save();
}

function rejectDebt() {
  document.getElementById("debtModal").style.display = "none";

  localStorage.setItem("balance", balance);
  update();

  alert(
`☠️ GAME OVER ☠️

世界は貴様を見捨てた。`
  );
}

function triggerEnding() {
  const modal = document.getElementById("endingModal");
  const text = document.getElementById("endingText");
  const btn = document.getElementById("newGamePlusBtn");

  if (!modal || !text || !btn) return;

  btn.style.display = "none";
  modal.style.display = "flex";

const finalLevel = getLevel();
const finalRank = getRankTitle();
const finalDebtTitle = getDebtTitle();
const finalEvaluation = getFinalEvaluation();
const finalArtifact = getShopBuffs().currentTitle;

  text.innerText = `
貨幣は意味を失った。

借金は意味を失った。

資産は意味を失った。

世界は意味を失った。



最後に残ったのは

観測者である貴様だけだった。



誰も到達できなかった場所。

誰も数え切れなかった数字。

誰も理解できなかった領域。



貴様は

500円の果てを見た。



そして今、

500円という物語は終わる。



――観測終了――







【 STAFF ROLL 】

企画
えなみ

システム設計
えなみ

ゲームバランス崩壊担当
えなみ

借金認定委員会
えなみ

奈落管理局
えなみ

世界政府 財務監視局
えなみ

最終観測者
えなみ







Special Thanks

毎日500円を我慢した人

コンビニで悩んだ人

無駄遣いした人

借金した人

そして

最後までプレイした貴様へ

────────────────

最終観測結果

────────────────

プレイヤーLv
${finalLevel}

転生回数
${rebirthCount}回

最終称号
${finalRank}

最終遺物
${finalArtifact}

債務Lv
${debtorLevel}

債務称号
${finalDebtTitle}

最高残高
${formatMoney(stats.bestBalance)}

総プレイ回数
${stats.totalPlays.toLocaleString()}回

総賭け金
${formatMoney(stats.totalBet)}

総獲得金額
${formatMoney(stats.totalReward)}

世界政府評価
${finalEvaluation}





────────────────

500円 LIFE

COMPLETE

達成率 100%

観測率 100%

借金率 不明

生活維持率 不明

世界存続率 0%

────────────────







・・・

？？？

【世界政府 財務監視局】

お疲れ様でした。

なお、

現実世界の残高には

一切影響ありません。

ご利用ありがとうございました。

・・・

ところで

明日の500円は？
`;

  setTimeout(function () {
    btn.style.display = "block";
  }, 80000);
}

function startNewGamePlus() {
  balance = 500;
  playerExp = 0;
  todaySlotCount = 0;
  slotHistory.unshift(`${getDateTime()} ▶ NEW GAME+ 初期残高500円`);

  localStorage.setItem("balance", balance);
  localStorage.setItem("playerExp", playerExp);
  localStorage.setItem("todaySlotCount", todaySlotCount);

  document.getElementById("endingModal").style.display = "none";

  alert("初期残高\n\n500円\n\n500円 LIFE Ver.2\n\nようこそ。");

  save();
}

function getFinalEvaluation() {
  if (debtorLevel >= 500) return "負債災害指定個体";
  if (debtorLevel >= 100) return "危険観測対象";
  if (debtorLevel >= 50) return "要監視対象";
  if (debtorLevel >= 10) return "要観察個体";
  return "優良観測個体";
}