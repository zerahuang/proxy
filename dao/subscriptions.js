var dbHelper = require("./dbhelper");

// 输出
module.exports = dbHelper.init({
    tablename: "subscriptions",
    primarykey: "openid",
    sortkey: ""
});