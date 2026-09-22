import { chromium } from 'playwright';
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page = await browser.newPage();
const result = await page.evaluate(async()=>{
 const pc = new RTCPeerConnection({iceTransportPolicy:'relay',iceServers:[{urls:['turn:openrelay.metered.ca:80','turn:openrelay.metered.ca:443?transport=tcp','turns:openrelay.metered.ca:443?transport=tcp'],username:'openrelayproject',credential:'openrelayproject'}]});
 const errors=[]; pc.addEventListener('icecandidateerror',e=>errors.push({code:e.errorCode,url:e.url}));
 pc.createDataChannel('probe'); await pc.setLocalDescription(await pc.createOffer());
 await Promise.race([new Promise(r=>{pc.onicegatheringstatechange=()=>{if(pc.iceGatheringState==='complete')r()}}),new Promise(r=>setTimeout(r,20000))]);
 const result={gathering:pc.iceGatheringState,relay:/ typ relay/.test(pc.localDescription.sdp),errors};pc.close();return result;
});
console.log(JSON.stringify(result));await browser.close();
