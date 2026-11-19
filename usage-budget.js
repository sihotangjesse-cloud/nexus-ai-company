export function createCallBudget({ perMinute = 12, perDay = 120, clock = Date.now } = {}) {
  for (const [name, value] of [['perMinute', perMinute], ['perDay', perDay]]) {
    if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
  }

  let minuteBucket = Math.floor(clock() / 60000);
  let dailyBucket = new Date(clock()).toISOString().slice(0, 10);
  let callsThisMinute = 0;
  let callsToday = 0;

  return function consumeCall() {
    const now = clock();
    const minute = Math.floor(now / 60000);
    const day = new Date(now).toISOString().slice(0, 10);
    if (minute !== minuteBucket) { minuteBucket = minute; callsThisMinute = 0; }
    if (day !== dailyBucket) { dailyBucket = day; callsToday = 0; }
    if (callsThisMinute >= perMinute) {
      const error = new Error('Batas pemanggilan AI per menit untuk server ini telah tercapai. Coba lagi nanti.');
      error.status = 429;
      error.publicMessage = error.message;
      throw error;
    }
    if (callsToday >= perDay) {
      const error = new Error('Batas pemanggilan AI harian untuk server ini telah tercapai. Coba lagi besok.');
      error.status = 429;
      error.publicMessage = error.message;
      throw error;
    }
    callsThisMinute += 1;
    callsToday += 1;
    return { callsThisMinute, callsToday };
  };
}
