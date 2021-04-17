var dbHelper = require("./dbhelper");

// 输出
module.exports = dbHelper.init({
    tablename: "mystock",
    primarykey: "code",
    sortkey: "time"
});