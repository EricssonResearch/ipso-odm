/**
 * Create an sdfThing from a set of given objects
 * @author Petri Laari
 */

const fs = require("fs");

const ODM_FILE_PREFIX = "sdfthing-";
const ODM_FILE_SUFFIX = ".sdf.json";

let files = [];
let outfileName;
let sdfNewInfo = new Object();
let sdfNewThing = new Object();
let sdfNewObject = new Object();
let sdfObjects = new Object();
let skeletonFileName;
let fileOutput = false;

if (process.argv.length >= 4) {
  let n = 0;
  if(process.argv[2] == "-f") {
    fileOutput = true;
    outfileName = ODM_FILE_PREFIX + process.argv[3] + ODM_FILE_SUFFIX;
    n = 2;
  } 
  skeletonFileName = process.argv[2+n]
  while (process.argv[3 + n]) {
    files.push(process.argv[3 + n]);
    n++;
  }
} else {
  console.log(
    "Usage: node create-sdfthing.js [-f <Base output filename>]",
    "<Thing skeleton file> <list of input files>"
  );
  return;
}
/* Read the main json input file with the sdfThing skeleton */
try {
  sdfNewInfo = JSON.parse(fs.readFileSync(skeletonFileName,
    { encoding: "utf-8" }));
} catch (err) {
  console.log("Can't parse the main skeleton file");
}

/* Read the input files, create the sdfObjecdt */
files.forEach((file) => {
  try {
    let odm = JSON.parse(fs.readFileSync(file, { encoding: "utf-8" }));
    sdfNewObject = odm.sdfObject;
    sdfObjects = { ...sdfObjects, ...sdfNewObject };
  } catch (err) {
    console.log("Can't parse while going through the input files" + err);
  }
});

/* Build the new thing from pieces */

sdfNewDevice = { sdfObject: sdfObjects };
sdfNewDevice = { [sdfNewInfo.info.title]: sdfNewDevice };
sdfNewThing = { sdfThing: sdfNewDevice };
sdfNewThing = { ...sdfNewInfo, ...sdfNewThing };

if(fileOutput) { 
  fs.writeFile(outfileName, JSON.stringify(sdfNewThing, null, 2) + "\n", (err) => {
    if (err) {
      console.error(err);
      return;
    };
  });
} else {
  console.log(JSON.stringify(sdfNewThing, null, 2));
};
