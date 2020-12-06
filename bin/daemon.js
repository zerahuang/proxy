var request = require("request");
// 执行任务
function dotask () {
    request("http://127.0.0.1:3000/routes/start", function (err, res, body) {
        console.log(body);
    });
}
// 立即执行一次
dotask();
setInterval(dotask, 10000);