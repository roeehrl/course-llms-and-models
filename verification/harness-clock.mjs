// Test-harness clock for the released API process, loaded with `node --import`.
// Core 0.1.34 offers no operator control for "now", and a delayed retention check
// is due only days after the evidence that opened it. The acceptance flow therefore
// advances only this process's wall clock, only for the request that asks for the
// check, and restores it before the answer is submitted. PostgreSQL keeps real
// time; no Core module, file or database row is touched. On SIGUSR2 the offset in
// milliseconds is reread from HARNESS_CLOCK_FILE.
import {readFileSync} from 'node:fs';

const file = process.env.HARNESS_CLOCK_FILE;
if (file) {
  const Real = Date;
  let offset = 0;
  // Same prototype as the real Date, so instanceof and every method keep working.
  function HarnessDate(...args) {
    if (!new.target) return new Real(Real.now() + offset).toString();
    return Reflect.construct(Real, args.length ? args : [Real.now() + offset], new.target);
  }
  HarnessDate.prototype = Real.prototype;
  Object.setPrototypeOf(HarnessDate, Real);
  HarnessDate.now = () => Real.now() + offset;
  globalThis.Date = HarnessDate;
  process.on('SIGUSR2', () => {
    const value = Number(readFileSync(file, 'utf8').trim());
    offset = Number.isSafeInteger(value) && value >= 0 && value <= 400 * 86_400_000 ? value : 0;
  });
}
