var express = require('express');
var app = express();
var PORT = process.env.PORT || 8080;
app.use(express.json());
app.get('/health', function(req, res){ res.json({status:'ok'}); });
app.get('/webhook', function(req, res){ var mode = req.query['hub.mode']; var token = req.query['hub.verify_token']; var challenge = req.query['hub.challenge']; if(mode && token === process.env.WA_VERIFY_TOKEN){ res.status(200).send(challenge); }else{ res.sendStatus(403); } });
app.post('/webhook', function(req, res){ res.sendStatus(200); });
app.listen(PORT);
