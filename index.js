var express = require('express');
var axios = require('axios');
var app = express();
var PORT = process.env.PORT || 8080;
var TOKEN = process.env.WA_ACCESS_TOKEN;
var PHONE_ID = process.env.WA_PHONE_NUMBER_ID;

app.use(express.json());

app.get('/health', function(req, res){ res.json({status:'ok'}); });

app.get('/webhook', function(req, res){
var mode = req.query['hub.mode'];
var token = req.query['hub.verify_token'];
var challenge = req.query['hub.challenge'];
if(mode && token === process.env.WA_VERIFY_TOKEN){ res.status(200).send(challenge); }else{ res.sendStatus(403); }
});

app.post('/webhook', function(req, res){
res.sendStatus(200);
var body = req.body;
if(body.object && body.entry){
body.entry.forEach(function(entry){
entry.changes.forEach(function(change){
if(change.value.messages){
var msg = change.value.messages[0];
var from = msg.from;
var text = msg.text ? msg.text.body : '';
axios.post('https://graph.facebook.com/v18.0/'+PHONE_ID+'/messages',{messaging_product:'whatsapp',to:from,type:'text',text:{body:'مرحباً! 👋 أهلاً بك في BotFlow'}},{headers:{Authorization:'Bearer '+TOKEN}});
}
});
});
}
});

app.listen(PORT);
