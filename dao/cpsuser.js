var dbHelper = require("./dbhelper");

// 输出
module.exports = dbHelper.init({
    tablename: "cpsuser",
    primarykey: "appid",
    sortkey: ""
});