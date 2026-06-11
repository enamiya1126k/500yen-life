let balance = Number(localStorage.getItem("balance")) || 0;
let history = JSON.parse(localStorage.getItem("history")) || [];
let slotHistory = JSON.parse(localStorage.getItem("slotHistory")) || [];

let todaySlotCount =
Number(localStorage.getItem("todaySlotCount")) || 0;

let lastSlotDate =
localStorage.getItem("lastSlotDate") || "";

let stats = JSON.parse(localStorage.getItem("stats")) || {
    bestBalance: balance,
    bestWin: 0,
    totalPlays: 0,
    totalBet: 0,
    totalReward: 0
};

const symbols = ["🍄","🌶️","🐊","🍒","🎰","💰","☄️"];

const payout = {
    "🍒": 3,
    "🍄": 5,
    "🐊": 8,
    "🌶️": 12,
    "💰": 20,
    "☄️": 30,
    "🎰": 50
};

let spinning = false;
let stopFlags = [false, false, false];
let currentResult = [];
let currentBet = 0;
let spinTimer = null;
let isPremium = false;

let timingInterval = null;
let timingPosition = 0;
let timingDirection = 1;
let timingRunning = false;

window.onload = function(){

    const lastBet =
    localStorage.getItem("lastBet");

    if(lastBet){
        document.getElementById("betAmount").value =
        lastBet;

        document.getElementById("betDisplay").innerText =
        lastBet;
    }

    update();
};

document.getElementById("dailyBtn").onclick = function(){

    const today = new Date().toDateString();

    if(localStorage.getItem("lastDaily") === today){
        alert("今日はもう受け取ってる！");
        return;
    }

    balance += 500;

    history.unshift(
        `${getDateTime()} +500円`
    );

    localStorage.setItem(
        "lastDaily",
        today
    );

    save();
};

document.getElementById("salaryBtn").onclick = function(){

    const now = new Date();

    if(now.getDate() !== 25){
        alert("25日しか受け取れない！");
        return;
    }

    const monthKey =
    `${now.getFullYear()}-${now.getMonth()+1}`;

    if(localStorage.getItem("salaryMonth") === monthKey){
        alert("今月は受取済み！");
        return;
    }

    balance += 15000;

    history.unshift(
        `${getDateTime()} +15000円 給料`
    );

    localStorage.setItem(
        "salaryMonth",
        monthKey
    );

    save();
};

function addExpense(){

    const amount =
    Number(document.getElementById("expense").value);

    if(!amount) return;

    balance -= amount;

    history.unshift(
        `${getDateTime()} -${amount}円`
    );

    save();

    document.getElementById("expense").value = "";
}

function resetSlotCountIfNeeded(){

    const today = new Date().toDateString();

    if(lastSlotDate !== today){

        todaySlotCount = 0;
        lastSlotDate = today;

        localStorage.setItem(
            "todaySlotCount",
            todaySlotCount
        );

        localStorage.setItem(
            "lastSlotDate",
            lastSlotDate
        );
    }
}

function playSlot(){

    if(spinning) return;

    resetSlotCountIfNeeded();

    if(todaySlotCount >= 50){
        alert("今日は50回まで！");
        return;
    }

    if(balance <= 0){
        alert("残高がないのでスロットできません！");
        return;
    }

    const bet =
    Number(document.getElementById("betAmount").value);

    const maxBet =
    Math.min(balance, Math.max(5, Math.floor(balance * 0.1)));

    if(!bet || bet <= 0){
        alert("賭け金を入力してね！");
        return;
    }

    if(bet > maxBet){
        alert(`賭け金は残高の10%まで！最大${maxBet}円だよ`);
        return;
    }

    if(bet > balance){
        alert("残高が足りない！");
        return;
    }

    playCoinSound();

    spinning = true;
    stopFlags = [false, false, false];
    currentBet = bet;
    isPremium = Math.random() < 0.005;

    currentResult = [];

    for(let i = 0; i < 9; i++){
        currentResult.push(
            symbols[Math.floor(Math.random() * symbols.length)]
        );
    }

    if(isPremium){
        currentResult[3] = "🎰";
        currentResult[4] = "🎰";
        currentResult[5] = "🎰";
    }

    for(let i = 0; i < 9; i++){
        const cell =
        document.getElementById(`cell${i}`);

        cell.classList.remove("hit");
    }

    document.getElementById("betDisplay").innerText = bet;
    document.getElementById("payoutDisplay").innerText = 0;

    document.getElementById("gogoLamp").classList.remove("on");
    document.getElementById("gogoLamp").classList.remove("premium");

    document.querySelector(".diagonal-left").classList.remove("show");
    document.querySelector(".diagonal-right").classList.remove("show");

    if(isPremium){

        document.getElementById("gogoLamp").classList.add("premium");
        document.getElementById("slotMessage").innerText =
        "🌈プレミア気配…！";

        playPremiumSound();

    }else{

        document.getElementById("slotMessage").innerText =
        "STOPを押して";
    }

    spinTimer = setInterval(function(){

        for(let col = 0; col < 3; col++){

            if(stopFlags[col]) continue;

            for(let row = 0; row < 3; row++){

                const index = row * 3 + col;

                document.getElementById(`cell${index}`).innerText =
                symbols[Math.floor(Math.random() * symbols.length)];
            }
        }

    }, 70);
}

window.stopReel = function(col){

    if(!spinning) return;
    if(stopFlags[col]) return;

    stopFlags[col] = true;

    playStopSound();

    for(let row = 0; row < 3; row++){

        const index = row * 3 + col;

        document.getElementById(`cell${index}`).innerText =
        currentResult[index];
    }

    if(stopFlags[0] && stopFlags[1] && stopFlags[2]){

        clearInterval(spinTimer);
        spinTimer = null;
        spinning = false;

        finishSlot(currentResult, currentBet);
    }
};

function finishSlot(result, bet){

    const lines = [
        [0,1,2],
        [3,4,5],
        [6,7,8],
        [0,3,6],
        [1,4,7],
        [2,5,8],
        [0,4,8],
        [6,4,2]
    ];

    let totalReward = 0;
    let hitLines = [];

    lines.forEach(function(line){

        const a = result[line[0]];
        const b = result[line[1]];
        const c = result[line[2]];

        if(a === b && b === c){

            let reward = bet * payout[a];

            if(isPremium){
                reward *= 10;
            }

            totalReward += reward;

            hitLines.push({
                line: line,
                symbol: a,
                reward: reward,
                rate: payout[a]
            });
        }
    });

    stats.totalPlays += 1;
    stats.totalBet += bet;

    todaySlotCount++;

    localStorage.setItem(
        "todaySlotCount",
        todaySlotCount
    );

    let message = "";

    if(hitLines.length > 0){

        balance += totalReward;
        stats.totalReward += totalReward;

        if(totalReward > stats.bestWin){
            stats.bestWin = totalReward;
        }

        hitLines.forEach(function(hit){

            hit.line.forEach(function(index){

                document.getElementById(`cell${index}`).classList.add("hit");
            });
        });

        document.getElementById("gogoLamp").classList.add("on");
        document.getElementById("payoutDisplay").innerText = totalReward;

        hitLines.forEach(function(hit){

            if(hit.line.toString() === [0,4,8].toString()){
                document.querySelector(".diagonal-left").classList.add("show");
            }

            if(hit.line.toString() === [6,4,2].toString()){
                document.querySelector(".diagonal-right").classList.add("show");
            }
        });

        playWinSound();

        if(isPremium){
            message = `🌈レインボーGOGO！ +${totalReward}円`;
        }else if(hitLines.length >= 3){
            message = `💥BIG BONUS💥 +${totalReward}円`;
        }else if(hitLines.length >= 2){
            message = `🔥SUPER HIT🔥 +${totalReward}円`;
        }else{
            message = `HIT +${totalReward}円`;
        }

    }else{

        balance -= bet;

        document.getElementById("payoutDisplay").innerText = 0;

        message = `ハズレ… -${bet}円`;
    }

    document.getElementById("slotMessage").innerText = message;

    slotHistory.unshift(
        `${getDateTime()} 🎰 ${result.join("")} ${message}`
    );

    save();

    isPremium = false;
}

function save(){

    if(balance > stats.bestBalance){
        stats.bestBalance = balance;
    }

    localStorage.setItem("balance", balance);
    localStorage.setItem("history", JSON.stringify(history));
    localStorage.setItem("slotHistory", JSON.stringify(slotHistory));
    localStorage.setItem("stats", JSON.stringify(stats));

    update();
}

function update(){

    resetSlotCountIfNeeded();

    if(balance > stats.bestBalance){
        stats.bestBalance = balance;
        localStorage.setItem("stats", JSON.stringify(stats));
    }

    document.getElementById("balance").innerText =
    balance.toLocaleString() + "円";

    document.getElementById("history").innerHTML =
    history.map(x => `<li>${x}</li>`).join("");

    const slotHistoryList =
    document.getElementById("slotHistory");

    if(slotHistoryList){

        slotHistoryList.innerHTML =
        slotHistory.map(x => `<li>${x}</li>`).join("");
    }

    const maxBetText =
    document.getElementById("maxBetText");

    if(maxBetText){

        maxBetText.innerText =
        `最大賭け金：${Math.min(balance, Math.max(5, Math.floor(balance * 0.1))).toLocaleString()}円`;
    }

    const betDisplay =
    document.getElementById("betDisplay");

    if(betDisplay){

        betDisplay.innerText =
        document.getElementById("betAmount").value || 5;
    }

    const remainSlot =
    Math.max(0, 50 - todaySlotCount);

    setText(
        "slotLimit",
        `${remainSlot}回`
    );

    updateStats();
    updateTimers();
}

function updateStats(){

    if(balance > stats.bestBalance){
        stats.bestBalance = balance;
    }

    const profit =
    stats.totalReward - stats.totalBet;

    setText("bestBalance", `${stats.bestBalance.toLocaleString()}円`);
    setText("bestWin", `${stats.bestWin.toLocaleString()}円`);
    setText("totalPlays", `${stats.totalPlays.toLocaleString()}回`);
    setText("totalBet", `${stats.totalBet.toLocaleString()}円`);
    setText("totalReward", `${stats.totalReward.toLocaleString()}円`);
    setText("slotProfit", `${profit.toLocaleString()}円`);

    localStorage.setItem(
        "stats",
        JSON.stringify(stats)
    );
}

function setText(id, text){

    const el =
    document.getElementById(id);

    if(el){
        el.innerText = text;
    }
}

window.setBet = function(amount){

    document.getElementById("betAmount").value = amount;
    document.getElementById("betDisplay").innerText = amount;

    localStorage.setItem("lastBet", amount);
};

window.setMaxBet = function(){

    const maxBet = Math.min(balance,
        Math.max(5, Math.floor(balance * 0.1)));

    document.getElementById("betAmount").value = maxBet;
    document.getElementById("betDisplay").innerText = maxBet;

    localStorage.setItem("lastBet", maxBet);
};

function getDateTime(){

    const now = new Date();

    return now.toLocaleDateString() + " " +
    now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

document.addEventListener("DOMContentLoaded", function(){

    window.resetHistory = function(){

        if(confirm("生活履歴をリセットする？")){

            history = [];
            save();
        }
    };

    window.resetSlotHistory = function(){

        if(confirm("スロット履歴をリセットする？")){

            slotHistory = [];
            save();
        }
    };
});

function playTone(freq, duration, type = "square", volume = 0.05){

    const AudioContext =
    window.AudioContext || window.webkitAudioContext;

    const audioCtx =
    new AudioContext();

    const oscillator =
    audioCtx.createOscillator();

    const gainNode =
    audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = freq;

    gainNode.gain.value = volume;

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();

    setTimeout(function(){

        oscillator.stop();
        audioCtx.close();

    }, duration);
}

function playCoinSound(){

    playTone(880, 80, "square", 0.04);

    setTimeout(function(){

        playTone(1320, 90, "square", 0.04);

    }, 90);
}

function playStopSound(){

    playTone(300, 60, "square", 0.035);
}

function playWinSound(){

    playTone(660, 120, "triangle", 0.05);

    setTimeout(function(){

        playTone(880, 120, "triangle", 0.05);

    }, 120);

    setTimeout(function(){

        playTone(1320, 180, "triangle", 0.05);

    }, 240);
}

function playPremiumSound(){

    playTone(520, 120, "triangle", 0.05);

    setTimeout(function(){

        playTone(780, 120, "triangle", 0.05);

    }, 120);

    setTimeout(function(){

        playTone(1040, 180, "triangle", 0.05);

    }, 240);
}

function updateTimers(){

    const now = new Date();

    const todayKey =
    now.toDateString();

    const lastDaily =
    localStorage.getItem("lastDaily");

    const dailyTimer =
    document.getElementById("dailyTimer");

    if(dailyTimer){

        if(lastDaily === todayKey){

            const tomorrow =
            new Date();

            tomorrow.setDate(
                now.getDate() + 1
            );

            tomorrow.setHours(
                0, 0, 0, 0
            );

            const diffMs =
            tomorrow - now;

            const hours =
            Math.ceil(diffMs / (1000 * 60 * 60));

            dailyTimer.innerText =
            `あと${hours}時間`;

        }else{

            dailyTimer.innerText =
            "受取OK";
        }
    }

    const salaryTimer =
    document.getElementById("salaryTimer");

    if(salaryTimer){

        let next25 =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            25
        );

        if(now.getDate() > 25){

            next25 =
            new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                25
            );
        }

        const diffMs =
        next25 - now;

        const days =
        Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if(now.getDate() === 25){

            salaryTimer.innerText =
            "受取OK";

        }else{

            salaryTimer.innerText =
            `あと${days}日`;
        }
    }
}

window.toggleTiming = function(){

    const btn =
    document.getElementById("timingMainBtn");

    if(!timingRunning){

        startTiming();

        if(timingRunning && btn){
            btn.innerText = "STOP";
        }

    }else{

        stopTiming();

        if(btn){
            btn.innerText = "スタート";
        }
    }
};

function startTiming(){

    if(timingRunning){
        return;
    }

    const bet =
    Number(document.getElementById("timingBet").value);

    if(!bet || bet <= 0){
        alert("賭け金を入力してね！");
        return;
    }

    if(bet > balance){
        alert("残高不足！");
        return;
    }

    timingRunning = true;
    timingPosition = 0;
    timingDirection = 1;

    const cursor =
    document.getElementById("timingCursor");

    if(cursor){
        cursor.style.left = "0%";
    }

    timingInterval =
    setInterval(function(){

        timingPosition +=
        5 * timingDirection;

        if(timingPosition >= 100){

            timingPosition = 100;
            timingDirection = -1;
        }

        if(timingPosition <= 0){

            timingPosition = 0;
            timingDirection = 1;
        }

        if(cursor){

            cursor.style.left =
            timingPosition + "%";
        }

    }, 10);

    document.getElementById("timingMessage").innerText =
    "STOPを押せ！";
}

function stopTiming(){

    if(!timingRunning){
        return;
    }

    timingRunning = false;

    clearInterval(
        timingInterval
    );

    const bet =
    Number(document.getElementById("timingBet").value);

    let message = "";

if(timingPosition >= 48 && timingPosition <= 52){

    const reward = bet * 5;
    balance += reward;

    message = `🎯PERFECT！ +${reward}円`;
    playWinSound();

}else if(
    timingPosition >= 37 && timingPosition < 47 ||
    timingPosition > 53 && timingPosition <= 63
){

    const penalty = bet * 2;
    balance -= penalty;

    message = `☠️危険ゾーン！ -${penalty}円`;

}else if(timingPosition >= 45 && timingPosition <= 55){

    const reward = bet * 2;
    balance += reward;

    message = `✨GOOD！ +${reward}円`;
    playWinSound();

}else if(timingPosition >= 30 && timingPosition <= 70){

    message = `😮セーフ！ ±0円`;

}else{

    balance -= bet;
    message = `💥失敗！ -${bet}円`;
}

    document.getElementById("timingMessage").innerText =
    message;

    history.unshift(
        `${getDateTime()} 🎯 ${message}`
    );

    save();

    const btn =
    document.getElementById("timingMainBtn");

    if(btn){
        btn.innerText = "スタート";
    }
}