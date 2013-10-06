function Wave(el,widthbox, scroller) {
    function zoomby(factor) {
	this.zoom *= factor;
	var min = this.scroller.clientWidth/this.buf.length;
	if (this.zoom < min) {
	    factor *= min / this.zoom;
	    this.zoom = min;
	}

	var start = this.scroller.scrollLeft / this.zoom * factor;
	var end = start + this.scroller.clientWidth / this.zoom * factor;
	var mid = (start + end)/2;
	var len = (end - start)/2;

	this.widthbox.style.width=Math.floor(this.buf.length*this.zoom)+"px";

	var s2 = mid - len / factor;

	if (s2 && s2 > 0)
	    s2 *= this.zoom;
	else
	    s2 = 0;

	this.scrolloffset = this.scroller.scrollLeft = s2;

	this.invalidate();
    }

    function invalidate() {
	if (!this.buf) return;
	this.el.width = this.scroller.clientWidth;
	this.lastoffset = undefined;
	this.draw();
    }

    function draw() {
	var el=this.el;
	var scrolloffset = this.scrolloffset;
	var lastoffset = this.lastoffset;
//	var repstart = this.rstart;
//	var replen = this.rlen;
	var zoom = this.zoom;
	var buf = this.buf;

	var c=el.getContext("2d");
	var w=el.width;
	var h=el.height;
	var len=buf.length;
	var yscale=h/2;
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
	    }
	    
	    if (!overlap)
		el.width=w; /* clear */
	}

	//    gebi("d").innerHTML= ("xstart "+xstart+" xend "+xend+" lastoff "+lastoffset+" l+w "+(lastoffset+w));
	this.lastoffset=scrolloffset;

	
	var istart=Math.floor(xstart/zoom)-1;
	var iend=Math.ceil(xend/zoom)+1;
	if (istart<0) istart=0;
	if (iend>len) iend=len;
	
	c.translate(-scrolloffset,yscale);
	/* loop */
//	c.fillStyle="turquoise";
//	c.fillRect (repstart*zoom, -yscale, replen*zoom, yscale*2);
	
	/* axis */
	c.beginPath(); c.moveTo(scrolloffset, 0); c.lineTo(w+scrolloffset, 0); c.stroke();
	
	/* wave */
	c.beginPath();
	for (var i=istart; i<iend; i++) {
	    var x=i*zoom;
	    if (zoom<1) {
		var min=buf[i], max=buf[i];
		j=i+1/zoom;
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
	c.restore();
    }

    var wave={
	el: el,
	buf: null,
	scroller: scroller,
	widthbox: widthbox,
	zoom: 1,
	scrolloffset: 0,
	lastoffset: undefined,
	rstart: undefined,
	rlen: undefined,
	zoomby: zoomby,
	draw: draw,
	invalidate: invalidate,
    };
 
    wave.scroller.onscroll=function() {
	wave.scrolloffset = scroller.scrollLeft; wave.draw();
    };
    
    window.addEventListener("resize",function() {wave.invalidate();}, false);

    return wave;
}