var buf = new Float32Array(500);

for (var i=0; i<buf.length; i++) {
    buf[i] = 0;
}

function gebi(id) {
    return document.getElementById(id);
}

var el = gebi("wave");

var wave = new Wave(el, {buf: buf, waveStyle: 'darkgreen' });
wave.zoomby(0);
var area = wave.widthbox; /* draggable area, excluding scrollbars */

gebi("zin").onclick = function() { wave.zoomby(200); };
gebi("zout").onclick = function() { wave.zoomby(50); };

var dragging = false;

var last;

function drag (e) {
    /* It's possible to get here with no buttons pressed, e.g. by
     * dragging outside the window.  We should abort in this case.
     * Sadly, the buttons property doesn't yet exist everywhere, so
     * explicitly check for zero.
     */
    if (e.buttons===0) {
	stopdrag();
	return;
    }

    var where = wave.getPos(e);
    
    var p = where, q = last;

    if (p.pos > q.pos) {
	/* swap */
	var tmp = p;
	p = q;
	q = tmp;
    }
    var count = q.pos - p.pos;
    
    if (count) {
	for (var i=p.pos; i<=q.pos; i++) {
	    /* interpolate */
	    var f = (i - p.pos) / count;
	    var val = q.value * f + p.value * (1-f);
	    buf[i] = val;
	}
    } else
	buf[where.pos] = where.value;

    last = where;
    wave.invalidate();
}

function down (e) {
    area.addEventListener('mousemove',
			drag,
			false);
    last = wave.getPos(e);
    buf[last.pos] = last.value;
    wave.invalidate();
}

function stopdrag() {
    area.removeEventListener('mousemove',
			   drag,
			   false);
}

area.addEventListener('mousedown',
		    down,
		    false);
area.addEventListener('mouseup',
		    stopdrag,
		    false);
