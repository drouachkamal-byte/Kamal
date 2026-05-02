var express=require('express'),https=require('https'),app=express();
var PORT=process.env.PORT||8080;
app.use(express.json());
app.get('/health',function(q,r){r.json({status:'ok'})});
app.post('/webhook',function(q,r){
r.sendStatus(200);
try{
var msg=q.body.messages[0];
var from=msg.from;
var instance=process.env.ULTRA_INSTANCE;
var token=process.env.ULTRA_TOKEN;
var data=JSON.stringify({token:token,to:from,body:'Hello! BotFlow works!'});
var opt={hostname:'api.ultramsg.com',path:'/'+instance+'/messages/chat',method:'POST',headers:{'Content-Type':'application/json'}};
var x=https.request(opt);x.write(data);x.end();
}catch(e){console.log(e)}
});
app.listen(PORT);
