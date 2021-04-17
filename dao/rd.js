var dbHelper = require("./dbhelper");

// 输出
module.exports = dbHelper.init({
    tablename: "rd",
    primarykey: "rdid",
    sortkey: ""
});