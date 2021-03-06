var SCRIPT_ID = (function () {
        if (!ScriptProperties.getProperty("id")) {
            throw "プロジェクト プロパティの『id』を設定してください";
        }

        return ScriptProperties.getProperty("id");
    })(),
    SCRIPT_URL   = ScriptApp.getService().getUrl(),
    API_LIMIT    = 25,
    SEARCH_DAYS  = 180,
    SEARCH_TERM  = 1000 * 60 * 60 * 24 * SEARCH_DAYS,
    CACHE_EXPIRE = 1000 * 60 * 10,
    issueList    = [],
    calendar, userProps, cachedProps;

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

    return getProp(key) ? getProp(key) : "";
}

function loadHTML(fileName, title) {
    if (!fileName) {
        return;
    }

    return HtmlService.createTemplateFromFile(fileName)
            .evaluate().setTitle(title);
}

function getProp(key) {
    if (!key) {
        return;
    }

    var ret = null;

    if (cachedProps && cachedProps.get(key)) {
        ret = cachedProps.get(key);
    }
    else if (userProps && userProps[key]) {
        ret = userProps[key];
    }
    else if (UserProperties.getProperty(SCRIPT_ID)) {
        ret = JSON.parse(UserProperties.getProperty(SCRIPT_ID))[key];
    }

    return ret;
}

function setProps(params) {
    if (!params) {
        return;
    }

    if (!userProps) {
        userProps = UserProperties.getProperty(SCRIPT_ID) ?
                            JSON.parse(UserProperties.getProperty(SCRIPT_ID)) :
                            {}
                    ;
    }

    if (!cachedProps) {
        cachedProps = CacheService.getPrivateCache();
    }

    each(params, function (key, value) {
        userProps[key] = value;
        cachedProps.put(key, value, CACHE_EXPIRE);
    });

    UserProperties.setProperty(SCRIPT_ID, JSON.stringify(userProps));
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

function validateDuplicateEvent(issue) {
    if (!issue || !issue.due_date) {
        return;
    }

    var now       = Date.now(),
        start     = new Date(now - SEARCH_TERM),
        end       = new Date(now + SEARCH_TERM),
        dueDate   = issue.due_date,
        searchStr = "issue_id: " + issue.id,
        searchRe  = new RegExp(searchStr),
        option    = { search : searchStr },
        events    = calendar.getEvents(start, end, option),
        ret       = {
            "result" : true,
            "events" : []
        };

    if (!events && !events.length) {
        return;
    }

    each(events, function (event) {
        if (searchRe.test(event.getTitle())) {
            ret.result = false;

            if (dueDate !== event.getTag("due_date") ||
                // TODO: to be erased
                !event.getTag("due_date")) {
                ret.events.push(event);
            }
        }
    });

    return ret;
}

function validateDuplicateTrigger(eventName) {
    var triggers = ScriptApp.getProjectTriggers()
        ret      = true;

    each(triggers, function (trigger) {
        if (trigger.getHandlerFunction() === eventName) {
            ret = false;
        }
    });

    return ret;
}

function deleteEvents(events) {
    if (!events) {
        return;
    }

    if (Array.isArray(events)) {
        each(events, function (event) {
            event.deleteEvent();
        });
    }
    else {
        events.deleteEvent();
    }
}

function deleteAllTriggers() {
    var triggers = ScriptApp.getProjectTriggers();

    each(triggers, function (trigger) {
        ScriptApp.deleteTrigger(trigger);
    });
}

function setPropsWithPostData(reqParams) {
    var params = {
        "sync_cal"   : reqParams.sync_cal[0],
        "interval"   : reqParams.interval[0],
        "user_name"  : reqParams.user_name[0],
        "user_id"    : reqParams.user_id[0],
        "password"   : reqParams.password[0],
        "api_key"    : reqParams.api_key[0],
        "issue_path" : reqParams.issue_path[0]
    };

    setProps(params);
}

function handleIssuesCount(result) {
    each(result.issues, function (issue) {
        issueList.push(issue);
    });

    if (issueList.length < result.total_count) {
        getIssues(issueList.length, API_LIMIT);
    }
    else {
        addDueDateToCalendar();
    }
}

function getIssues(offset, limit) {
    offset = offset || 0;
    limit  = limit  || API_LIMIT;

var userName  = getProp("user_name"),
    userId    = getProp("user_id"),
    password  = getProp("password"),
    apiKey    = getProp("api_key"),
    issuePath = getProp("issue_path"),
    apiPath, url, params, options, response, result;

    if (!userName || !userId || !password || !apiKey || !issuePath) {
        return;
    }

    apiPath  = addExtension(getProp("issue_path"), "json");
    params   = {
        "key": apiKey,
        "offset": offset,
        "limit": limit,
        "assigned_to_id": userId
    };
    options = {
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

function createAllDayEvent(subject, dueDate, options) {
    if (!dueDate) {
        return;
    }

    calendar.createAllDayEvent(subject, new Date(dueDate), options)
            .setTag("due_date", dueDate);
}

function addDueDateToCalendar() {
    var syncCalendar = getProp("sync_cal"),
        issuePath    = getProp("issue_path"),
        eventQueues  = [],
        dueDate, issueId, subject, description, validated;

    calendar = (function () {
        switch (syncCalendar) {
        case "self":
        default:
            return CalendarApp.getDefaultCalendar();
        }
    })();

    each(issueList, function (issue) {
        dueDate = issue.due_date ? issue.due_date : null;

        if (!dueDate) {
            return;
        }

        issueId     = issue.id;
        subject     = issue.subject + " [issue_id: " + issueId + "]";
        description = (function () {
            var ret = issuePath + (/\/$/.test(issuePath) ? "" : "/") + issueId;

            if (issue.description) {
                ret += "\r\n\r\n" + issue.description;
            }

            return ret;
        })();
        validated = validateDuplicateEvent(issue);

        if (!validated.result && !!validated.events.length) {
            deleteEvents(validated.events);
        }
        else if (!validated.result) {
            return;
        }

        createAllDayEvent(subject, dueDate, { "description" : description });
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

    var trigger  = ScriptApp.newTrigger(eventName).timeBased(),
        interval = toNumber(getProp("interval"));

    if (!interval || !isNumber(interval)) {
        return;
    }

    if (!validateDuplicateTrigger(eventName)) {
        deleteAllTriggers();
    }

    trigger.everyMinutes(interval).create();
}

// TODO: to be erased
function deleteAllUserProps() {
    UserProperties.deleteProperty("sync_cal");
    UserProperties.deleteProperty("interval");
    UserProperties.deleteProperty("user_name");
    UserProperties.deleteProperty("user_id");
    UserProperties.deleteProperty("password");
    UserProperties.deleteProperty("api_key");
    UserProperties.deleteProperty("issue_path");
}

function doGet(req) {
    return loadHTML("index", "Redmine Ticket x Google Calendar");
}

function doPost(req) {
    var reqParams = req.parameters;

    if (!validatePostData(reqParams)) {

        return loadHTML("error", "エラーが発生しました");
    }
    else {
        deleteAllUserProps();   // TODO: to be erased
        setPropsWithPostData(reqParams);
        initTimerEvent("syncCalendar");

        return loadHTML("done", "done!");
    }
}
