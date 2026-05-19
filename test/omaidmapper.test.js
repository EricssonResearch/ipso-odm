/**
 * Tests for OMA ID mapper
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const omaidmapper = require('../omaidmapper/omaidmapper');

describe('OMA ID Mapper', function() {
  
  describe('ID Mapping Generation', function() {
    it('should generate valid JSON mapping', function() {
      const result = execSync('node ../omaidmapper/omaidmapper.js ../samples/load.xml', { cwd: __dirname }).toString();
      const mapping = JSON.parse(result);
      
      assert(mapping.info, 'Should have info section');
      assert(mapping.map, 'Should have map section');
      assert.strictEqual(mapping.info.title, 'OMA ID mapping');
    });

    it('should map object IDs correctly', function() {
      const result = execSync('node ../omaidmapper/omaidmapper.js ../samples/load.xml', { cwd: __dirname }).toString();
      const mapping = JSON.parse(result);
      
      assert(mapping.map['#/sdfObject/Load'], 'Should have Load object mapping');
      assert.strictEqual(mapping.map['#/sdfObject/Load'].id, 3322);
    });

    it('should map resource IDs correctly', function() {
      const result = execSync('node ../omaidmapper/omaidmapper.js ../samples/load.xml', { cwd: __dirname }).toString();
      const mapping = JSON.parse(result);
      
      const sensorValueKey = '#/sdfObject/Load/sdfProperty/Sensor_Value';
      assert(mapping.map[sensorValueKey], 'Should have Sensor_Value mapping');
      assert.strictEqual(mapping.map[sensorValueKey].id, 5700);
    });

    it('should handle multiple input files', function() {
      const result = execSync('node ../omaidmapper/omaidmapper.js ../samples/load.xml ../samples/bitmap.xml', { cwd: __dirname }).toString();
      const mapping = JSON.parse(result);
      
      assert(mapping.map['#/sdfObject/Load'], 'Should have Load mapping');
      assert(mapping.map['#/sdfObject/Bitmap'], 'Should have Bitmap mapping');
    });

    it('should distinguish between properties and actions', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M>
  <Object ObjectType="MODefinition">
    <Name>Test Object</Name>
    <ObjectID>9999</ObjectID>
    <Resources>
      <Item ID="1">
        <Name>Value</Name>
        <Operations>R</Operations>
      </Item>
      <Item ID="2">
        <Name>Reset</Name>
        <Operations>E</Operations>
      </Item>
    </Resources>
  </Object>
</LWM2M>`;
      
      const testFile = path.join(__dirname, 'test-temp.xml');
      fs.writeFileSync(testFile, xml);
      const result = execSync('node ../omaidmapper/omaidmapper.js test-temp.xml', { cwd: __dirname }).toString();
      const mapping = JSON.parse(result);
      
      assert(mapping.map['#/sdfObject/Test_Object/sdfProperty/Value'], 'Should map property');
      assert(mapping.map['#/sdfObject/Test_Object/sdfAction/Reset'], 'Should map action');
      
      fs.unlinkSync(testFile);
    });
  });

  describe('Direct Function Tests', function() {
    it('should create mapping from XML string', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M>
  <Object ObjectType="MODefinition">
    <Name>Test Object</Name>
    <ObjectID>1234</ObjectID>
    <Resources>
      <Item ID="100">
        <Name>Test Value</Name>
        <Operations>RW</Operations>
      </Item>
    </Resources>
  </Object>
</LWM2M>`;
      
      const mapping = omaidmapper.createMappingFromString(xml);
      
      assert(mapping.info, 'Should have info section');
      assert(mapping.map, 'Should have map section');
      assert.strictEqual(mapping.map['#/sdfObject/Test_Object'].id, 1234);
      assert.strictEqual(mapping.map['#/sdfObject/Test_Object/sdfProperty/Test_Value'].id, 100);
    });

    it('should create mapping from file paths', function() {
      const loadPath = path.join(__dirname, '..', 'samples', 'load.xml');
      const mapping = omaidmapper.createMapping([loadPath]);
      
      assert(mapping.info, 'Should have info section');
      assert(mapping.map['#/sdfObject/Load'], 'Should have Load mapping');
      assert.strictEqual(mapping.map['#/sdfObject/Load'].id, 3322);
    });

    it('should handle multiple files via function', function() {
      const loadPath = path.join(__dirname, '..', 'samples', 'load.xml');
      const bitmapPath = path.join(__dirname, '..', 'samples', 'bitmap.xml');
      const mapping = omaidmapper.createMapping([loadPath, bitmapPath]);
      
      assert(mapping.map['#/sdfObject/Load'], 'Should have Load mapping');
      assert(mapping.map['#/sdfObject/Bitmap'], 'Should have Bitmap mapping');
    });
  });

  describe('Name Conversion', function() {
    it('should replace spaces with underscores', function() {
      const result = execSync('node ../omaidmapper/omaidmapper.js ../samples/load.xml', { cwd: __dirname }).toString();
      const mapping = JSON.parse(result);
      
      const keys = Object.keys(mapping.map);
      const hasSpaces = keys.some(k => k.includes(' '));
      assert(!hasSpaces, 'Keys should not contain spaces');
    });

    it('should replace slashes with underscores', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M>
  <Object ObjectType="MODefinition">
    <Name>Test/Object</Name>
    <ObjectID>9999</ObjectID>
    <Resources></Resources>
  </Object>
</LWM2M>`;
      
      const mapping = omaidmapper.createMappingFromString(xml);
      assert(mapping.map['#/sdfObject/Test_Object'], 'Should replace slash with underscore');
    });

    it('should replace commas with underscores', function() {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LWM2M>
  <Object ObjectType="MODefinition">
    <Name>Test,Object</Name>
    <ObjectID>9999</ObjectID>
    <Resources></Resources>
  </Object>
</LWM2M>`;
      
      const mapping = omaidmapper.createMappingFromString(xml);
      assert(mapping.map['#/sdfObject/Test_Object'], 'Should replace comma with underscore');
    });
  });
});
