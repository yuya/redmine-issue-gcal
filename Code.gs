var API_LIMIT_NUM = 25,
    issues        = [],
    userName  , userId , password ,
    issuePath , apiKey , calendar
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

function include(fileName) {
    return HtmlService.createHtmlOutputFromFile(fileName).getContent();
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

function loadHTML(fileName) {
    if (!fileName) {
        return;
    }

    return HtmlService.createTemplateFromFile(fileName).evaluate();
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

function addExtension(str, ext) {
    var regexp = new RegExp("\\." + ext + "$");

    return regexp.test(str) ? str : str + "." + ext;
}

function validatePostData(params) {
    var issuePathRe = /^https?:\/\/.+\/issues$/,
        userNameRe  = /^[\w|-]+$/,
        userIdRe    = /^\d+$/,
        passwordRe  =
        apiKeyRe    = /^\w+$/;

    if (!params.sync_cal[0]                     ||
        !params.interval[0]                     ||
        !issuePathRe.test(params.issue_path[0]) ||
        !userNameRe.test(params.user_name[0])   ||
        !passwordRe.test(params.password[0])    ||
        !userIdRe.test(params.user_id[0])       ||
        !apiKeyRe.test(params.api_key[0])        ) {

        return false;
    }

    return true;
}

function validateDuplicatesTrigger(target) {
    var triggers = ScriptApp.getProjectTriggers();

    each(triggers, function (trigger) {
        if (trigger.getHandlerFunction() === target.getHandlerFunction()) {
            return false;
        }
    });

    return true;
}

function deleteDuplicatesEvents(issueIdList) {
    if (!issueIdList || !Array.isArray(issueIdList)) {
        return;
    }

    var now       = Date.now(),
        days      = 180,
        term      = 1000 * 60 * 60 * 24 * days,
        start     = new Date(now - (term)),
        end       = new Date(now + (term)),
        searchStr, searchRe, option, events;

    each(issueIdList, function (issueId) {
        searchStr = "issue_id: " + issueId;
        searchRe  = new RegExp(searchStr);
        option    = { search : searchStr };
        events    = calendar.getEvents(start, end, option);

        if (events && events.length) {
            each(events, function (event) {
                if (searchRe.test(event.getTitle())) {
                    event.deleteEvent();
                }
            });
        }
    });
}

function deleteAllTriggers() {
    var triggers = ScriptApp.getProjectTriggers();

    each(triggers, function (trigger) {
        ScriptApp.deleteTrigger(trigger);
    });
}

function setPropsWithPostData(reqParams) {
    setProp("sync_cal",   reqParams.sync_cal[0]);
    setProp("interval",   reqParams.interval[0]);
    setProp("user_name",  reqParams.user_name[0]);
    setProp("user_id",    reqParams.user_id[0]);
    setProp("password",   reqParams.password[0]);
    setProp("api_key" ,   reqParams.api_key[0]);
    setProp("issue_path", reqParams.issue_path[0]);
}

function handleIssuesCount(result) {
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
    offset = offset || 0;
    limit  = limit  || API_LIMIT_NUM;

    var apiPathWithJSON = addExtension(getProp("issue_path"), "json"),
        params, options, url, response, result;

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

function createAllDayEvent(subject, datetime, options) {
    if (!datetime) {
        return;
    }

    calendar.createAllDayEvent(subject, datetime, options);
}

function addDueDateToCalendar() {
    var syncCalendar = getProp("sync_cal"),
        issuePath    = getProp("issue_path"),
        issueIdList  = [],
        eventQueues  = [],
        issueId, subject, datetime, description;

    calendar = (function () {
        switch (syncCalendar) {
        case "self":
        default:
            return CalendarApp.getDefaultCalendar();
        }
    })();

    each(issues, function (issue) {
        issueId     = issue.id;
        subject     = issue.subject + " [issue_id: " + issueId + "]";
        datetime    = issue.due_date ? new Date(issue.due_date) : null;
        description = (function () {
            var ret = issuePath + (/\/$/.test(issuePath) ? "" : "/") + issueId;

            if (issue.description) {
                ret += "\r\n\r\n" + issue.description;
            }

            return ret;
        })();

        issueIdList.push(issueId);
        eventQueues.push({
            "subject"  : subject,
            "datetime" : datetime,
            "options"  : { "description" : description }
        });
    });

    deleteDuplicatesEvents(issueIdList);

    each(eventQueues, function (event) {
        Logger.log(event.subject);
        createAllDayEvent(event.subject, event.datetime, event.options);
    });
}

function syncCalendar() {
    try {
        getIssues();
    }
    catch (err) {
        MailApp.sendEmail(Session.getActiveUser().getEmail(), "Error report", err.message);
    }
}

function initTimerEvent(eventName) {
    eventName = eventName || "syncCalendar";

    var trigger  = ScriptApp.newTrigger(eventName),
        interval = toNumber(getProp("interval"));

    if (!interval || !isNumber(interval)) {
        return;
    }

    if (!validateDuplicatesTrigger(trigger)) {
        deleteAllTriggers();
    }

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
        initTimerEvent("syncCalendar");

        return loadHTML("done");
    }
}
