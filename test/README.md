# OMA-SDF Translation Tests

Test suite for the OMA-SDF translation toolkit.

## Test Coverage

### oma2sdf.test.js
Tests for OMA XML to SDF JSON conversion:
- Basic XML to SDF conversion
- Resource type conversion (Float, String, Boolean, Integer, Opaque, Time, Unsigned Integer)
- Operations mapping (R, W, E)
- Name conversion (spaces to underscores)
- Copyright and license handling
- Error handling for invalid input
- oma:id quality extraction
- Reusable resource references

### sdf2oma.test.js
Tests for SDF JSON to OMA XML conversion:
- Basic SDF to XML conversion
- Object name and description conversion
- Property to Resource conversion
- Type mapping (number->Float, string->String, etc.)
- Action to Execute resource conversion
- ID mapping (from idmap.json and oma:id quality)
- Operations mapping (readable/writable)
- sdfRequired/Mandatory handling
- XML output integrity (no double-escaping, special characters)
- Error handling

### roundtrip.test.js
Tests for data integrity through round-trip conversions:
- OMA -> SDF -> OMA preservation
- Object name, description, and ID preservation
- Resource type and ID preservation
- Resource count maintenance

### omaidmapper.test.js
Tests for OMA ID mapping generation:
- Valid JSON mapping generation
- Object ID mapping
- Resource ID mapping
- Multiple file handling
- Property vs Action distinction
- Name conversion (spaces, slashes, commas to underscores)

### create-sdfthing.test.js
Tests for SDF Thing creation:
- Thing creation from skeleton and objects
- Multiple object merging
- Property preservation
- File output with -f flag
- Error handling

### webservice.test.js
Integration tests for web service wrapper:
- POST /oma2sdf endpoint
- POST /sdf2oma endpoint
- GET / index page
- Error responses (400 for invalid input)

## Running Tests

### Install dependencies
```bash
cd test
npm install
```

### Run all tests
```bash
npm test
```

### Run specific test suites
```bash
npm run test:oma2sdf
npm run test:sdf2oma
npm run test:roundtrip
npm run test:mapper
npm run test:thing
npm run test:ws
```

### Run from project root
```bash
npm test
```

## Requirements

- Node.js >= 22
- Parent package dependencies installed (`npm install` in project root)
