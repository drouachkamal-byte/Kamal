var express=require('express'),https=require('https'),app=express();
var PORT=process.env.PORT||8080;
var INST=process.env.ULTRA_INSTANCE;
var TOK=process.env.ULTRA_TOKEN;

app.use(express.json());
app.get('/health',function(q,r){r.json({status:'ok'})});
app.get('/webhook',function(q,r){r.sendStatus(200)});

function send(to,msg){
var d=JSON.stringify({token:TOK,to:to,body:msg});
var o={hostname:'api.ultramsg.com',path:'/'+INST+'/messages/chat',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d)}};
var x=https.request(o);x.write(d);x.end();
}

var sessions={};

app.post('/webhook',function(q,r){
r.sendStatus(200);
try{
var msg=q.body;
if(!msg.data||msg.data.fromMe)return;
var from=msg.data.from;
var text=(msg.data.body||'').trim().toLowerCase();
if(!sessions[from])sessions[from]={step:'start'};
var s=sessions[from];

if(s.step==='start'){
send(from,'مرحبا! اختر الخدمة:\n1. تأمين\n2. مختبر\n3. سيارات');
s.step='choose';
}
else if(s.step==='choose'){
if(text==='1'||text.includes('تأمين')){
send(from,'اختر نوع التأمين:\n1. سيارة\n2. صحي\n3. منزل');
s.step='insurance';
}
else if(text==='2'||text.includes('مختبر')){
send(from,'اختر الفحص:\n1. دم\n2. سكر\n3. pcr');
s.step='lab';
}
else if(text==='3'||text.includes('سيار')){
send(from,'اختر فترة الإيجار:\n1. يومي\n2. أسبوعي\n3. شهري');
s.step='rental';
}
else{send(from,'اختر 1 او 2 او 3');}
}
else if(s.step==='insurance'){
send(from,'ممتاز! ما اسمك؟');
s.step='ins_name';s.service=text;
}
else if(s.step==='ins_name'){
send(from,'شكرا '+text+'! سيتواصل معك فريقنا قريبا.');
s.step='start';sessions[from]={step:'start'};
}
else if(s.step==='lab'){
send(from,'ما اسمك؟');
s.step='lab_name';s.service=text;
}
else if(s.step==='lab_name'){
send(from,'تم الحجز '+text+'! سنتواصل لتحديد الموعد.');
s.step='start';sessions[from]={step:'start'};
}
else if(s.step==='rental'){
send(from,'ما اسمك؟');
s.step='rent_name';s.service=text;
}
else if(s.step==='rent_name'){
send(from,'تم الحجز '+text+'! سيتواصل معك فريقنا.');
s.step='start';sessions[from]={step:'start'};
}
}catch(e){console.log(e)}
});

app.listen(PORT);
