var request = require("request");
// 执行任务
function dotask () {
    request("http://127.0.0.1:3000/routes/start", function (err, res, body) {
        console.log(body);
    });
}
// 立即执行一次
// setTimeout(function () {
//     dotask();
// }, 30000);

// 24个小时执行一次
setInterval(dotask, 1000 * 60 * 60 * 24);