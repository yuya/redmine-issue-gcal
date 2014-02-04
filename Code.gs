function myFunction() {
  var apiKey = UserProperties.getProperty("api_key");
  var user   = UserProperties.getProperty("username");
  var pass   = UserProperties.getProperty("password");
  // var url    = "https://project.kayac.com/redmine/projects/heroquiz/issues/66189.json?key=" + apiKey;
  var url    = ScriptProperties.getProperty("api_path");
  // var result = UrlFetchApp.fetch("https://" + user + ":" + passwd + "@project.kayac.com/redmine/projects/heroquiz/issues.json?key=" + apiKey);
  /*
  var options = {
    "headers" : {
      "Authorization" : " Basic " + Utilities.base64Encode(user + ":" + pass)
    }
  };
  */
  var options = {
    "headers": {
      "Authorization" : " Basic " + Utilities.base64Encode(user + ":" + pass)
    },
    "key": apiKey
  };
  var response = UrlFetchApp.fetch(url, options);
  var result;

  if (response.getResponseCode() === 200) {
    result = JSON.parse(response.getContentText());
  }
  else {
    throw "error: response code=" + response.getResponseCode();
  }

  Logger.log(result.issues[0]);

  /*
  if (/\\r\\n/.test(result)) {
    // Logger.log(result.replace(/\\r\\n/g, "<br>"));
    // json = JSON.parse(result.replace(/\\r\\n/g, "<br>"));
    json = result.replace(/\\r\\n/g, "<br>");
    json = JSON.parse(json);
    Logger.log(json.issue);
  }
  */

  // var rerere = JSON.parse(result);

  // Logger.log(result);
  // Logger.log(rerere);
  // Logger.log(rerere.description);
}
