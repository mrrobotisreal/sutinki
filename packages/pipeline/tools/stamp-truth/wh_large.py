# faster-whisper large-v3 (the independent judge) word timestamps, language=uk.
# usage: wh_large.py OUTDIR THREADS pack:track [pack:track ...]   -> OUTDIR/<pack>__<track>.wh.json
import json,sys,os,subprocess,numpy as np
sys.path.insert(0,__file__.rsplit('/',1)[0])
from lib import *
from faster_whisper import WhisperModel
outd,thr,keys=sys.argv[1],int(sys.argv[2]),sys.argv[3:]
os.makedirs(outd,exist_ok=True)
m=WhisperModel(JUDGE,device='cpu',compute_type='int8',cpu_threads=thr)
def load(p):
    raw=subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw,dtype='<f4').copy()
for k in keys:
    pack,tid=k.split(':'); out=f'{outd}/{pack}__{tid}.wh.json'
    if os.path.exists(out): continue
    st,a=find(pack_json(pack),tid)
    segs,_=m.transcribe(load(audio_path(pack,a)),language=LANG,word_timestamps=True,condition_on_previous_text=False,beam_size=5)
    ws=[[x.word,round(x.start,3),round(x.end,3),round(x.probability,3)] for s in segs for x in s.words]
    json.dump(ws,open(out+'.tmp','w'),ensure_ascii=False); os.rename(out+'.tmp',out); print(k,len(ws),flush=True)
