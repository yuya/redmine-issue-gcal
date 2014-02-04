var spreadsheet = SpreadsheetApp.getActiveSpreadsheet(),
    sheet       = spreadsheet.getSheets()[0],
    userName, userId, password, apiKey, apiPath,
    params, url, options, response, issues;

function each(collection, iterator) {
    var i = 0,
        len, ary, key;

    if (Array.isArray(collection)) {
        len = collection.length;

        for (; len; ++i, --len) {
            iterator(collection[i], i);
        }
    }
    else {
        ary = Object.keys(collection);
        len = ary.length;

        for (; len; ++i, --len) {
            key = ary[i];
            iterator(key, collection[key]);
        }
    }
}

function getProp(key, type) {
    if (!key) {
        return;
    }

    switch (type) {
    case  0:
        return UserProperties.getProperty(key);
    case  1:
    default:
        return ScriptProperties.getProperty(key);
    }
}

function setProp(key, type) {
    var value = Browser.inputBox(key + " の値を入力してください");

    if (!key || !value || value === "cancel") {
        return;
    }

    switch (type) {
    case  0:
        ScriptProperties.setProperty(key, value);
        break;
    case  1:
    default:
        UserProperties.setProperty(key, value);
        break;
    }
}

function initProp(key, type) {
    if (getProp(key, type)) {
        return getProp(key, type);
    }
    else {
        setProp(key, type);
        initProp(key, type);
    }
}

function initialize() {
    userName = initProp("user_name", 0);
    userId   = initProp("user_id",   0);
    password = initProp("password",  0);
    apiKey   = initProp("api_key" ,  0);
    apiPath  = initProp("api_path",  1);
    params   = {
        "key": apiKey,
        "assigned_to_id": userId
    },
    options  = {
        "headers": {
            "Authorization": " Basic " + Utilities.base64Encode(userName + ":" + password)
        }
    };
    url = (function () {
        var ret = [];

        each(params, function (key, value) {
            ret.push(key + "=" + value);
        });

        return apiPath + "?" + ret.join("&");
    })();
    response = UrlFetchApp.fetch(url, options);

    if (response.getResponseCode() === 200) {
        issues = JSON.parse(response.getContentText());
    }
    else {
        throw "error: response code=" + response.getResponseCode();
    }
}

function getIssues() {
    initialize();

    Logger.log(issues);
}

function onOpen() {
    var subMenus = [];

    subMenus.push({name: "実行", functionName: "getIssues"});

    spreadsheet.addMenu("Redmine 連携", subMenus);
}
