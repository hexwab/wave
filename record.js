var ctx;
try { 
    ctx = new AudioContext();
} catch (e) {
    try {
	    ctx = new webkitAudioContext();
    } catch (e) {
    alert("Web Audio init failed: "+e);
    }
}

var node = (ctx.createScriptProcessor ||
                 ctx.createJavaScriptNode)
    .call(ctx,
	  1024, /* buf */
	  1,    /* in */
	  1     /* out */
	 );

var rec = [];
var dirty = false;

function gebi(el) { return document.getElementById(el); }

var el = gebi("status");
if (!el)
    alert ("!el");
node.onaudioprocess = function(e){
    var buf=e.inputBuffer.getChannelData(0);
    //console.log(buf.length);
    //rec=[];
    for (var i=0; i<buf.length; i++)
	rec.push(buf[i]);
//    rec=rec.concat(buf);
//    console.log("buf len="+buf.length+" rec len="+rec.length);
    var sum=0;
    for (var i=0; i<buf.length; i++)
	sum += buf[i] * buf[i];
    sum /= buf.length;
    el.innerHTML=Math.log(sum)/Math.log(10)+" dB"+" len="+rec.length;
    dirty = true;
}

if (!navigator.getUserMedia)
    navigator.getUserMedia = navigator.webkitGetUserMedia;
navigator.getUserMedia({audio: true}, startUserMedia, function(e) {
			  alert('No live audio input: ' + e);
		       });

function startUserMedia(stream) {
    var input = ctx.createMediaStreamSource(stream);
    console.log('Media stream created.');
    
    console.log('Input connected to audio context destination.');
    
    //source.context.connect(node);
    //node.connect(ctx.destination);

    //recorder = new Recorder(input);

    input.connect(node);
    node.connect(ctx.destination);
    console.log('Recorder initialised.');
}

var wave = new Wave(gebi("canvas"),gebi("fakecanvas2"),gebi("fakecanvas"));
wave.buf = rec;


function update () {
    if (dirty) {
	wave.buf = rec;
	wave.zoomby(0); /* zoom out */
	wave.invalidate();
	dirty = false;
    }
    window.requestAnimationFrame(update);
}

window.requestAnimationFrame(update);
//setInterval(update, 100);

//wave.buf = [0,1,0,1,0,1,1,0,1,1];
//wave.zoomby(0); /* zoom out */
//wave.invalidate();
