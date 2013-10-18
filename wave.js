function Wave(el,widthbox, scroller) {
    function zoomby(factor) {
	this.zoom *= factor;
	var min = this.scroller.clientWidth/this.buf.length;
	if (this.zoom < min) {
//	    console.log("min="+min+" zoom="+this.zoom);
//	    factor *= min / this.zoom;
//	    this.zoom = min;
	}

	var start = this.scroller.scrollLeft / this.zoom * factor;
	var end = start + this.scroller.clientWidth / this.zoom * factor;
	var mid = (start + end)/2;
	var len = (end - start)/2;

	var s2 = mid - len / factor;

	if (s2 && s2 > 0)
	    s2 *= this.zoom;
	else
	    s2 = 0;

	this.scrolloffset = this.scroller.scrollLeft = s2;

	this.invalidate();
    }

    function scrollto(pos, overlap, off) {
	pos *= this.zoom;
	var w = this.el.width;
	if (this.scrolloffset+w*overlap < pos &&
	    this.scrolloffset+w*(1-overlap) > pos)
	    return false;

	var s = pos - w*off;
	if (s < 0)
	    s = 0;
	else
	    if (s+w > this.buf.length*this.zoom)
		s= this.buf.length*this.zoom - this.el.width;

	this.widthbox.style.width=Math.floor(this.buf.length*this.zoom)+"px";
	this.scrolloffset = this.scroller.scrollLeft = s;

	return true;
    }

    function invalidate() {
	if (!this.buf) return;
	this.el.width = this.scroller.clientWidth * 1 /* dpr */;
	this.lastlen = this.lastoffset = undefined;
	this.draw();
    }

    function pattern() {
	var c=document.createElement("canvas");
	var ctx=c.getContext("2d");
	c.width = c.height = 12; /* adjustable */
	ctx.scale(c.width/20,c.height/20);
	function r(x,y,w,h) {
	    ctx.beginPath();
	    ctx.rect(x,y,w,h);
	    ctx.closePath();
	    ctx.fill();
	}
	ctx.fillStyle="#555";
	r(0,0,20,20);
	ctx.fillStyle="#aaa";
	ctx.scale(Math.sqrt(.5),Math.sqrt(.5));
	ctx.rotate(-Math.PI/4);
	r(-100, 0, 200,10);
	r(-100, 20, 200,10);

	return c;
    }

    function draw() {
	var el=this.el;
	var scrolloffset = this.scrolloffset;
	var lastoffset = this.lastoffset;
//	var repstart = this.rstart;
//	var replen = this.rlen;
	var zoom = this.zoom;
	var buf = this.buf;

//	var dpr = 2;

	var c=el.getContext("2d");
	var w=el.width;
	var h=el.height;
	var len=buf.length;
	var yscale=h/2;

	if (len !== this.lastlen)
	    this.widthbox.style.width=Math.floor(this.buf.length*this.zoom)+"px";

	c.save();
	/* px */
	var xstart=scrolloffset;
	var xend=w+scrolloffset;
	
	/* find out how much is already drawn */
	{
	    var lastvalid = (this.lastoffset !== undefined);
	    
	    var laststart, lastend;
	    var overlap = false;
	    
	    if (lastvalid) {
		laststart=this.lastoffset;
		lastend=this.lastoffset+w;
		if (laststart == scrolloffset) {
		    /* we didn't scroll, but previously-invalid data may
		     * now be valid */
		    xstart = this.lastlen * zoom-1;
		    xend = len * zoom+1;
		    console.log("xstart="+xstart+" xend="+xend);
		    c.clearRect(xstart+scrolloffset, 0, xend-xstart, h);
		    //c.beginPath();
		    //c.rect(lastend-scrolloffset,0,xend-lastend,h);
		    //c.closePath();
		    //c.clip();
		} else {
		    overlap = true;

		    if (lastend >= scrolloffset && laststart <= scrolloffset) {
			xstart = lastend;
			var im=c.getImageData(0,0,w,h);
			el.width=w; /* clear */
			c.putImageData(im,laststart-scrolloffset,0);
			c.beginPath();
			c.rect(lastend-scrolloffset,0,xend-lastend,h);
			c.closePath();
			c.clip();
		    } else if (laststart <= scrolloffset+w && lastend >= scrolloffset+w) {
			xend = laststart;
			var im=c.getImageData(0,0,w,h);
			el.width=w; /* clear */
			c.putImageData(im,laststart-scrolloffset,0);
			c.beginPath();
			c.rect(0,0,laststart-xstart,h);
			c.closePath();
			c.clip();
		    } else
			overlap = false;

		if (!overlap)
		    el.width=w; /* clear */
		}
	    }
	}

	//    gebi("d").innerHTML= ("xstart "+xstart+" xend "+xend+" lastoff "+lastoffset+" l+w "+(lastoffset+w));
	this.lastoffset=scrolloffset;
	this.lastlen=len;
	
	var istart=Math.floor(xstart/zoom)-1;
	var iend=Math.ceil(xend/zoom)+1;
	//if (istart<0) istart=0;
	//if (iend>len) iend=len;
	
	c.translate(-scrolloffset,yscale);
	/* loop */
//	c.fillStyle="turquoise";
//	c.fillRect (repstart*zoom, -yscale, replen*zoom, yscale*2);
	
	/* wave */
	function shade(p,q) {
	    //console.log("p="+p+" q="+q);
	    c.save();
	    c.fillStyle=c.createPattern(pattern(),'repeat');//'lightgray';
	    c.fillRect(p*zoom,-yscale,(q-p)*zoom,yscale*2);
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
	    if (iend > len) {
		shade(len, iend);
		iend = len;
	    }

	    /* axis */
	    c.beginPath();
	    c.moveTo(istart*zoom, 0);
	    c.lineTo(iend*zoom, 0);
	    c.stroke();
	    c.strokeStyle='black';//'#'+(Math.random()*0xffffff|0x100000).toString(16);
	    c.beginPath();
	    for (var i=istart; i<iend; i++) {
		var x=i*zoom;
		if (zoom<1) {
		    var min=buf[i], max=buf[i];
		    var j=i+1/zoom;
		    //console.log("i="+i+" j="+j);
		    while (i++<=j) {
			if (min<buf[i]) min=buf[i];
			if (max>buf[i]) max=buf[i];
		    }
		    c.lineTo(x, -min*yscale);
		    c.lineTo(x, -max*yscale);
		} else {
		    c.lineTo(x, -buf[i]*yscale);
		}
	    }
	    c.stroke();
	}
	c.restore();
    }

//    var canvas = document.createElement("canvas");

    var wave={
	el: el,
	buf: null,
	scroller: scroller,
	widthbox: widthbox,
	zoom: 1,
	scrolloffset: 0,
	lastoffset: undefined,
	lastlen: undefined,
	rstart: undefined,
	rlen: undefined,
	zoomby: zoomby,
	scrollto: scrollto,
	draw: draw,
	pattern: pattern(),
	invalidate: invalidate,
    };

    wave.scroller.onscroll=function() {
	wave.scrolloffset = scroller.scrollLeft; wave.draw();
    };
    
    window.addEventListener("resize",function() {wave.invalidate();}, false);

    return wave;
}