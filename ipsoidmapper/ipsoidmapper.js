/**
 * One Data Model ID to IPSO ID mapper
 * @author Ari Keränen
 */

const fs = require('fs');
const xmldoc = require('xmldoc');
const PATH_PREFIX = "#/sdfObject/";

/* How to convert Object names into ODM compatible names */
const NAMEFIX_RE = new RegExp('[\\s,\\/]', "g");
const NAMEFIX_CHAR = "_";

let mapping = {
  "info" : {
    "title" : "IPSO ID mapping"
  },
  "map" : {}
}

process.argv.slice(2).forEach(inFile => {
  data = fs.readFileSync(inFile, {encoding: 'utf-8'});
  try {
    addMapping(data, mapping.map);
  } catch (err) {
    console.log("Can't read. " + err);
    process.exit(1);
  }
});

console.log(JSON.stringify(mapping, null, 2));


/**
 * Adds ID mapping from the given XML schema to the given map
 * @param data The LwM2M object schema document as UTF-8
 * @param map The map object where to add the mappings
 */
function addMapping(data, map) {
  let doc = new xmldoc.XmlDocument(data);
  let obj = doc.childNamed("Object");
  let objName = obj.childNamed("Name").val;
  let objId = JSON.parse(obj.childNamed("ObjectID").val);
  let objJSONName = objName.replace(NAMEFIX_RE, NAMEFIX_CHAR);

  map[PATH_PREFIX + objJSONName] = {
    "id" : objId
  };

  obj.childNamed("Resources").children.forEach(res => {
    if (res.type === "text") {
      return;
    }

    let name = res.childNamed("Name").val;
    let JSONName = name.replace(NAMEFIX_RE, NAMEFIX_CHAR);
    let isAction = res.childNamed("Operations").val.includes("E");


    map[PATH_PREFIX + objJSONName + "/" +
      (isAction ? "sdfAction/" : "sdfProperty/") + JSONName] = {
        "id" : JSON.parse(res.attr.ID)
    }

  });
}
