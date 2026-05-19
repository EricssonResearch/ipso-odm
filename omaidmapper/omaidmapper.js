/**
 * OMA ID mapper tool
 * @author Ari Keränen
 */

const fs = require('fs');
const xmldoc = require('xmldoc');
const PATH_PREFIX = "#/sdfObject/";

/* How to convert Object names into SDF compatible names */
const NAMEFIX_RE = new RegExp('[\\s,\\/]', "g");
const NAMEFIX_CHAR = "_";

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

/**
 * Creates ID mapping from multiple XML files
 * @param {string[]} files Array of file paths
 * @returns {object} Mapping object with info and map
 */
function createMapping(files) {
  let mapping = {
    "info" : {
      "title" : "OMA ID mapping"
    },
    "map" : {}
  };

  files.forEach(inFile => {
    let data = fs.readFileSync(inFile, {encoding: 'utf-8'});
    addMapping(data, mapping.map);
  });

  return mapping;
}

/**
 * Creates ID mapping from XML string data
 * @param {string} xmlData XML string data
 * @returns {object} Mapping object with info and map
 */
function createMappingFromString(xmlData) {
  let mapping = {
    "info" : {
      "title" : "OMA ID mapping"
    },
    "map" : {}
  };

  addMapping(xmlData, mapping.map);
  return mapping;
}

// Export functions for testing
exports.addMapping = addMapping;
exports.createMapping = createMapping;
exports.createMappingFromString = createMappingFromString;

// CLI execution
if (require.main === module) {
  try {
    let mapping = createMapping(process.argv.slice(2));
    console.log(JSON.stringify(mapping, null, 2));
  } catch (err) {
    console.log("Can't read. " + err);
    process.exit(1);
  }
}
