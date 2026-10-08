// caminhos da pipeline — nada de C:/Users/<nome> fixo nos scripts.
// ROOT  = pasta "criativo" (assets, render, feedback, pipeline)
// DADOS = onde ficam os vídeos base (copy_*.mov), moveset\ e o Pack de Memes.
//         padrão: a pasta acima de ROOT. Para mudar: set CRIATIVO_DADOS=D:\outra\pasta
const path=require('path');
const fwd=p=>p.split(path.sep).join('/');
const ROOT=fwd(path.resolve(__dirname,'..'));
const DADOS=fwd(path.resolve(process.env.CRIATIVO_DADOS||path.join(ROOT,'..')));
const ASSETS=ROOT+'/assets';

// catalogo.json guarda caminhos relativos: "pasta" relativa a DADOS, áudios "assets/..." relativos a ROOT
function catalogo(){
 const c=JSON.parse(require('fs').readFileSync(ASSETS+'/memes/catalogo.json','utf8'));
 c.pasta=DADOS+'/'+c.pasta;
 for(const cat of Object.values(c.categorias||{}))if(cat.audios)cat.audios=cat.audios.map(a=>a.startsWith('assets/')?ROOT+'/'+a:a);
 return c;
}
// caminho para filtros do ffmpeg (fontfile='C\:/...')
const ffEsc=p=>p.replace(/:/g,'\\:');

module.exports={ROOT,DADOS,ASSETS,catalogo,ffEsc};
