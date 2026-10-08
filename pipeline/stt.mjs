import {pipeline} from '@huggingface/transformers';
import {execFileSync} from 'child_process';import fs from 'fs';import {createRequire} from 'module';
const ff=createRequire(import.meta.url)('ffmpeg-static');
const [IN,OUT,MODEL='onnx-community/whisper-small']=process.argv.slice(2);
const raw=execFileSync(ff,['-v','error','-i',IN,'-ac','1','-ar','16000','-f','f32le','-'],{maxBuffer:1<<30});
const audio=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
const asr=await pipeline('automatic-speech-recognition',MODEL,{dtype:'fp32'});
const r=await asr(audio,{language:'portuguese',task:'transcribe',return_timestamps:'word',chunk_length_s:30,stride_length_s:5});
fs.writeFileSync(OUT,JSON.stringify(r,null,1));console.log(r.text);
