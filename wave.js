/* 
 * Waveform.js
 * 
 * Copyright (c) 2011-2014 by Tom Hargreaves <hex@freezone.co.uk>.  This
 * software is released under the terms of the GNU Lesser General
 * Public License, version 2 or (at your option) any later version.
 */

var Wave = (function(){

    var assert = console.assert ?
	function() { console.assert.apply(console, arguments); }
    : function() {};

function merge(src,dest) {
    for (var p in src) {
	if (src.hasOwnProperty(p))
	    dest[p] = src[p];
    }
    return dest;
}

function Wave(box, params) {
    var wave = this;

    /* There are three elements here:
     * scroller is an empty div with a horizontal scrollbar.
     * widthbox is a div inside scroller to set the scrollbar length.
     * canvas is placed atop scroller.
     * 
     * The reason for such shenanigans is that a canvas the width of
     * the entire waveform would be very large, especially when
     * zoomed.
     */
    var scroller = document.createElement("div");
    scroller.style.width = scroller.style.height = "100%";
    var widthbox = document.createElement("div");
    widthbox.style.height = '100%'; /* force visible */
    scroller.style.position = 'relative';
    scroller.appendChild(widthbox);
    var canvas = document.createElement("canvas");
    canvas.style.position = 'absolute';
    canvas.style.top = canvas.style.left = 0;
//    scroller.style.padding = scroller.style.margin = scroller.style.border = '0';

    merge({
	canvas: canvas,
	buf: [],
	scroller: scroller,
	widthbox: widthbox,
	zoom: 1,
	scale: 1,
	bound: true,
	autofit: false,
	slabThreshold: 0.1,
	waveStyle: 'black',
	axisStyle: 'black',
	undefStyle: 'gray',
// 	pointStyle: null,
	pointThreshold: 5,
	waveThreshold: Infinity,
	pointFunc: null,
	scrolloffset: 0,
	wheelZoom: 0.005,
    }, wave);
    
    merge(params, wave);

    if (!wave.autofit) {
	scroller.style.overflowX = "scroll";
	scroller.onscroll = function() {
	    if (wave.scroller.scrollLeft !== wave.scrolloffset) {
		wave.scrolloffset = wave.scroller.scrollLeft;
		//console.log("redraw: "+wave.scroller.scrollLeft+" "+wave.scrolloffset);
		wave.draw();
	    }// else
		//console.log("noredraw: "+wave.scroller.scrollLeft+" "+wave.scrolloffset);
	};
    }
    var dummy = document.createElement("div");
    dummy.appendChild(canvas);
    dummy.appendChild(scroller);
    dummy.style.width = dummy.style.height = '100%';
    box.appendChild(dummy);
    dummy.style.position = 'relative';

    window.addEventListener("resize", function() {
				if (resize_event (wave))
				    wave.invalidate();
			    }, false);

    widthbox.addEventListener("mousewheel",
	function(e) {
	    if (wave.wheelZoom && !wave.autofit) {
		var factor = Math.exp(e.wheelDelta*wave.wheelZoom);
		if (wave.zoomby(factor*100, wave.getPos(e).offset))
		    e.preventDefault();
	    }
	}, false);

    wave.invalidate();
}

Wave.prototype.zoomby = function(factor, offset) {
    factor /= 100;
    if (typeof offset !== 'number')
	offset = 50;
    offset /= 100;
    var cw = this.scroller.clientWidth;
    var offx = cw * offset;
    var s2 = factor * (offx + this.scrolloffset) - offx;
    var width = (this.buf.length-1)*this.zoom*factor;
    if (s2 < 0)
	s2 = 0;
    if (s2 >= width - cw)
	s2 = width - cw;

    if (this.autofit || !this.buf.length)
	return false;
    if (this.zoom <= cw/(this.buf.length-1) && factor < 1 && this.bound)
	return false;

    this.widthbox.style.width = width+"px";
    this.scroller.scrollLeft = s2;
    if (s2 - this.scroller.scrollLeft > 10) {
	/* eek, we ran out of precision. abort! abort! */
	console.log("scroff="+this.scrolloffset+ " scrleft="+this.scroller.scrollLeft+" s2="+s2+" width="+this.widthbox.style.width+" width.wanted="+this.buf.length*this.zoom+" zoom="+this.zoom);
	this.widthbox.style.width = (this.buf.length-1)*this.zoom+"px";
	this.scroller.scrollLeft = this.scrolloffset;
	return false;
    }

    /* commit */
    if (!factor)
	this.zoom = 0; /* explicit just in case zoom is infinite */
    else
	this.zoom *= factor;
    this.scrolloffset = s2;
    this.invalidate();
    return true;
}

Wave.prototype.scrollto = function(pos, overlap, off) {
    pos *= this.zoom;
    var w = this.scroller.clientWidth;
    if (overlap === undefined)
	overlap = 10;
    if (off === undefined)
	off = 50;
    overlap /= 100;
    off /= 100;
    if (this.scrolloffset+w*overlap < pos &&
	this.scrolloffset+w*(1-overlap) > pos) {
//	console.log("pos="+pos+
//		    " left="+(this.scrolloffset+w*overlap)+
//		    " right="+(this.scrolloffset+w*(1-overlap)));
	return false;
    }

    var len = this.buf ? this.buf.length : 0;
    var s = pos - w*off;
    if (s < 0)
	s = 0;
    else
	/* don't scroll into undefined regions */
	if (s+w > (this.buf.length-1)*this.zoom)
	    s = (this.buf.length-1)*this.zoom - w;

    //this.widthbox.style.width = ((this.buf.length-1)*this.zoom-1)+"px";
//    console.log("width="+this.widthbox.style.width);
//    console.log("setting scrolleft to "+s);
    this.scroller.scrollLeft = this.scrolloffset = s;
//    console.log("scrolleft is now "+this.scroller.scrollLeft);
    this.draw();
    return true;
}

function resize_event(wave) {
    var changed = false;
    var dpr = window.devicePixelRatio;
    var w = wave.scroller.clientWidth * dpr;
    var h = wave.scroller.clientHeight * dpr;
    if ((w|0) != wave.canvas.width || (h|0) != wave.canvas.height) {
	//console.log("changed: w: "+wave.canvas.width+"=>"+w+" h: "+wave.canvas.height+"=>"+h);
	changed = true;
    }
    return changed;
}

Wave.prototype.invalidate = function() {
    var buf = this.buf || [];
    this.dpr = window.devicePixelRatio;
    this.canvas.width = this.scroller.clientWidth * this.dpr;
    this.canvas.height = this.scroller.clientHeight * this.dpr;
    this.canvas.style.width = this.scroller.clientWidth+'px';
    this.canvas.style.height = this.scroller.clientHeight+'px';

    if (buf.length) {
	var min = this.scroller.clientWidth/(buf.length-1);
	assert(this.scroller.clientWidth);
	if (this.zoom < min || this.autofit) {
	    this.scrolloffset = this.scroller.scrollLeft = 0;
	    if (this.autofit || this.bound || this.zoom <= 0) {
		//console.log("setting zoom to "+min+" (was "+this.zoom+")");
		this.zoom = min;
		//	    if (!buf.length)
		//		this.zoom = 1;
	    }
	}
    }

    /* move all the bars */
    for (var iter = this.barlist; iter; iter = iter._next)
	iter.setpos(iter.pos);

    this.lastlen = this.lastoffset = undefined;
    this.draw();
}

Wave.prototype.getPos = function(e) {
    var rect = this.canvas.getBoundingClientRect();
    var offsetX = e.clientX - rect.left;
    var offsetY = e.clientY - rect.top;
    
    var x = (offsetX + this.scrolloffset) / this.zoom;
    var yscale = this.canvas.height / this.dpr / 2 / 1.005;
    var y = 1 -offsetY / yscale;
    y = (y>1) ? 1 : (y<-1) ? -1 : y;
    y *= this.scale;

    x = Math.round(x);
    x = (x>this.buf.length) ? this.buf.length : (x<0) ? 0 : x;

    //console.log("x="+x+" y="+y);//[offsetX, offsetY]);
    return { pos: x, value: y, offset: 100*offsetX / (rect.right-rect.left) };
};

Wave.prototype.draw = function() {
    var time=Date.now();
    var canvas = this.canvas;
    var wave=this;
    var scrolloffset = this.scrolloffset;
    var lastoffset = this.lastoffset;
    var zoom = this.zoom;
    var buf = this.buf || [];

    if (zoom <= 0)
	return;

    var c=canvas.getContext("2d");
    var dpr = this.dpr;
    var w=canvas.width / dpr;
    var h=canvas.height / dpr;
    var len=buf.length;
    var yscale=h/2/1.005;

    if (len !== this.lastlen) {
	this.widthbox.style.width=((buf.length-1)*zoom-1)+"px";
	this.scroller.scrollLeft = this.scrolloffset;
    }

    c.save();
    c.scale(this.dpr, this.dpr);
    c.translate(0.5, 0.5);
    /* henceforth everything is in px */

    var xstart=scrolloffset;
    var xend=w+scrolloffset;
    
    var error = 0;

    /* find out how much is already drawn */
    {
	var lastvalid = (this.lastoffset !== undefined);
	
	var laststart, lastend;
	var overlap = false;
	if (lastvalid || !this.eager) {
	    laststart=this.lastoffset;
	    lastend=this.lastoffset+w;
	    if (laststart == scrolloffset) {
		/* we didn't scroll, but previously-invalid data may
		 * now be valid */
		xstart = this.lastlen * zoom-1;
		xend = len * zoom+1;
		//console.log("xstart="+xstart+" xend="+xend);
		c.clearRect(xstart+scrolloffset, 0, xend-xstart, h);
		//c.beginPath();
		//c.rect(lastend-scrolloffset,0,xend-lastend,h);
		//c.closePath();
		//c.clip();
		overlap = true;
	    } else {
		/* we scrolled, maybe we can copy an already-drawn region */
		overlap = true;

		if (lastend >= scrolloffset && laststart <= scrolloffset) {
		    xstart = lastend;
		    var im=c.getImageData(0,0,w*dpr,h*dpr);
		    c.clearRect(0,0,w,h);
		    var move = (laststart-scrolloffset)*dpr;
//		    //console.log("move="+move);
		    var approx = Math.round(move);
		    error = move - approx;
		    c.putImageData(im,approx,0);
		    c.beginPath();
		    c.rect(lastend-scrolloffset-2,0,xend-lastend+2,h);
		    c.closePath();
		    c.clip();
		} else if (laststart <= scrolloffset+w && lastend >= scrolloffset+w) {
		    xend = laststart;
		    var im=c.getImageData(0,0,w*dpr,h*dpr);
		    c.clearRect(0,0,w,h);
		    var move = (laststart-scrolloffset)*dpr;
		    var approx = Math.round(move);
		    error = move - approx;
		    c.putImageData(im,approx,0);
		    c.beginPath();
		    c.rect(0,0,laststart-xstart+2,h);
		    c.closePath();
		    c.clip();
		} else
		    overlap = false;
	    }
	}
	if (!overlap)
	    c.clearRect(0,0,w,h);
    }

    //    gebi("d").innerHTML= ("xstart "+xstart+" xend "+xend+" lastoff "+lastoffset+" l+w "+(lastoffset+w));
    this.lastoffset=scrolloffset + error/dpr;
//    console.log("error="+error+ "lastoff="+this.lastoffset);
//    this.lastoffset=(laststart-scrolloffset)*dpr;
    this.lastlen=len;
    //console.log("zoom="+zoom);
    var istart=Math.floor((xstart-5)/zoom);
    var iend=Math.ceil((xend+5)/zoom);
    //if (istart<0) istart=0;
    //if (iend>len) iend=len;
    //console.log("len="+len+" istart="+istart+" iend="+iend);
    c.translate(-scrolloffset,yscale);
    yscale/=this.scale;

    function shade(p,q) {
	c.save();
	c.scale(.5,.5); /* draw patterns at 50% */
	c.fillStyle=(typeof wave.undefStyle === 'string') ? wave.undefStyle : c.createPattern(wave.undefStyle,'repeat');
	c.fillRect(p*zoom*2,-yscale*2,(q-p)*zoom*2,yscale*2*2);
	c.restore();
    }
    if (!len) {
	/* no data */ 
	shade(istart, iend);
    } else {
	if (istart < 0) {
	    shade(istart, 0);
	    istart = 0;
	}
	if (iend >= len) {
	    shade(len-1, iend);
	    iend = len-1;
	}

	/* axis */
	if (this.axisStyle) {
	    c.strokeStyle = this.axisStyle;
	    c.beginPath();
	    c.moveTo(istart*zoom, 0);
	    c.lineTo(iend*zoom, 0);
	    c.stroke();
	}

	/* wave */
	if (zoom < this.waveThreshold) {
	    c.strokeStyle=this.waveStyle === 'debug' ? '#'+(Math.random()*0xffffff|0x100000).toString(16) : this.waveStyle;
	    c.beginPath();
	    
	    assert(zoom > 0);
	    for (var i=istart; i<=iend; i++) {
		var x=i*zoom;
		if (zoom*this.dpr<this.slabThreshold) {
		    var min=buf[i], max=buf[i];
		    var j=i+1/(zoom*this.dpr);
		    //console.log("i="+i+" j="+j);
		    while (i++<=j) {
			if (min<buf[i]) min=buf[i];
		    if (max>buf[i]) max=buf[i];
		    }
		    c.lineTo(x, -min*yscale);
		    if (min != max) c.lineTo(x, -max*yscale);
		} else {
		    c.lineTo(x, -buf[i]*yscale);
		}
	    }
	    c.stroke();
	}

	/* points */
//	console.log("z="+zoom+" pthresh="+this.pointThreshold);
	if (zoom > this.pointThreshold && this.pointFunc) {
	    //c.fillStyle=this.pointStyle;
	    for (var i=istart; i<=iend; i++) {
		var x=i*zoom;
		this.pointFunc.call(this, c, x, -buf[i] * yscale);
		//c.fillRect(x-2, -buf[i]*yscale-2,4,4);
	    }
	}
    }
    c.restore();
//    console.log("rendering took "+(Date.now()-time)+" ms");
}

Wave.Squares = function (ctx, x, y) {
    ctx.fillStyle = 'black';
    ctx.fillRect (x-2, y-2, 4, 4);
}

Wave.Lollipops = function (ctx, x, y) {
    var rad = 3;
    ctx.strokeStyle = ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, 2*Math.PI, false);
    ctx.fill();
}

/* Bars: for marking playback position, loop points etc.  Since the
 * position may change rapidly these are implemented as a CSS overlay
 * to avoid having to repaint the canvas.
 */
Wave.prototype.addbar = function(pos, col) {
    var bar = document.createElement("div");
    bar.style.position = 'absolute';
    bar.style.height = '100%';
    bar.style.width = '1px';
    bar.style.top = 0;
    bar.style.overflowX = 'hidden';
    bar.style.background = col || 'black';
    //bar.style.zIndex = 999;
    var wave = this;

    var obj = {
	wave: wave,
	setpos: setpos,
	destroy: destroy,
    };

    wave.widthbox.appendChild(bar);

    function setpos(pos) {
	obj.pos = pos;
	bar.style.left = (pos*wave.zoom) + 'px';
    }

    function destroy() {
	bar.parentNode.removeChild(bar);

	var iter = wave.barlist;
	if (iter === obj) {
	    wave.barlist = null;
	} else {
	    while (iter._next !== obj)
		iter = iter._next;
	    iter._next = obj._next;
	}
	bar = obj = null;
    }

    setpos(pos);

    obj._next = wave.barlist;
    wave.barlist = obj;

    return obj;
}

Wave.prototype.removebar = function(bar) {
    bar.destroy();
}

return Wave;

})();
