var express=require('express'),https=require('https'),app=express();
var PORT=process.env.PORT||8080;
var INST=process.env.ULTRA_INSTANCE;
var TOK=process.env.ULTRA_TOKEN;

app.use(express.json());
app.get('/health',function(q,r){r.json({status:'ok'})});
app.get('/webhook',function(q,r){r.sendStatus(200)});

// قاعدة بيانات الشركاء
var partners={
'insurance_alhaya':{name:'شركة الحياة للتأمين',type:'insurance',services:'1. سيارة\n2. صحي\n3. منزل'},
'lab_alnoor':{name:'مختبرات النور',type:'lab',services:'1. تحليل دم\n2. سكر\n3. PCR'},
'rental_real':{name:'ريال للسيارات',type:'rental',services:'1. يومي\n2. اسبوعي\n3. شهري'}
};

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
var text=(msg.data.body||'').trim();
var low=text.toLowerCase();

// تحقق من رابط الشريك
if(low.startsWith('start_')){
var slug=low.replace('start_','');
var p=partners[slug];
if(p){
sessions[from]={step:'choose',partner:slug};
send(from,'مرحبا! اهلا بك في '+p.name+'\n\nاختر الخدمة:\n'+p.services);
}else{
send(from,'عذرا! الرابط غير صحيح.');
}
return;
}

if(!sessions[from]){
send(from,'مرحبا! يرجى استخدام الرابط الخاص بشريكنا.');
return;
}

var s=sessions[from];
var p=partners[s.partner];

if(s.step==='choose'){
send(from,'ممتاز! ما اسمك الكريم؟');
s.step='name';s.service=text;
}
else if(s.step==='name'){
send(from,'شكرا '+text+'!\n\nتم استلام طلبك بنجاح ✅\nسيتواصل معك فريق '+p.name+' قريبا.');
sessions[from]={step:'done',partner:s.partner};
}
else if(s.step==='done'){
send(from,'طلبك مسجل بالفعل ✅\n\nللطلب مجددا ارسل: start_'+s.partner);
}
}catch(e){console.log(e)}
});

app.listen(PORT);
