# Wave.js

This is a scrolling waveform viewer using canvas.

# Demos

- [simple](simple.html): simplest possible usage
- [demo](demo.html): scroll and zoom around a large waveform
- [draw](draw.html): draw a waveform with the mouse
- [record](record.html): record audio from your microphone and play it back
- [redraw](redraw.html): illustrate redraw behaviour (try scrolling, resizing, etc.)
- [huge](huge.html): stress test

# Synopsis
Create a new Waveform object:

    var wave = new Wave (box[, params]);

  - **box**: containing element. 
  - **params**: Object with properties to be set.  See below.
 
### Properties
-   **buf** (array)
     Array of numbers with sample data.  Range is -1..1 (see **scale**).  Default: null.
-  **zoom** (number)
     Zoom level, in px per sample.  Default: 1.
- **axisStyle** (string)
     Style in which to draw the axis, or falsy for no axis.  Default: "black".
- **waveStyle** (string)
     Style in which to draw the waveform, or "debug" for a random colour every redraw.  Default: "black".
- **undefStyle** (string)
     Style in which to draw undefined regions.  May also be an HTMLImageElement or an HTMLCanvasElement or an HTMLVideoElement, in which case the element will be tiled.  Default: "gray".
- **pointFunc** (string)
     Point-drawing function, or falsy for no points.  Two examples are provided: **Wave.Squares** and **Wave.Lollipops**.  Default: null.
- **bound** (boolean)
     Whether to prohibit zooming out into undefined regions (regions extending beyond the end of the buffer).  Default: true.
- **autofit** (number)
     Automatically fit the entire buffer to the display.  Disables scrolling and zooming.  Default: false.
- **scale** (number)
     The range for sample values is -**scale**..**scale**.  This could be useful if **buf** is a integer typed array, or for vertical zoom.  Example: set **scale** to 128 if **buf** is an Int8Array.  Default: 1.
- **wheelZoom** (number)
     How much scrolling using a scroll wheel will zoom in or out.  The exact behaviour of this is browser- and device-dependent.  Higher values produce more zooming.  Default: 0.05.  If falsy, interception of mousewheel events is disabled.
- **pointThreshold** (number)
     The zoom level, in px per sample, above which individual points will be drawn.  Zero means points will never be drawn.  Infinity means points will always be drawn.  Default: 5.
- **waveThreshold** (number)
     The zoom level, in px per sample, above which the waveform will no longer be drawn.  Zero means the waveform will never be drawn.  Infinity means the waveform will always be drawn.  Default: Infinity.
- **slabThreshold** (number)
     The zoom level in pixels [not necessarily px] per sample at which drawing switches from lines to slabs.  Lower values look better but take more CPU.  Default: 0.1.

### Methods
- **invalidate()**
     Redraw everything.  Automatically called on initialization, and if the display gets resized or zoomed.
- **draw()**
     Draw some new data.  Call this if no samples in **buf** have changed and there's no change in zoom level.  Otherwise call **invalidate()**.
Example: if **buf** has grown (e.g. if it's being filled incrementally).

- **zoomBy(factor[, offset])**
     Zoom by the specified **factor**, in percent.  **factor** greater than 100 zooms in, **factor** less than 100 zooms out.  If **factor** is zero, fit the entire buffer to the display.  Zooming maintains a fixed point at **offset** percent of the distance from the left edge of the display to the right.  **offset** is optional and defaults to 50 (the centre).

    Returns true if we zoomed, false otherwise.

- **scrollto(pos[, overlap, offset])**
    Scroll to position **pos** (in samples), unless it is already visible and further than **overlap** percent from the edge of the
    display.  Example: if **overlap** is 10, scroll if the indicated position is within 10% of the edge (i.e. not within the central
    80% of the display).  **overlap** values greater than 50 scroll unconditionally.

    If scrolling occurs, the new scroll position will be such that **pos** is located **offset** percent of the distance from the left edge of the display to the right (e.g. an **offset** of 50 will place **pos** at the centre of the display).
    **overlap** and **offset** are optional and default to 10 and 50 respectively.

    Returns true if we scrolled, false otherwise.

- **getPos(event)**
    Returns an object containg the position that **event**, a MouseEvent object, corresponds to.  The object contains three properties:  **pos**, the horizontal position in samples; **value*, the vertical position (from -**range** to **range**); and **offset**, a value from 0..100 representing the horizontal position (suitable for passing to, for example, zoomBy).

- **addbar(pos[, col])**
    Add a vertical bar at position **pos** (in samples).  The bar will be drawn in colour **col** if specified, otherwise black.  Returns a **Bar** object.
- **removebar(bar)**
    Removes a vertical bar created with **addbar()**.

### Bar properties
- **pos** (number)
    Position in samples.
- **wave** (object)
    Parent Wave object.

### Bar methods
- **setpos(pos)**
    Sets the bar position, in samples.
- **destroy()**
    Removes this bar, like **removebar()** above.

# License

LGPLv2+.
