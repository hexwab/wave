var buf = new Float32Array(200000);

for (var i=0; i<buf.length; i++) {
    buf[i] = Math.sin(i / 100000) * Math.sin(i * Math.sin(i / 10000) / 50);
}

function gebi(id) {
    return document.getElementById(id);
}

var wave = new Wave(gebi("wave"), {
    buf: buf,
    waveStyle: 'darkgreen',
    pointFunc: Wave.Squares
});
wave.bound = true;
wave.zoomby(0.01); /* zoom out */


gebi("zin").onclick = function() { wave.zoomby(200); };
gebi("zout").onclick = function() { wave.zoomby(50); };
gebi("i").onclick = function() { wave.invalidate(); };

gebi("wave").addEventListener('click',
			      function (e) {
				  wave.addbar(wave.getPos(e).pos);
			      },
			      false);
