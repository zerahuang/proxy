var dbHelper = require("./dbhelper");

// 输出
module.exports = dbHelper.init({
    tablename: "basicinfo",
    primarykey: "b_key",
    sortkey: ""
});