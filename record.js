/*** Web Audio context ***/
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

/*** Other local variables ***/
var rec = []; /* recorded samples */
var dirty = false; /* whether we have new audio */

function gebi(el) { return document.getElementById(el); }
var meter = gebi("meter");
var el = gebi("status");
var posbar;
var recording = false;


/*** Callbacks ***/
function record () {
    if (!playback.playing)
	recording = true;
}

function stop () {
    if (recording)
	recording = false;

    if (playback.playing)
	playback.stop();
}

function play () {
    if (playback.playing || recording)
	return;

    if (!playback.start(rec, finished))
	return;

    posbar = wave.addbar(0, 'blue');

    /* when we're playing connect up the monitor to the output rather
     * than the input.  Sadly this runs afoul of crbug.com/176808. */
    input.disconnect(monitor);
    playback.node.connect(monitor);
}

function finished() {
    wave.removebar(posbar);
    posbar = null;
    playback.node.disconnect(monitor);
    input.connect(monitor);
}

function clear() {
    stop();
    rec.length = 0;
    wave.invalidate();
}

var buf = null;

/* a buffer full of audio awaits us */ 
function audio(e) {
    buf = e.inputBuffer.getChannelData(0);

    if (recording) {
	for (var i=0; i<buf.length; i++)
	    rec.push(buf[i]);
    }
    dirty = true;
}

/* add callbacks */
var callbacks = {
    start: record,
    stop: stop,
    clear: clear,
    play: play,
    zin: function() { wave.zoomby(200); },
    zout: function() { wave.zoomby(50); },
    fit: function() { wave.zoomby(0); },
    i: function() {wave.invalidate(); },
};

for (var i in callbacks) {
    if (callbacks.hasOwnProperty(i))
	gebi(i).addEventListener('click', callbacks[i], false);
}

var autozoom;
var azel=gebi("autozoom");
(azel.onchange = function () { autozoom=azel.checked; })();


/*** Set up audio input ***/
(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia)
    .call(navigator, { audio: true }, startmedia, function(e) {
			  alert('No live audio input: ' + e);
		       });

var node;
var input;

var monitor = (ctx.createScriptProcessor ||
		ctx.createJavaScriptNode)
	.call(ctx,
	      2048, /* buffer size */
	      1,    /* channels in */
	      1     /* channels out */
	     );
monitor.connect(ctx.destination); /* I have no idea why this is needed */
monitor.onaudioprocess = audio;

function startmedia(stream) {
    input = ctx.createMediaStreamSource(stream);

    input.connect(monitor);
}


/*** Waveform object ***/
var wave = new Wave(gebi("waveform"), {
			buf: rec,
			zoom: 1/500, /* 500 samples per pixel */
			bound: false,
			waveStyle: 'indigo',
			undefStyle: pattern(),

		/* replace waveform with points at >5 pixels per sample */
			pointFunc: Wave.Lollipops,
			pointThreshold: 5,
			waveThreshold: 5,
		    });

/* scope */
var scope = new Wave(gebi("scope"), {
    autofit: true
});

/* Make a stripy pattern (because we can) */
function pattern() {
    var c = document.createElement("canvas");
    var ctx = c.getContext("2d");
    c.width = c.height = 20; /* adjust to change stripe distance */
    ctx.scale(c.width/4,c.height/4);
    ctx.fillStyle="#555";
    ctx.fillRect(0,0,4,4);
    ctx.fillStyle="#aaa";
    ctx.transform(1,-1,1,1,0,0);
    ctx.fillRect(-3,0,6,1);
    ctx.fillRect(-3,2,6,1);
    return c;
}

/* update the waveform */
function update () {
    if (dirty) {
	dirty = false;

	if (recording) {
	    /* scroll if we need to */
	    var scrolled = wave.scrollto(rec.length, 0, 100);
	    
	    if (scrolled && autozoom)
		wave.zoomby(80); /* zoom out if we need to */
	    
	    /* draw new data */
	    wave.draw();
	}

	/* draw meter */
	var sum = 0;
	for (var i=0; i<buf.length; i++)
	    sum += buf[i] * buf[i];
	sum /= buf.length;
	/* this isn't in units of anything in particular */
	var vu = sum && Math.log(sum)/Math.log(10) / 10 + 1;
	vo = vu < 0 ? 0 : vu;
	meter.value = vu;

	/* draw scope */
	scope.buf = buf;
	scope.invalidate();
    }

    /* status line */
    var status = (playback.playing ? 'Playing' : 
		  (recording ? 'Recording' : 'Ready'));
    var len = (rec.length/ctx.sampleRate).toFixed(2)+
	"sec ("+rec.length+" samples @ "+ctx.sampleRate+"Hz, "+(rec.length*4/1048576).toFixed(1)+"MiB)";
    el.innerHTML = status+" "+len;

    if (playback.playing) {
	/* set the bar to the current playback position */
	var pos = playback.offset();
	posbar.setpos(pos);

	/* and make sure it's in view */ 
        wave.scrollto(pos, 5, 5);
    }

    window.requestAnimationFrame(update);
}

/* kick off the updates */
window.requestAnimationFrame(update);


/*** Playback object ***/
var playback = (function (ctx) {
     var playback = {
	 playing: false,
	 timestarted: undefined,
	 node: null,
	 ctx: ctx
     };

     playback.offset = function() {
	 if (!this.playing)
	     return undefined;
	 
	 return (this.ctx.currentTime - this.timestarted) * this.ctx.sampleRate;    
     };    

     /* start playback */
     playback.start = function(buf, cb) {
	 if (!buf || !buf.length)
	     return false;
	 this.node = this.ctx.createBufferSource();
	 this.node.buffer = makebuf(buf);
	 this.node.connect(this.ctx.destination);
	 this.timestarted = this.ctx.currentTime;
	 this.finished = cb;
	 this.node.onended = this.stop;
	 this.node.start(0);
	 this.playing = true;
	 return true;
     };
     
     /* stop playback */
     playback.stop = function() {
	 /* can't rely on 'this' being set correctly */
	 try {
	     playback.node.stop(0);
	 } catch (e) {}
	 playback.playing = false;
	 if (playback.finished)
	     playback.finished();
	 playback.node = null;
     };
     
     /* turn an array of sample data into an AudioBuffer for playback */
     function makebuf(rec) {
	 var recbuf = ctx.createBuffer(1, rec.length, ctx.sampleRate);
	 var buf = recbuf.getChannelData(0);
	 for (var i=0; i<rec.length; i++)
	     buf[i] = rec[i];
	 
	 return recbuf;
     }
     
     return playback;
})(ctx);
