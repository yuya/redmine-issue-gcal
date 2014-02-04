var user, pass, apiKey, apiPath,
    options, response, result;

function getProp(key, type) {
    type = type || "user";

    if (!key) {
        return;
    }

    switch (type) {
    case "script":
        return ScriptProperties.getProperty(key);
    case "user":
    default:
        return UserProperties.getProperty(key);
    }
}

function setProp(key, type) {
    type = type || "user";
    var value = Browser.inputBox("値を入力してください");

    if (!key || !value || value === "cancel") {
        return;
    }

    switch (type) {
    case "script":
        ScriptProperties.setProperty(key, value);
        break;
    case "user":
    default:
        UserProperties.setProperty(key, value);
        break;
    }
}

function initProp(key, type) {
    if (!getProp(key)) {
        setProp(key, type);
    }

    return getProp(key);
}

function initialize() {
    user     = initProp("username");
    pass     = initProp("password");
    apiKey   = initProp("api_key");
    apiPath  = initProp("api_path", "script");
    options  = {
        "key"     : apiKey,
        "headers" : {
            "Authorization" : " Basic " + Utilities.base64Encode(user + ":" + pass)
        }
    },
    response = UrlFetchApp.fetch(apiPath, options);

    if (response.getResponseCode() === 200) {
        result = JSON.parse(response.getContentText());
    }
    else {
        throw "error: response code=" + response.getResponseCode();
    }
}
