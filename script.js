let balance = Number(localStorage.getItem("balance")) || 0;
let history = JSON.parse(localStorage.getItem("history")) || [];
let slotHistory = JSON.parse(localStorage.getItem("slotHistory")) || [];
let playerExp = Number(localStorage.getItem("playerExp")) || 0;
let rebirthCount = Number(localStorage.getItem("rebirthCount")) || 0;

let todaySlotCount = Number(localStorage.getItem("todaySlotCount")) || 0;

let lastSlotDate = localStorage.getItem("lastSlotDate") || "";

let stats = JSON.parse(localStorage.getItem("stats")) || {
  bestBalance: balance,
  bestWin: 0,
  totalPlays: 0,
  totalBet: 0,
  totalReward: 0,
};

const symbols = ["🍄", "🌶️", "🐊", "🍒", "🎰", "💰", "☄️"];

const payout = {
  "🍒": 3,
  "🍄": 5,
  "🐊": 8,
  "🌶️": 12,
  "💰": 20,
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

  history.unshift(`${getDateTime()} +15000円 給料`);

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

function playSlot() {
  if (spinning && !spinTimer) {
    spinning = false;
  }

  console.log("spinning", spinning, "spinTimer", spinTimer);

  if (spinning) return;

  resetSlotCountIfNeeded();

  if (todaySlotCount >= getDailySlotLimit()) {
    alert(`今日は${getDailySlotLimit()}回まで！`);
    return;
  }

  if (balance <= 0) {
    alert("残高がないのでスロットできません！");
    return;
  }

  const maxBet = Math.min(balance, Math.max(5, Math.floor(balance * 0.1)));

  let bet = Number(document.getElementById("betAmount").value);

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

  playCoinSound();
  addExp(3);

  spinning = true;
  stopFlags = [false, false, false];
  currentBet = bet;
  isPremium = Math.random() < getPremiumRate();

  currentResult = [];

  for (let i = 0; i < 9; i++) {
    currentResult.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }

  if (isPremium) {
    currentResult[3] = "🎰";
    currentResult[4] = "🎰";
    currentResult[5] = "🎰";
  }

  for (let i = 0; i < 9; i++) {
    const cell = document.getElementById(`cell${i}`);

    cell.classList.remove("hit");
  }

document.getElementById("betDisplay").innerText = formatMoney(bet);

document.getElementById("payoutDisplay").innerText = formatMoney(0);

  document.getElementById("gogoLamp").classList.remove("on");
  document.getElementById("gogoLamp").classList.remove("premium");

  document.querySelector(".diagonal-left").classList.remove("show");
  document.querySelector(".diagonal-right").classList.remove("show");

  if (isPremium) {
    document.getElementById("gogoLamp").classList.add("premium");
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

  todaySlotCount++;

  localStorage.setItem("todaySlotCount", todaySlotCount);

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

    document.getElementById("gogoLamp").classList.add("on");
    document.getElementById("payoutDisplay").innerText =
  formatMoney(0);

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
  } else {
    balance -= bet;

document.getElementById("payoutDisplay").innerText = formatMoney(0);

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
                                                                                                                                                                                                                                                                                                                                                                                                                                                                        ⚡⚡⚡`,
      )
    ) {
      triggerTimingChallenge();
    }
  }

  isPremium = false;
}

function save() {
  if (balance > stats.bestBalance) {
    stats.bestBalance = balance;
  }

  localStorage.setItem("balance", balance);
  localStorage.setItem("history", JSON.stringify(history));
  localStorage.setItem("slotHistory", JSON.stringify(slotHistory));
  localStorage.setItem("stats", JSON.stringify(stats));
  localStorage.setItem("playerExp", playerExp);

  update();
}

function update() {
  resetSlotCountIfNeeded();

  if (balance > stats.bestBalance) {
    stats.bestBalance = balance;
    localStorage.setItem("stats", JSON.stringify(stats));
    localStorage.setItem("playerExp", playerExp);
  }

  document.getElementById("balance").innerText = formatMoney(balance);

  document.getElementById("history").innerHTML = history
    .map((x) => `<li>${x}</li>`)
    .join("");

  const slotHistoryList = document.getElementById("slotHistory");

  if (slotHistoryList) {
    slotHistoryList.innerHTML = slotHistory
      .map((x) => `<li>${x}</li>`)
      .join("");
  }

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

  /* ゲリラ中は賭け金を常に現在残高へ同期 */
  const timingBet = document.getElementById("timingBet");
  const timingCard = document.getElementById("timingCard");

  if (timingBet && timingCard && timingCard.style.display !== "none") {
    timingBet.value = balance;
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

function playPremiumSound() {
  playTone(520, 120, "triangle", 0.05);

  setTimeout(function () {
    playTone(780, 120, "triangle", 0.05);
  }, 120);

  setTimeout(function () {
    playTone(1040, 180, "triangle", 0.05);
  }, 240);
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

  const timingBet = document.getElementById("timingBet");

  if (timingBet) {
    timingBet.value = balance;
  }

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

function stopTiming() {
  if (!timingRunning) return;

  timingRunning = false;
  clearInterval(timingInterval);

  const bet = Number(document.getElementById("timingBet").value);
  let message = "";

  if (timingPosition >= 49.8 && timingPosition <= 50.2) {
    const multiplier = getTimingMultiplier();
    const reward = bet * multiplier;

    if (multiplier >= 999) {
      message = `🌈🌈🌈
神降臨
${multiplier}倍
+${formatMoney(reward)}
🌈🌈🌈`;

      alert(`🌈 ${multiplier}倍 JACKPOT！ 🌈`);
      document.body.classList.add("skin-rainbow");

      setTimeout(function () {
        document.body.classList.remove("skin-rainbow");
      }, 5000);
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
    playWinSound();

    setTimeout(playWinSound, 150);
    setTimeout(playWinSound, 300);
    setTimeout(playWinSound, 450);
    setTimeout(playWinSound, 600);
    setTimeout(playWinSound, 750);
  } else if (timingPosition >= 49.2 && timingPosition <= 50.8) {
    message = `🛡️SAFE！ ±0円`;
  } else {
    const penalty = bet * 10;
    balance -= penalty;
    message = `💥OUT！ -${formatMoney(penalty)}`;
  }

  document.getElementById("timingMessage").innerText = message;

  slotHistory.unshift(`${getDateTime()} 🎯 ${message}`);

  const timingBet = document.getElementById("timingBet");

  if (timingBet) {
    timingBet.value = balance;
  }

  save();

  const btn = document.getElementById("timingMainBtn");

  if (btn) {
    btn.innerText = "スタート";
  }
}

const rankTable = [
  { level: 1, title: "小銭に選ばれし者" },
  { level: 2, title: "500円の目覚め" },
  { level: 3, title: "財布の観測者" },
  { level: 4, title: "節約因子保有者" },
  { level: 5, title: "青銅の倹約者" },
  { level: 6, title: "支出を拒む者" },
  { level: 7, title: "予算の番人" },
  { level: 8, title: "小銭結界師" },
  { level: 9, title: "残高の守護者" },
  { level: 10, title: "金色硬貨の契約者" },
  { level: 15, title: "節約魔導士" },
  { level: 20, title: "小銭錬金術師" },
  { level: 25, title: "節約の使徒" },
  { level: 30, title: "500円錬成師" },
  { level: 35, title: "生活防衛司令官" },
  { level: 40, title: "500円覇道者" },
  { level: 45, title: "小銭の聖域守護者" },
  { level: 50, title: "黄金倹約王" },
  { level: 55, title: "小銭王国の支配者" },
  { level: 60, title: "物欲を焼き尽くす者" },
  { level: 65, title: "残高因果律操作官" },
  { level: 70, title: "500円教団大司教" },
  { level: 75, title: "欲望を喰らう皇帝" },
  { level: 80, title: "家計秩序の創造主" },
  { level: 85, title: "貯蓄次元の開門者" },
  { level: 90, title: "金運臨界突破者" },
  { level: 95, title: "500円輪廻皇" },
  { level: 100, title: "節約神格" },
  { level: 150, title: "財布宇宙の管理者" },
  { level: 200, title: "物欲崩壊の預言者" },
  { level: 250, title: "金運特異点" },
  { level: 300, title: "貯蓄銀河の覇者" },
  { level: 350, title: "500円因果律の支配者" },
  { level: 400, title: "支出概念の破壊者" },
  { level: 450, title: "家計終焉の観測神" },
  { level: 500, title: "黄金硬貨の創世主" },
  { level: 550, title: "節約次元の絶対者" },
  { level: 600, title: "500円宇宙皇帝" },
  { level: 650, title: "残高無限機関" },
  { level: 700, title: "欲望消滅の執行神" },
  { level: 750, title: "小銭神話の終着点" },
  { level: 800, title: "金運虚空の王" },
  { level: 850, title: "500円多元宇宙の覇神" },
  { level: 900, title: "支出なき世界の創造者" },
  { level: 950, title: "節約終焉体" },
  { level: 1000, title: "500円原初神" },
];

function addExp(amount) {
  playerExp += Math.floor(amount * getExpRate());

  localStorage.setItem("playerExp", playerExp);
}

function getLevel() {
  return Math.min(1000, Math.floor(Math.sqrt(playerExp / 10)) + 1);
}

function getRankTitle() {
  const level = getLevel();
  let title = "小銭に選ばれし者";

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
    premiumBonus: Math.floor(level / 20) * 0.001,
    guerillaBonus: Math.floor(level / 50),
    continueBonus: Math.floor(level / 200) * 0.1,
  };
}

const shopItems = {
  title1: {
    name: "🏅節約の見習い",
    price: 1000000,
    type: "title",
    slotBonus: 5,
  },
  title2: {
    name: "⚜️資産形成士",
    price: 10000000,
    type: "title",
    slotBonus: 10,
  },
  title3: {
    name: "💰億劫な浪費家を超えし者",
    price: 100000000,
    type: "title",
    slotBonus: 15,
  },
  title4: {
    name: "👑500円皇帝",
    price: 1000000000,
    type: "title",
    slotBonus: 20,
  },
  title5: {
    name: "🌌500円宇宙の支配者",
    price: 10000000000,
    type: "title",
    slotBonus: 50,
  },

  skin1: {
    name: "🎨黒金スキン",
    price: 5000000,
    type: "skin",
  },

  skin2: {
    name: "🌈レインボー覚醒",
    price: 50000000,
    type: "skin",
  },

  skin3: {
    name: "☠️奈落モード",
    price: 500000000,
    type: "skin",
  },

  effect1: {
    name: "✨GOGO覚醒",
    price: 10000000,
    type: "effect",
    continueBonus: 0.1,
  },
  effect2: {
    name: "🔥BIG BONUS極",
    price: 100000000,
    type: "effect",
    continueBonus: 0.2,
  },
  effect3: {
    name: "🌈プレミアサウンドパック",
    price: 1000000000,
    type: "effect",
    continueBonus: 0.3,
  },

  end1: {
    name: "🏯500円王国建設",
    price: 100000000000,
    type: "end",
    slotBonus: 100,
  },
  end2: {
    name: "🌎500円文明創造",
    price: 1000000000000,
    type: "end",
    premiumBonus: 0.02,
  },
  end3: {
    name: "🚀500円銀河開拓",
    price: 10000000000000,
    type: "end",
    continueBonus: 0.5,
  },
  end4: {
    name: "⭐500円宇宙創造",
    price: 1000000000000000,
    type: "end",
    doubleBuff: true,
  },
  end5: {
    name: "♾️500円という概念",
    price: 10000000000000000,
    type: "end",
    specialTitle: "♾️500円そのもの",
  },
  end6: {
    name: "🕳️500円特異点",
    price: 100000000000000000,
    type: "end",
    specialTitle: "🕳️節約の終焉",
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

  return 50 + buffs.slotBonus + levelBuffs.slotBonus + rebirth.slotBonus;
}

function getPremiumRate() {
  const buffs = getShopBuffs();
  const levelBuffs = getLevelBuffs();
  const rebirth = getRebirthBuffs();

  return (
    0.005 + buffs.premiumBonus + levelBuffs.premiumBonus + rebirth.premiumBonus
  );
}

function getContinueRate() {
  const buffs = getShopBuffs();
  const levelBuffs = getLevelBuffs();
  const rebirth = getRebirthBuffs();

  return buffs.continueBonus + levelBuffs.continueBonus + rebirth.continueBonus;
}

function getExpRate() {
  return 1 + rebirthCount;
}

function getGuerillaRate() {
  return 0.03;
}

function getRebirthBuffs() {
  return {
    slotBonus: rebirthCount * 20,
    premiumBonus: rebirthCount * 0.002,
    continueBonus: rebirthCount * 0.1,
  };
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

  balance -= price;
  addExp(50);

  ownedItems.push(id);

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
  );

  if (ownedItems.includes("skin3")) {
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

          return `<div class="collection-item">${item.name}</div>`;
        })
        .join("");
    }
  }

  Object.keys(shopItems).forEach(function (id) {
    const btn = document.getElementById(`shop-${id}`);

    if (!btn) return;

    const item = shopItems[id];
    const price = getItemPrice(item);

    Object.keys(shopItems).forEach(function (id) {
      const btn = document.getElementById(`shop-${id}`);

      if (!btn) return;

      const item = shopItems[id];
      const price = getItemPrice(item);

      let effectText = "";

      if (item.slotBonus) {
        effectText = `+${item.slotBonus}回/日`;
      }

      if (item.premiumBonus) {
        effectText = `確変率+${(item.premiumBonus * 100).toFixed(1)}%`;
      }

      if (item.continueBonus) {
        effectText = `継続率+${Math.round(item.continueBonus * 100)}%`;
      }

      if (item.doubleBuff) {
        effectText = "全バフ2倍";
      }

      if (item.specialTitle) {
        effectText = "称号解放";
      }

      btn.innerHTML = `
                                                                                    ${item.name}<br>
                                                                                    ${formatMoney(price)}<br>
                                                                                    <small>${effectText}</small>
                                                                                  `;

      if (ownedItems.includes(id)) {
        btn.classList.add("owned");
        btn.disabled = true;
      } else {
        btn.classList.remove("owned");
        btn.disabled = false;
      }
    });

    if (ownedItems.includes(id)) {
      btn.classList.add("owned");
      btn.disabled = true;
    } else {
      btn.classList.remove("owned");
      btn.disabled = false;
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
  setText("compressCost1", `${formatMoney(getCompressCost(10000000))}消費`);
  setText("compressCost2", `${formatMoney(getCompressCost(100000000))}消費`);
  setText("compressCost3", `${formatMoney(getCompressCost(1000000000))}消費`);
  setText("compressCost4", `${formatMoney(getCompressCost(1000000000000))}消費`);
  setText("compressCost5", `${formatMoney(getCompressCost(100000000000000))}消費`);
}