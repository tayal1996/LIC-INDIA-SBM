const util = require("util");
const path = require("path");
const multer = require("multer");
const maxSize = 2*1024*1024

var storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, path.join(`${__dirname}/upload`));
  },
  filename: (req, file, callback) => {
    // const match = ["image/png", "image/jpeg"];

    // if (match.indexOf(file.mimetype) === -1) {
    //   var message = `${file.originalname} is invalid. Only accept png/jpeg.`;
    //   return callback(message, null);
    // }

    var filename = `${Date.now()}_lic_#_${file.originalname}`;
    callback(null, filename);
  }
});

var uploadFiles = multer({ 
  storage: storage,
  limits:{fileSize: maxSize} }).array("multi-files", 10);
var uploadFilesMiddleware = util.promisify(uploadFiles);
module.exports = uploadFilesMiddleware;
