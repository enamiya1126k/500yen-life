    let balance = Number(localStorage.getItem("balance")) || 0;
    let history = JSON.parse(localStorage.getItem("history")) || [];
    let slotHistory = JSON.parse(localStorage.getItem("slotHistory")) || [];
    
    const symbols = ["🔥","🌶️","🐝","🍒","🎰","💰","🎁"];
    
    const payout = {
        "🍒": 3,
        "🐝": 5,
        "🔥": 7,
        "🌶️": 10,
        "💰": 15,
        "🎁": 20,
        "🎰": 50
    };
    
    let spinning = false;
    let stopFlags = [false, false, false];
    let currentResult = [];
    let currentBet = 0;
    let spinTimer = null;
    
    window.onload = function(){
        update();
    };
    
    document.getElementById("dailyBtn").onclick = function(){
        const today = new Date().toDateString();
    
        if(localStorage.getItem("lastDaily") === today){
            alert("今日はもう受け取ってる！");
            return;
        }
    
        balance += 500;
        history.unshift(`${getDateTime()} +500円`);
        localStorage.setItem("lastDaily", today);
        save();
    };
    
    document.getElementById("salaryBtn").onclick = function(){
        const now = new Date();
    
        if(now.getDate() !== 25){
            alert("25日しか受け取れない！");
            return;
        }
    
        const monthKey = `${now.getFullYear()}-${now.getMonth()+1}`;
    
        if(localStorage.getItem("salaryMonth") === monthKey){
            alert("今月は受取済み！");
            return;
        }
    
        balance += 15000;
        history.unshift(`${getDateTime()} +15000円 給料`);
        localStorage.setItem("salaryMonth", monthKey);
        save();
    };
    
    function addExpense(){
        const amount = Number(document.getElementById("expense").value);
        if(!amount) return;
    
        balance -= amount;
        history.unshift(`${getDateTime()} -${amount}円`);
        save();
    
        document.getElementById("expense").value = "";
    }
    
    function playSlot(){
        if(spinning){
            return;
        }
    
        if(balance <= 0){
            alert("残高がないのでスロットできません！");
            return;
        }
    
        const bet = Number(document.getElementById("betAmount").value);
        const maxBet = Math.floor(balance * 0.1);
    
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
    
        currentResult = [];
    
        for(let i = 0; i < 9; i++){
            currentResult.push(
                symbols[Math.floor(Math.random() * symbols.length)]
            );
        }
    
        for(let i = 0; i < 9; i++){
            const cell = document.getElementById(`cell${i}`);
            cell.classList.remove("hit");
        }
    
        document.getElementById("betDisplay").innerText = bet;
        document.getElementById("payoutDisplay").innerText = 0;
        document.getElementById("gogoLamp").classList.remove("on");
        document.getElementById("slotMessage").innerText = "回転中！STOPを押してね！";
    
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
        if(!spinning){
            return;
        }
    
        if(stopFlags[col]){
            return;
        }
    
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
                const reward = bet * payout[a];
                totalReward += reward;
    
                hitLines.push({
                    line: line,
                    symbol: a,
                    reward: reward,
                    rate: payout[a]
                });
            }
        });
    
        let message = "";
    
        if(hitLines.length > 0){
            balance += totalReward;
    
            hitLines.forEach(function(hit){
                hit.line.forEach(function(index){
                    document.getElementById(`cell${index}`).classList.add("hit");
                });
            });
    
            document.getElementById("gogoLamp").classList.add("on");
            document.getElementById("payoutDisplay").innerText = totalReward;
    
            playWinSound();
    
            if(hitLines.length >= 3){
                message = `💥BIG BONUS💥 +${totalReward}円`;
            }else if(hitLines.length >= 2){
                message = `🔥SUPER HIT🔥 +${totalReward}円`;
            }else{
                message = `✨LINE HIT✨ +${totalReward}円`;
            }
    
        }else{
            balance -= bet;
            document.getElementById("payoutDisplay").innerText = 0;
            message = `😭ハズレ… -${bet}円`;
        }
    
        document.getElementById("slotMessage").innerText = message;
    
        slotHistory.unshift(
            `${getDateTime()} 🎰 ${result.join("")} ${message}`
        );
    
        save();
    
        document.getElementById("betAmount").value = 5;
        document.getElementById("betDisplay").innerText = 5;
    }
    
    function save(){
        localStorage.setItem("balance", balance);
        localStorage.setItem("history", JSON.stringify(history));
        localStorage.setItem("slotHistory", JSON.stringify(slotHistory));
        update();
    }
    
    function update(){
        document.getElementById("balance").innerText =
        balance.toLocaleString() + "円";
    
        document.getElementById("history").innerHTML =
        history.map(x => `<li>${x}</li>`).join("");
    
        const slotHistoryList = document.getElementById("slotHistory");
    
        if(slotHistoryList){
            slotHistoryList.innerHTML =
            slotHistory.map(x => `<li>${x}</li>`).join("");
        }
    
        const maxBetText = document.getElementById("maxBetText");
    
        if(maxBetText){
            maxBetText.innerText =
`最大賭け金：${Math.min(balance, Math.max(5, Math.floor(balance * 0.1))).toLocaleString()}円`;
        }
    
        const betDisplay = document.getElementById("betDisplay");
    
        if(betDisplay){
            betDisplay.innerText =
            document.getElementById("betAmount").value || 5;
        }
    }
    
    window.setBet = function(amount){
        document.getElementById("betAmount").value = amount;
        document.getElementById("betDisplay").innerText = amount;
    };
    
    window.setMaxBet = function(){
  const maxBet = Math.min(balance, Math.max(5, Math.floor(balance * 0.1)));
    
        document.getElementById("betAmount").value = maxBet;
        document.getElementById("betDisplay").innerText = maxBet;
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