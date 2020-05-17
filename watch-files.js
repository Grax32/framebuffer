const glob = require("glob");
const fs = require("fs");
const watcher = require("filewatcher")();

const startWatching = () => watcher.add("src");

const copyFiles = function () {
  console.log("Copying static files...");

  // options is optional
  glob("src/**/!(*.ts)", function (er, files) {
    // files is an array of filenames.
    // If the `nonull` option is set, and nothing
    // was found, then files is ["**/*.js"]
    // er is an error object or null.
    console.log("files", files);

    files.forEach((file) =>
      fs.copyFileSync(file, file.replace(/^src\//, "dist\/"))
    );
  });

  console.log("Done.");
};

watcher.on("change", copyFiles);
copyFiles();
startWatching();
