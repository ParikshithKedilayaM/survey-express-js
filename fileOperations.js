// Model - Handles file operation
var fs = require('fs');

// Function to read data from the file
function readFileWrapper(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, { encoding: 'utf8', flag: 'r' }, (err, data) => {
            if (err) {
                reject("Unable to process the request" + err);
            } else {
                resolve(data.toString());
            }
        });
    });
}

// Function to write data to the file
function writeFileWrapper(file, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, JSON.stringify(data), { encoding: 'utf8', flag: 'w' }, (err) => {
            if (err) {
                reject("Unable to process the request" + err);
            } else {
                resolve();
            }
        });
    });
}

module.exports = { readFileWrapper, writeFileWrapper };