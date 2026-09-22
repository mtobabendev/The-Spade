import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'],headless:true});
const signals=[];let next=0;const errors=[];
const context=await browser.newContext({permissions:['camera','microphone']});
await context.addInitScript(()=>{
 navigator.mediaDevices.getUserMedia=async()=>{
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
  const ctx=canvas.getContext('2d');ctx.fillStyle='purple';ctx.fillRect(0,0,320,240);
  const stream=canvas.captureStream(10);
  const audio=new AudioContext(),oscillator=audio.createOscillator(),destination=audio.createMediaStreamDestination();
  oscillator.connect(destination);oscillator.start();
  destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
  return stream;
 };
});
await context.route('**/api/rtc*',async route=>{
 const request=route.request(),url=new URL(request.url());
 if(url.searchParams.get('op')==='config')return route.continue();
 if(request.method()==='POST'){const body=request.postDataJSON();if(body.op==='signal')signals.push({...body,id:++next});return route.fulfill({json:{ok:true}});}
 return route.fulfill({json:{signals:signals.filter(s=>s.room===url.searchParams.get('room')&&s.to===url.searchParams.get('peer')&&s.id>Number(url.searchParams.get('since')))}});
});
try{
 const host=await context.newPage();host.on('pageerror',error=>errors.push(error.message));await host.goto('http://127.0.0.1:8080',{waitUntil:'networkidle'});
 await host.getByRole('button',{name:'I AM THE HOST',exact:true}).click();const code=await host.locator('.booking-summary strong').innerText();await host.getByRole('button',{name:'OPEN HOST ROOM',exact:true}).click();
 for(const name of ['Eogcha','Penny']){
  const guest=await context.newPage();guest.on('pageerror',error=>errors.push(error.message));await guest.goto('http://127.0.0.1:8080',{waitUntil:'networkidle'});await guest.getByRole('button',{name:'I AM JOINING',exact:true}).click();await guest.getByLabel('Your name').fill(name);await guest.getByLabel("HOST'S ROOM CODE").fill(code);await guest.getByRole('button',{name:'JOIN HOST ROOM',exact:true}).click();
  await host.getByRole('button',{name:`ACCEPT ${name.toUpperCase()}`,exact:true}).waitFor();
 }
 assert.equal(signals.filter(s=>s.kind==='offer').length,0,'no offer before admission');
 await host.getByRole('button',{name:'ACCEPT EOGCHA',exact:true}).click();
 await host.getByText('TURN is not configured.',{exact:false}).waitFor();
 assert.equal(await host.getByRole('button',{name:'ACCEPT PENNY',exact:true}).count(),1);
 assert.deepEqual(errors,[]);
 await host.screenshot({path:'../spade-evidence/host-admission.png',fullPage:true});
 console.log(JSON.stringify({admissionButtons:2,unsolicitedOffers:0,missingTurnVisible:true,uncaughtBrowserErrors:errors}));
}catch(error){console.log(JSON.stringify({signals,pages:await Promise.all(context.pages().map(async page=>({url:page.url(),text:(await page.locator(".spade-modal").innerText().catch(()=>"none"))}))),errors}));throw error;}finally{await browser.close();}



