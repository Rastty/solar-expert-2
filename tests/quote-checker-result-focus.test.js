const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

const template = readFileSync('template-parts/quote-checker.php', 'utf8');
const script = readFileSync('assets/js/quote-checker.js', 'utf8');
const button = template.match(/<button class="se-btn se-btn-primary" @click="([^"]+)">Prověřit nabídku/);
assert.ok(button, 'Quote Checker needs an explicit submit action');
assert.match(template, /x-show="result"[^>]*x-ref="quoteResult"[^>]*tabindex="-1"[^>]*role="region"[^>]*aria-labelledby="se-quote-result-title"/);
assert.ok(template.includes('id="se-quote-result-title" x-text="result?.status'), 'Result heading must label the focusable region');
assert.match(template, /role="alert"/, 'Input errors must retain their alert');
assert.equal(button[1], 'evaluate(); $nextTick(() => { if(result) $refs.quoteResult.focus({preventScroll:true}); })');

for (const valid of [true, false]) {
  const sandbox = { window: { dataLayer: [] } };
  vm.runInNewContext(script, sandbox, { filename: 'quote-checker.js' });
  const quote = sandbox.window.solarExpertQuoteChecker();
  if (!valid) quote.dailyKwh = 0;
  let focusCalls = 0;
  let pending = [];
  const ctx = {
    evaluate() { quote.evaluate(); },
    get result() { return quote.result; },
    $nextTick(callback) { pending.push(callback); },
    $refs: { quoteResult: { focus(options) {
      assert.equal(options.preventScroll, true);
      focusCalls++;
    } } }
  };
  vm.runInNewContext(button[1], ctx);
  assert.equal(focusCalls, 0, 'Focus must wait until Alpine renders');
  assert.equal(pending.length, 1, 'Exactly one post-render callback');
  pending.shift()();
  assert.equal(focusCalls, valid ? 1 : 0,
    valid ? 'Valid result must be keyboard-accessible' : 'Invalid input must retain error context');
  assert.equal(Boolean(quote.result), valid);
  assert.equal(Boolean(quote.inputError), !valid);
  assert.equal(sandbox.window.dataLayer.filter(x => x.event === 'quote_checker_complete').length,
    valid ? 1 : 0, 'Existing completion analytics must not be inflated');
}
console.log('PASS: Quote Checker result focus, error context, existing analytics');
