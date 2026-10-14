// A scripted stand-in for the model behind the released supervisor, reached only
// through the API process's own HTTPS proxy settings. Core 0.1.34 loads only the
// Google provider, at a fixed origin, and records supervisor tool calls only while
// that provider is answering; it offers no synthetic provider or staff route for
// remedial insertion. The harness therefore answers the process's requests for that
// origin itself: a private per-run CA trusted only by the child process, a CONNECT
// proxy that admits generativelanguage.googleapis.com:443 and nothing else, and no
// upstream connection at all. No real provider, credential or network egress.
import http from 'node:http';
import tls from 'node:tls';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const exec=promisify(execFile),HOST='generativelanguage.googleapis.com';
async function certificates(directory){
  const file=name=>path.join(directory,name);
  await writeFile(file('leaf.cnf'),`subjectAltName=DNS:${HOST}\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n`,{mode:0o600});
  await exec('openssl',['req','-x509','-sha256','-newkey','rsa:2048','-nodes','-keyout',file('ca.key'),'-out',file('ca.pem'),'-days','1','-subj','/CN=private course acceptance CA','-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign']);
  await exec('openssl',['req','-newkey','rsa:2048','-nodes','-keyout',file('leaf.key'),'-out',file('leaf.csr'),'-subj',`/CN=${HOST}`]);
  await exec('openssl',['x509','-req','-sha256','-in',file('leaf.csr'),'-CA',file('ca.pem'),'-CAkey',file('ca.key'),'-CAcreateserial','-CAserial',file('ca.srl'),'-out',file('leaf.pem'),'-days','1','-extfile',file('leaf.cnf')]);
  return {ca:file('ca.pem'),key:await readFile(file('leaf.key')),cert:await readFile(file('leaf.pem'))};
}
/** decide(prompt) receives the parsed supervisor prompt (context + toolResults) and
 * returns one structured decision; every exchange is recorded for the report. */
export async function startSyntheticModel(directory,decide){
  const {ca,key,cert}=await certificates(directory),calls=[],refused=[];
  const model=http.createServer((request,response)=>{
    let body='';request.setEncoding('utf8');request.on('data',chunk=>{body+=chunk;});
    request.on('end',()=>{
      try{
        const sent=JSON.parse(body),text=sent.contents.flatMap(c=>c.parts.map(p=>p.text)).find(t=>t.includes('"toolResults"'));
        const prompt=JSON.parse(text),decision=decide(prompt);
        calls.push({path:request.url,keyed:Boolean(request.headers['x-goog-api-key']),toolResults:prompt.toolResults.map(r=>r.tool),decision});
        response.writeHead(200,{'content-type':'application/json'});
        response.end(JSON.stringify({candidates:[{finishReason:'STOP',index:0,content:{role:'model',parts:[{text:JSON.stringify(decision)}]}}],usageMetadata:{promptTokenCount:Math.ceil(text.length/4),candidatesTokenCount:40,totalTokenCount:Math.ceil(text.length/4)+40}}));
      }catch(error){calls.push({path:request.url,error:String(error?.message??error)});response.writeHead(500,{'content-type':'application/json'});response.end('{}');}
    });
  });
  const context=tls.createSecureContext({key,cert});
  const proxy=http.createServer((_request,response)=>{response.writeHead(403);response.end();});
  proxy.on('connect',(request,socket)=>{
    if(request.url!==`${HOST}:443`){refused.push(request.url);socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}
    socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    model.emit('connection',new tls.TLSSocket(socket,{isServer:true,secureContext:context}));
  });
  await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
  return {ca,proxyUrl:`http://127.0.0.1:${proxy.address().port}`,calls,refused,close:()=>new Promise(resolve=>{proxy.closeAllConnections?.();proxy.close(()=>resolve());})};
}
