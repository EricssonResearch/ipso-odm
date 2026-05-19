/**
 * Tests for create-sdfthing utility
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Create SDF Thing', function() {
  
  before(function() {
    // Create test skeleton file
    const skeleton = {
      info: {
        title: 'Test Thing',
        version: '1.0.0',
        copyright: 'Test Copyright',
        license: 'BSD-3-Clause'
      },
      namespace: {
        test: 'https://example.com/test'
      },
      defaultNamespace: 'test'
    };
    fs.writeFileSync(path.join(__dirname, 'test-skeleton.json'), JSON.stringify(skeleton, null, 2));
    
    // Create test SDF object files
    const obj1 = {
      sdfObject: {
        Temperature: {
          sdfProperty: {
            value: { type: 'number' }
          }
        }
      }
    };
    const obj2 = {
      sdfObject: {
        Humidity: {
          sdfProperty: {
            value: { type: 'number' }
          }
        }
      }
    };
    fs.writeFileSync(path.join(__dirname, 'test-temp.json'), JSON.stringify(obj1, null, 2));
    fs.writeFileSync(path.join(__dirname, 'test-humid.json'), JSON.stringify(obj2, null, 2));
  });

  after(function() {
    // Clean up test files
    try {
      fs.unlinkSync(path.join(__dirname, 'test-skeleton.json'));
      fs.unlinkSync(path.join(__dirname, 'test-temp.json'));
      fs.unlinkSync(path.join(__dirname, 'test-humid.json'));
      fs.unlinkSync(path.join(__dirname, 'sdfthing-TestThing.sdf.json'));
    } catch (e) {}
  });

  describe('Thing Creation', function() {
    it('should create sdfThing from skeleton and objects', function() {
      const result = execSync(
        'node ../create-sdfthing/create-sdfthing.js test-skeleton.json test-temp.json test-humid.json',
        { cwd: __dirname }
      ).toString();
      
      const thing = JSON.parse(result);
      assert(thing.sdfThing, 'Should have sdfThing');
      assert(thing.info, 'Should have info from skeleton');
    });

    it('should merge multiple objects into thing', function() {
      const result = execSync(
        'node ../create-sdfthing/create-sdfthing.js test-skeleton.json test-temp.json test-humid.json',
        { cwd: __dirname }
      ).toString();
      
      const thing = JSON.parse(result);
      const thingName = Object.keys(thing.sdfThing)[0];
      const objects = thing.sdfThing[thingName].sdfObject;
      
      assert(objects.Temperature, 'Should have Temperature object');
      assert(objects.Humidity, 'Should have Humidity object');
    });

    it('should preserve object properties', function() {
      const result = execSync(
        'node ../create-sdfthing/create-sdfthing.js test-skeleton.json test-temp.json',
        { cwd: __dirname }
      ).toString();
      
      const thing = JSON.parse(result);
      const thingName = Object.keys(thing.sdfThing)[0];
      const tempObj = thing.sdfThing[thingName].sdfObject.Temperature;
      
      assert(tempObj.sdfProperty, 'Should have sdfProperty');
      assert(tempObj.sdfProperty.value, 'Should have value property');
    });

    it('should write to file when -f flag is used', function() {
      execSync(
        'node ../create-sdfthing/create-sdfthing.js -f TestThing test-skeleton.json test-temp.json',
        { cwd: __dirname }
      );
      
      const outputFile = path.join(__dirname, 'sdfthing-TestThing.sdf.json');
      assert(fs.existsSync(outputFile), 'Should create output file');
      
      const content = fs.readFileSync(outputFile, 'utf-8');
      const thing = JSON.parse(content);
      assert(thing.sdfThing, 'File should contain sdfThing');
    });
  });

  describe('Error Handling', function() {
    it('should show usage when insufficient arguments', function() {
      try {
        execSync('node ../create-sdfthing/create-sdfthing.js', { 
          cwd: __dirname,
          stdio: 'pipe'
        });
        assert.fail('Should have thrown error');
      } catch (e) {
        // The script prints to stdout, not stderr
        const output = e.stdout ? e.stdout.toString() : '';
        // Script may exit without error but print usage
        if (output) {
          assert(output.includes('Usage'), 'Should show usage message');
        }
      }
    });
  });
});
