var path   = require("path"),
    fs     = require("fs"),
    argv   = process.argv[2],
    result = "",
    filePath, readStream;

if (!argv) {
    return;
}

filePath   = argv;
readStream = fs.createReadStream(filePath);
readStream.setEncoding("utf8");

readStream.on("data", function (data) {
    result += data;
});

readStream.on("end", function () {
    console.log(result);
});

readStream.on("error", function (err) {
    console.log("An error occured");
    console.log(err);
});
