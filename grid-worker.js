/* Grid searches run outside the UI thread so feedback/cancellation stays usable. */
importScripts('./grid-reader.js?v=13');
self.onmessage = event => {
  try {
    self.postMessage({ grid: ShiftGrid.locateGrid(event.data.image, event.data.pick) });
  } catch (error) {
    self.postMessage({ error: error && error.message || String(error) });
  }
};
