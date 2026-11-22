'use strict';
/* Alpine auto-runs data.init() for each x-data instance. A second x-init="init()"
 * on the SAME root creates two identical catalog REST calls. There must be
 * exactly one automatic initialization with no change to app calculations.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
for(const [file,factory] of [
  ['template-parts/solar-builder.php','solarExpertBuilder()'],
  ['template-parts/battery-selector.php','solarExpertBatterySelector()'],
  ['template-parts/mppt-selector.php','solarExpertMpptSelector()'],
  ['template-parts/inverter-selector.php','solarExpertInverterSelector()']
]){
 const s=fs.readFileSync(path.join(root,file),'utf8');
 assert(s.includes('x-data="'+factory+'"'),factory+': native Alpine init must be reachable');
 assert(!s.includes('x-init="init()"'),factory+': explicit double init forbidden');
}
const scripts=fs.readFileSync(path.join(root,'assets/js/builder.js'),'utf8')+'\n'+
  fs.readFileSync(path.join(root,'assets/js/selectors.js'),'utf8');
assert(scripts.match(/async init\(\)/g)?.length>=4,
  'Expected Builder+3 selectors native init() methods; removal must not disable auto boot');
console.log('PASS: four native Alpine init() components, no redundant x-init calls');
