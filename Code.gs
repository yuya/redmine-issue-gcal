var spreadsheet, spreadsheet, subMenus,
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

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function loadHTML(filename) {
    if (!filename) {
        return;
    }

    return HtmlService.createTemplateFromFile(filename).evaluate();
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

function setProp(key, value, type) {
    if (!key || !value) {
        return;
    }

    switch (type) {
    case  0:
        UserProperties.setProperty(key, value);
        break;
    case  1:
    default:
        ScriptProperties.setProperty(key, value);
        break;
    }
}

function validatePostData(params) {
    var apiPathRe  = /^https?:\/\/.+\/issues$/,
        userNameRe = /^[\w|-]+$/,
        userIdRe   = /^\d+$/,
        passwordRe =
        apiKeyRe   = /^\w+$/;

    if (!apiPathRe.test(params.api_path[0])   ||
        !userNameRe.test(params.user_name[0]) ||
        !passwordRe.test(params.password[0])  ||
        !userIdRe.test(params.user_id[0])     ||
        !apiKeyRe.test(params.api_key[0])      ) {

        return false;
    }

    return true;
}

function validateExtension(str, ext) {
    var regexp = new RegExp("\\." + ext + "$");

    return regexp.test(str) ? str : str + "." + ext;
}

function setPropsWithPostData(reqParams) {
    var apiPathWithJSON = validateExtension(reqParams.api_path[0], "json");

    setProp("user_name", reqParams.user_name[0], 0);
    setProp("user_id",   reqParams.user_id[0],   0);
    setProp("password",  reqParams.password[0],  0);
    setProp("api_key" ,  reqParams.api_key[0],   0);
    setProp("api_path",  apiPathWithJSON,        1);
}

function getIssues(reqParams) {
    if (reqParams) {
        setPropsWithPostData(reqParams);
    }

    userName = getProp("user_name", 0);
    userId   = getProp("user_id",   0);
    password = getProp("password",  0);
    apiKey   = getProp("api_key" ,  0);
    apiPath  = getProp("api_path",  1);
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
            ret.push(key + "=" + encodeURIComponent(value));
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

function syncCalendar() {

}
function log(obj) {
    Logger.log(obj);
    return obj;
}

function onOpen() {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    sheet       = spreadsheet.getSheets()[0];
    subMenus    = [];

    subMenus.push({name: "実行", functionName: "getIssues"});

    spreadsheet.addMenu("Redmine 連携", subMenus);
}

function doGet(req) {
    return loadHTML("index");
}

function doPost(req) {
    var reqParams = req.parameters;

    if (!validatePostData(reqParams)) {
        return loadHTML("error");
    }
    else {
        getIssues(reqParams);
        return loadHTML("done");
    }
}
