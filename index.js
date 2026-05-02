var express=require('express'),https=require('https'),app=express();
var PORT=process.env.PORT||8080;
app.use(express.json());
app.get('/health',function(q,r){r.json({status:'ok'})});
app.get('/webhook',function(q,r){
var m=q.query['hub.mode'],t=q.query['hub.verify_token'],c=q.query['hub.challenge'];
if(m&&t===process.env.WA_VERIFY_TOKEN){r.status(200).send(c)}else{r.sendStatus(403)}
});
app.post('/webhook',function(q,r){
r.sendStatus(200);
try{
var msg=q.body.entry[0].changes[0].value.messages[0];
var from=msg.from;
var data=JSON.stringify({messaging_product:'whatsapp',to:from,type:'text',text:{body:'Hello! BotFlow works!'}});
var opt={hostname:'graph.facebook.com',path:'/v18.0/'+process.env.WA_PHONE_NUMBER_ID+'/messages',method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.WA_ACCESS_TOKEN}};
var x=https.request(opt);x.write(data);x.end();
}catch(e){console.log(e)}
});
app.listen(PORT);
