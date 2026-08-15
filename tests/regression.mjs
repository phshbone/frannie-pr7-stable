import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root=new URL("../",import.meta.url);
const coreSource=fs.readFileSync(new URL("shared-care-core.js",root),"utf8");
const context={globalThis:{}};vm.createContext(context);vm.runInContext(coreSource,context);
const core=context.globalThis.FrannieCareCore;

const base=core.normalize({
  sitter:{active:false},
  treatments:[{id:"a",type:"Medication",name:"A",active:true},{id:"b",type:"Medication",name:"B",active:true}],
  feedingItems:[{id:"f1",category:"Treat",brand:"One",active:true},{id:"f2",category:"Treat",brand:"Two",active:true}],
  activityLog:[{id:"old",at:"2026-08-12T10:00:00Z",actor:"A",action:"Old"}]
});
const activated=core.normalize({...base,sitter:{active:true,activatedBy:"Mollie",activatedByDeviceId:"device-a",sessionId:"session-a"}});
const merged=core.merge(base,activated,base);
assert.equal(merged.sitter.active,true,"local sitter activation survives a stale remote value");
assert.equal(merged.sitter.activatedByDeviceId,"device-a","device ownership survives normalization and merge");
assert.equal(merged.treatments.filter(x=>x.active).length,2,"multiple current medications coexist");
assert.equal(merged.feedingItems.filter(x=>x.active).length,2,"multiple same-category current foods coexist");

const remote=core.normalize({...base,activityLog:[{id:"new",at:"2026-08-12T11:00:00Z",actor:"B",action:"New"}]});
const audit=core.merge(base,activated,remote).activityLog;
assert.deepEqual(Array.from(audit,x=>x.id),["new","old"],"audit merge is append-only and newest-first");
assert.equal(core.mergeActivityLog([...audit,audit[0]],audit).length,2,"audit IDs remain exactly once");

const shared=fs.readFileSync(new URL("shared-care.js",root),"utf8");
assert.match(shared,/sitterNeedsWrite[\s\S]*saveRemote\(shared,result\.version\|\|0\)/,"unacknowledged sitter intent is pushed before becoming the sync base");
assert.match(shared,/activatedByDeviceId:deviceInfo\?\.id\|\|localDeviceId/,"activation binds ownership to the device");
assert.match(shared,/currentMedication=.*filter\(item=>item\.type==="Medication"&&item\.active===true\)/,"sitter filters every explicit current medication");
assert.match(shared,/currentFood=.*filter\(item=>item\.active===true\)/,"sitter filters every explicit current feeding item");
assert.match(shared,/sitterChecklistChecks=new Set\(\)/,"checklist state is session-only");
assert.doesNotMatch(shared,/searchParams\.set\("(?:connect|invite)",connectionCode\)/,"permanent credentials are never put in invite URLs");
assert.doesNotMatch(shared,/document\.body\.style\.overflow/,"sitter/connection modals do not mutate body overflow");
assert.match(shared,/Manage connection & activity[\s\S]*care-cloud-actions/,"connection controls live inside the collapsible details panel");
assert.match(shared,/closeConnectionSetup\(\);setTimeout\(\(\)=>alert/,"connection errors release the dimming modal before showing an alert");
assert.match(shared,/Create \/ replace recovery link/,"connected devices expose a reusable recovery-link control");
assert.match(shared,/request\("\/v1\/recovery-links"/,"recovery links are created by the authenticated Worker endpoint");
assert.match(shared,/if\(ownerDevice&&thisDeviceIds\.includes\(ownerDevice\)\)return true;[\s\S]*sameActor\(owner,userName\)/,"a paired replacement device with the same family name can end an inherited sitter session");
assert.match(shared,/async function endSitterInstructions\(\)[\s\S]*active:false[\s\S]*sitterActiveIntent=false[\s\S]*await synchronize\(\)/,"ending sitter mode persists the inactive state and synchronizes it");

const html=fs.readFileSync(new URL("index.html",root),"utf8");
const sw=fs.readFileSync(new URL("sw.js",root),"utf8");
const app=fs.readFileSync(new URL("app.js",root),"utf8");
const css=fs.readFileSync(new URL("styles.css",root),"utf8");
assert.match(app,/x\.type==="Medication"\)return x\.active===true\?\["Ongoing"[\s\S]*\["Ended"/,"medication status follows the explicit Current switch");
assert.match(app,/class="entry-actions"/,"treatment edit and remove buttons have a dedicated action row");
assert.match(app,/currentMedications=items\.filter[\s\S]*visible=\[\.\.\.currentMedications,\.\.\.otherTreatments\.slice\(0,1\)\]/,"all current medications remain visible above collapsed treatment history");
for(const asset of ["styles.css?v=36","app.js?v=33","shared-care-core.js?v=17","shared-care.js?v=19"]){
  assert.ok(html.includes(asset),`index references ${asset}`);assert.ok(sw.includes(asset),`service worker caches ${asset}`);
}
assert.match(sw,/frannie-pr7-stable-/,"service worker cache is isolated to the clean repository");
assert.match(sw,/keys\.filter\(k=>k\.startsWith\(CACHE_PREFIX\)&&k!==CACHE_NAME\)/,"cache cleanup cannot delete another app's caches");
assert.match(css,/html\{background:#1b1719\}/,"the iPhone area below the toolbar uses the toolbar color");
assert.match(css,/body\{[\s\S]*?position:fixed;[\s\S]*?inset:0;/,"the PR7 body remains the viewport owner");
assert.match(css,/\.app\{[\s\S]*?position:absolute !important;[\s\S]*?overflow-y:auto;/,"the content scroller is anchored inside the fixed viewport body without an iOS fixed layer");
assert.doesNotMatch(css,/\.app\{[^}]*position:fixed/,"the scrolling content never uses iOS position fixed");
assert.match(css,/\.bottom-nav\{[\s\S]*?position:absolute !important;/,"navigation is anchored to the fixed viewport body");
assert.doesNotMatch(css,/\.bottom-nav\{[^}]*position:fixed/,"navigation never uses iOS position fixed");
assert.doesNotMatch(html,/class="app-shell"/,"the later PR8 structural app-shell rewrite is not present");
assert.match(app,/setTimeout\(dismissSplash,3000\)/,"the original three-second splash is untouched");
assert.match(shared,/confirm\("End the active sitter instructions/,"the PR7 sitter-ending behavior is untouched");

const worker=fs.readFileSync(new URL("worker/src/worker.js",root),"utf8");
assert.doesNotMatch(worker,/LEGACY_FAMILY_TOKEN\s*=\s*["']/,"legacy credential is not embedded");
assert.match(worker,/credential_hash/,"device credentials are stored by hash");
assert.match(worker,/used_at IS NULL AND expires_at > CURRENT_TIMESTAMP/,"invite claim is single-use and expiry checked");
assert.match(worker,/revoked_at/,"revoked credentials are rejected");
assert.match(worker,/frannie_recovery_links/,"recovery links are hashed, server-held, and revocable");
assert.match(worker,/activatedByDeviceId/,"recovery pairing transfers matching active sitter ownership");

const manifest=JSON.parse(fs.readFileSync(new URL("manifest.json",root),"utf8"));
assert.equal(manifest.display,"standalone","official manifest installs as a standalone PWA");
assert.equal(manifest.icons.length,2,"official manifest includes both app icon sizes");
for(const asset of ["assets/frannie-background.webp","assets/frannie-photo.webp","assets/icon-192.png","assets/icon-512.png"]){
  assert.ok(fs.statSync(new URL(asset,root)).size>50000,`${asset} is present and non-empty`);
  assert.ok(sw.includes(`./${asset}`),`service worker caches ${asset}`);
}
const training=fs.readFileSync(new URL("frannies-training-update.js",root),"utf8");
assert.match(training,/Training Video Library/,"official training resource library is restored");
assert.doesNotMatch(training,/document\.body\.style\.overflow/,"training video library preserves iPhone modal compositing repair");
assert.ok(html.includes("frannies-training-update.js?v=2"),"index loads restored training interface v2");
assert.ok(sw.includes("frannies-training-update.js?v=2"),"service worker caches restored training interface v2");

console.log("PASS: 52 Frannie PR7 state, sync, pairing, recovery, sitter handoff/end, audit, isolated cache, absolute content/navigation, complete assets, training UI, and care UI regression assertions");
