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

ctx.script = ctx.createScriptProcessor ||
                 ctx.createJavaScriptNode;
var node = ctx.script(
	  1024, /* buf */
	  1,    /* in */
	  1     /* out */
	 );

var rec = [];
var dirty = false;

function gebi(el) { return document.getElementById(el); }

var meter = gebi("meter");
var el = gebi("status");
var posbar = gebi("posbar");
var recording = false;
gebi("start").onclick = function () { recording = true; };
gebi("stop").onclick = function () { if (recording) recording = false; if (playing) stop(); };
gebi("clear").onclick = function () { rec=[]; dirty = true; };
gebi("play").onclick = function () { if (!playing) { makebuf(); play(); } };
gebi("zin").onclick = function () { wave.zoomby(2); };
gebi("zout").onclick = function () { wave.zoomby(0.5); };
gebi("i").onclick = function () { wave.invalidate(); };
node.onaudioprocess = function(e){
    var buf=e.inputBuffer.getChannelData(0);

    { /* meter */
	var sum=0;
	for (var i=0; i<buf.length; i++)
	    sum += buf[i] * buf[i];
	sum /= buf.length;
	//    el.innerHTML=Math.log(sum)/Math.log(10)+" dB"+" len="+rec.length;
	meter.value = Math.log(sum)/Math.log(10);
    }


    var status = (playing ? 'Playing' : 
	(recording ? 'Recording' : 'Ready'));
    var len = (rec.length/ctx.sampleRate).toFixed(2)+"sec ("+rec.length+" samples @ "+ctx.sampleRate+"Hz)";
    el.innerHTML = status+" "+len;

    if (recording) {
	for (var i=0; i<buf.length; i++)
	    rec.push(buf[i]);
	dirty = true;
    }
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
wave.zoomby(0.01); /* zoom out */

var playing = false;
var timestarted;
var recbuf;
var playnode;

function update () {
    if (dirty) {
	wave.buf = rec;
	wave.scrollto(rec.length);
	wave.draw();
	dirty = false;
    }
    if (playing) {
	/* draw point */
	//console.log();
	var pos = (ctx.currentTime - timestarted) * ctx.sampleRate;
	var offset = pos*wave.zoom - wave.scrolloffset;
	posbar.style.left = (offset|0)+"px";
	wave.scrollto(pos);
//	console.log((offset|0)+"px");
    }
    window.requestAnimationFrame(update);
}

window.requestAnimationFrame(update);
//setInterval(update, 100);

//wave.buf = [0,1,0,1,0,1,1,0,1,1];
//wave.zoomby(0); /* zoom out */
//wave.invalidate();
function makebuf() {
    if (!rec.length)
	return;
    recbuf = ctx.createBuffer(1, rec.length, ctx.sampleRate);
    var buf = recbuf.getChannelData(0);
    for (var i=0; i<rec.length; i++)
	buf[i] = rec[i];
}

function stopped() {
    playing = false;
    posbar.style.display = 'none';
}
function stop() {
    try {
	/* due to the imprecise timing, it's 
	 * conceivable we may try this when already stopped.
	 */ 
	playnode.stop(0);
    } catch (e) {}
    stopped();
}

function play() {
    if (!recbuf)
	return;
    playnode = ctx.createBufferSource();
    playnode.buffer = recbuf;
    playnode.connect(ctx.destination);
    timestarted = ctx.currentTime;
    playnode.onended = stopped; /* hopefully at some point in the future this'll start working */
    setTimeout(stopped, recbuf.length / ctx.sampleRate * 1000);
    playnode.start(0);
    posbar.style.display = 'block';
    posbar.style.left = '0';
    playing = true;
}

/*
var playnode = ctx.script(4096, 0, 1);
var offset = 0;
function play() {
    var buf=e.inputBuffer.getChannelData(0);
    var len = rec.length-offset;
    if (len > buf.length) len = buf.length;
    var i;
    for (i=0; i<len; i++)
	buf[i] = rec[i+offset];
    for (;i<buf.length; i++)
	buf[i] = 0;
}
*/