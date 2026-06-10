let balance = Number(localStorage.getItem("balance")) || 0;
let history = JSON.parse(localStorage.getItem("history")) || [];
let slotHistory = JSON.parse(localStorage.getItem("slotHistory")) || [];

window.onload = function () {
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
        `${new Date().toLocaleDateString()} +500円`
    );

    localStorage.setItem("lastDaily", today);

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
        `${new Date().toLocaleDateString()} +15000円 給料`
    );

    localStorage.setItem("salaryMonth", monthKey);

    save();
};

function addExpense(){

    const amount =
    Number(document.getElementById("expense").value);

    if(!amount) return;

    balance -= amount;

    history.unshift(
        `${new Date().toLocaleDateString()} -${amount}円`
    );

    save();

    document.getElementById("expense").value = "";
}

function playSlot(){

    if(balance <= 0){
        alert("残高がないのでスロットできません！");
        return;
    }

    const bet =
    Number(document.getElementById("betAmount").value);

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

    const symbols = [
        "🔥",
        "🌶️",
        "🐝",
        "🍒",
        "🎰",
        "💰",
        "🎁"
    ];

    const payout = {
        "🍒": 3,
        "🐝": 5,
        "🔥": 7,
        "🌶️": 10,
        "💰": 15,
        "🎁": 20,
        "🎰": 50
    };

    const result = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
    ];

    let reward = 0;
    let message = "";

    if(result[0] === result[1] && result[1] === result[2]){

        const rate = payout[result[0]];

        reward = bet * rate;

        balance += reward;

        message =
        `🎉大当たり！${rate}倍！ +${reward}円`;

    }else if(
        result[0] === result[1] ||
        result[1] === result[2] ||
        result[0] === result[2]
    ){

        reward = Math.floor(bet * 1.5);

        balance += reward;

        message =
        `✨ニアピン！ +${reward}円`;

    }else{

        balance -= bet;

        message =
        `😭ハズレ… -${bet}円`;
    }

    document.getElementById("slotResult").innerText =
    result.join(" ");

    document.getElementById("slotMessage").innerText =
    message;

slotHistory.unshift(
    `${new Date().toLocaleDateString()} 🎰 ${result.join("")} ${message}`
);

    save();

document.getElementById("betAmount").value = 5;
}

function save(){

    localStorage.setItem(
        "balance",
        balance
    );

    localStorage.setItem(
        "history",
        JSON.stringify(history)
    );

    localStorage.setItem(
        "slotHistory",
        JSON.stringify(slotHistory)
    );

    update();
}

function update(){

    document.getElementById("balance").innerText =
    balance.toLocaleString() + "円";

    document.getElementById("history").innerHTML =
    history.map(
        x => `<li>${x}</li>`
    ).join("");

    const slotHistoryList =
    document.getElementById("slotHistory");

    if(slotHistoryList){

        slotHistoryList.innerHTML =
        slotHistory.map(
            x => `<li>${x}</li>`
        ).join("");
    }

    const maxBetText =
    document.getElementById("maxBetText");

    if(maxBetText){

        maxBetText.innerText =
        `最大賭け金：${Math.floor(balance * 0.1).toLocaleString()}円`;
    }
}