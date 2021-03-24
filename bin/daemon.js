var request = require("request");
// 执行任务
function dotask () {
    if (new Date().getHours() == 5) {
        // 5点钟，更新
        request("http://127.0.0.1:3000/routes/start", function (err, res, body) {
            console.log(body);
        });
    }
}
// 立即执行一次
// setTimeout(function () {
//     dotask();
// }, 30000);

// 1个小时执行一次
setInterval(dotask, 1000 * 60 * 60 * 1);