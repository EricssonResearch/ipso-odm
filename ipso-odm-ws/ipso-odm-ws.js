/** 
 * Web service wrapper for IPSO OneDM toolkit
 * @author Ari Keränen
 */

const app = require('express')();
const bodyParser = require('body-parser');
const helmet = require('helmet');
const debug = require('debug')('ipso-odm-ws');

const ipso2odm = require('../ipso2odm');
const odm2ipso = require('../odm2ipso');
const odmlint = require('../odmlint');
const INDEX_HTML = `
  <html><body>
   Web service wrapper for
   <a href="https://github.com/EricssonResearch/ipso-odm#web-service-mode">
   IPSO OneDM toolkit</a>.
  </body></html>
`

const PORT = process.env.PORT || 8083;

app.use(helmet());
app.use(bodyParser.raw({type: '*/*'}));
app.use(function(req, res, next) { /* allow CORS */
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept");
  next();
});



app.post('/ipso2odm', (req, res) => {
  debug("Request from: " + req.ip);
  debug("Copyright parameter: " +  req.query.copyright);
  debug("License parameter: " + req.query.license);
  try {
    let odm = ipso2odm.createOdm(req.body.toString().trim(),
      JSON.parse(req.query.copyright), JSON.parse(req.query.license));
    let json = JSON.stringify(odm, null, 2);
    debug("Converted info title: %s", odm.info.title);
    res.set('Content-Type', 'application/json');
    res.send(json);
  } catch(err) {
    debug(err);
    res.status(400).send("Can't convert. " + err);
  }
});

app.post('/odmlint', (req, res) => {
  debug("Request from: " + req.ip);
  res.set('Content-Type', 'application/json')

  try {
    let lintRes = odmlint.odmLint(JSON.parse(req.body.toString().trim()));
    res.send(lintRes);
  } catch(err) {
    debug(err);
    res.status(400).send("Can't run linter. " + err);
  }
});


app.post('/odm2ipso', (req, res) => {
  debug("Request from: " + req.ip);
  try {
      let ipso = odm2ipso.getFormattedXml(JSON.parse(req.body));
      res.set('Content-Type', 'text/xml');
      res.send(ipso);
  } catch(err) {
    debug(err);
    res.status(400).send("Can't convert. " + err+"\n");
  }
}
);


app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(INDEX_HTML);
});


app.listen(PORT, () => {
  console.log(`Starting web service on port ${PORT}`);
});

