let balance = Number(localStorage.getItem("balance")) || 0;
let history = JSON.parse(localStorage.getItem("history")) || [];

update();

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

    localStorage.setItem("lastDaily",today);

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

    localStorage.setItem("salaryMonth",monthKey);

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

    document.getElementById("expense").value="";
}

function save(){

    localStorage.setItem("balance",balance);

    localStorage.setItem(
        "history",
        JSON.stringify(history)
    );

    update();
}

function update(){

    document.getElementById("balance").innerText =
    balance.toLocaleString()+"円";

    document.getElementById("history").innerHTML =
    history.map(x=>`<li>${x}</li>`).join("");
}