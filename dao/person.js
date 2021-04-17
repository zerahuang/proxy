var dbHelper = require("./dbhelper");

// 输出
module.exports = dbHelper.init({
    tablename: "person",
    primarykey: "id",
    sortkey: "lastviewd"
});