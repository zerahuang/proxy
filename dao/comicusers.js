var dbHelper = require("./dbhelper");

// 输出
module.exports = dbHelper.init({
    tablename: "comicusers",
    primarykey: "userid",
    sortkey: ""
});