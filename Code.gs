var API_LIMIT_NUM = 25,
    issues        = [],
    userName , userId , password , apiKey   , apiPath ,
    params   , url    , options  , response , result
;

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

function isNumber(obj) {
    return {}.toString.call(obj) === "[object Number]";
}

function toNumber(str) {
    return parseInt(str, 10);
}

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function attr(key) {
    if (!key) {
        return;
    }

    if (getProp(key, 0)) {
        return getProp(key, 0);
    }
    else if (getProp(key, 1)) {
        return getProp(key, 1);
    }
    else {
        return "";
    }
}

function loadHTML(filename) {
    if (!filename) {
        return;
    }

    return HtmlService.createTemplateFromFile(filename).evaluate();
}

function getProp(key, type) {
    type = type || 0;

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
    type = type || 0;

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
    Logger.log("setPropsWithPostData");
    setProp("sync_cal",  reqParams.sync_cal[0]);
    setProp("interval",  reqParams.interval[0]);
    setProp("user_name", reqParams.user_name[0]);
    setProp("user_id",   reqParams.user_id[0]);
    setProp("password",  reqParams.password[0]);
    setProp("api_key" ,  reqParams.api_key[0]);
    setProp("api_path",  reqParams.api_path[0]);
}

function handleIssuesCount(result) {
    var calendar = CalendarApp;

    each(result.issues, function (issue) {
        issues.push(issue);
    });

    if (issues.length < result.total_count) {
        getIssues(issues.length, API_LIMIT_NUM);
    }
    else {
        addDueDateToCalendar();
    }
}

function getIssues(offset, limit) {
    Logger.log("getIssues");
    offset = offset || 0;
    limit  = limit  || API_LIMIT_NUM;

    var apiPathWithJSON = validateExtension(getProp("api_path"), "json");

    userName = getProp("user_name");
    userId   = getProp("user_id");
    password = getProp("password");
    apiKey   = getProp("api_key");
    apiPath  = apiPathWithJSON;
    params   = {
        "key": apiKey,
        "offset": offset,
        "limit": limit,
        "assigned_to_id": userId
    };
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
        result = JSON.parse(response.getContentText());
        handleIssuesCount(result);
    }
    else {
        throw "error: response code=" + response.getResponseCode();
    }
}

function addDueDateToCalendar() {
    var syncCal = getProp("sync_cal"),
        subject, datetime, description;

    each(issues, function (issue) {
        subject     = issue.subject;
        datetime    = issue.due_date ? new Date(issue.due_date) : null;
        description = issue.description;

        if (!datetime) {
            return;
        }

        switch (syncCal) {
        case "self":
        default:
            Logger.log("self");
            Logger.log(subject);
            // calendar.createAllDayEvent(subject, datetime, description);
            break;
        }
    });
}

function syncCalendar() {
    try {
        getIssues();
    }
    catch (err) {
        MailApp.sendEmail("hashimoto-yuya@kayac.com", "Error report", err.message);
    }
}

function setTimerEvent(eventName) {
    eventName = eventName || "syncCalendar";

    var trigger  = ScriptApp.newTrigger(eventName),
        interval = toNumber(getProp("interval"));

    if (!interval || !isNumber(interval)) {
        return;
    }

    Logger.log("do syncCalendar");
    trigger.timeBased().everyMinutes(interval).create();
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
        setPropsWithPostData(reqParams);
        setTimerEvent("syncCalendar");

        return loadHTML("done");
    }
}
