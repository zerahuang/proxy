var request = require("request");
// 执行任务
function dotask () {
    if (new Date().getHours() == 5) {
        // 5点钟，更新
        request("http://127.0.0.1:3000/routes/start", function (err, res, body) {
            console.log("do start:", new Date().toLocaleString(), body);
        });
    }
}

function doasync () {
    request("http://127.0.0.1:3000/routes/asyncip", function (err, res, body) {
        console.log("do async:", new Date().toLocaleString(), body);
    });
}

// 立即执行一次
// setTimeout(function () {
//     dotask();
// }, 30000);

// 1个小时执行一次
setInterval(dotask, 1000 * 60 * 60 * 1);

// 每隔2分钟，判断一次，是否本地ip与数据库ip不一致
setInterval(doasync, 1000 * 60 * 2);