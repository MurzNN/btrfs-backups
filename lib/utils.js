/**
 * Converts time points list to time spans.
 *
 * @param {object} timings - backup identifier (source or destination)
 * @returns {object} backup identifier (source or destination)
 */

export const timingsToSpans = function (timings, addTotal = true) {
  let timePrevious
  let timeStart
  let op
  const spans = {}
  for (op in timings) {
    if (timePrevious === undefined) {
      timeStart = timings[op]
    }
    if (timePrevious !== undefined) {
      spans[op] = Math.round(timings[op] - timePrevious) / 1000
    }
    timePrevious = timings[op]
  }
  if (addTotal) {
    spans._total = Math.round(timings[op] - timeStart) / 1000
  }
  return spans
}
