const DATA = window.KODA_DATA;
const KEY = 'kodaforge-crm-v1';
// rodando como extensão do Chrome (aba do CRM ou painel lateral ao lado do WhatsApp Web)
const EXT = location.protocol==='chrome-extension:' && typeof chrome!=='undefined' && !!chrome.tabs;
const PANEL = EXT && !!window.KODA_PANEL;

/* ---------- etapas do funil ---------- */
const STAGES = [
  {k:'a_contatar', l:'A contatar'},
  {k:'enviada',    l:'1ª mensagem enviada'},
  {k:'fu1',        l:'Follow-up 1 enviado'},
  {k:'fu2',        l:'Follow-up 2 enviado'},
  {k:'ultima',     l:'Última mensagem enviada'},
  {k:'sem_retorno',l:'Sem retorno'},
  {k:'respondeu',  l:'Respondeu'},
  {k:'negociando', l:'Proposta / reunião'},
  {k:'fechado',    l:'Fechado'},
  {k:'perdido',    l:'Sem interesse'},
];
const SL = Object.fromEntries(STAGES.map(s=>[s.k,s.l]));
// categorias de modelos (cada uma é a etapa em que o lead fica depois do envio)
const CATS = [
  {k:'enviada',    l:'1ª mensagem',        e:'🟦', days:2},
  {k:'fu1',        l:'Follow-up 1',        e:'🟨', days:4},
  {k:'fu2',        l:'Follow-up 2',        e:'🟧', days:7},
  {k:'ultima',     l:'Última mensagem',    e:'🟥', days:7},
  {k:'respondeu',  l:'Respondeu',          e:'🟢', days:2},
  {k:'negociando', l:'Proposta / reunião', e:'🟣', days:3},
];
const CL = Object.fromEntries(CATS.map(c=>[c.k,c]));
// qual categoria de modelo mostrar primeiro, conforme a etapa atual do lead
const NEXT_CAT = {a_contatar:'enviada', enviada:'fu1', fu1:'fu2', fu2:'ultima', ultima:'ultima', sem_retorno:'enviada',
                  respondeu:'respondeu', negociando:'negociando', fechado:'negociando', perdido:'enviada'};
const SEQ = ['a_contatar','enviada','fu1','fu2','ultima'];

/* ---------- variáveis ---------- */
const VARS = [
  {k:'empresa',          d:'Nome da empresa (da planilha)'},
  {k:'contato',          d:'Nome da pessoa', lead:true, inline:true},
  {k:'cidade',           d:'Cidade (padrão nos Ajustes)', lead:true, inline:true},
  {k:'segmento',         d:'Segmento (padrão: categoria do Google)', lead:true, inline:true},
  {k:'site',             d:'Endereço do site atual', lead:true},
  {k:'nome_vendedor',    d:'Seu nome (Ajustes)'},
  {k:'valor_site',       d:'Valor do site (padrão nos Ajustes)', lead:true},
  {k:'valor_manutencao', d:'Valor da manutenção (padrão nos Ajustes)', lead:true},
  {k:'prazo',            d:'Prazo de entrega (padrão nos Ajustes)', lead:true},
  {k:'data',             d:'Data da reunião', lead:true, type:'date'},
  {k:'horario',          d:'Horário da reunião', lead:true, type:'time'},
  {k:'data_horario_1',   d:'1ª opção de horário (ex.: amanhã às 10h)', lead:true},
  {k:'data_horario_2',   d:'2ª opção de horário', lead:true},
  {k:'mensagem_personalizada', d:'1ª mensagem personalizada da planilha (nota, avaliações, nicho)'},
];
const VK = Object.fromEntries(VARS.map(v=>[v.k,v]));
const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/* ---------- modelos padrão ---------- */
const DEFAULT_TEMPLATES = [
  ['m1_padrao','enviada','Abordagem padrão',`Olá, bom dia! Tudo bem?
Meu nome é {{nome_vendedor}}, sou da Kodaforge, uma agência especializada em criação e reestruturação de sites.
Estive conhecendo a {{empresa}} e percebi que vocês trabalham com {{segmento}} em {{cidade}}.
Entrei em contato porque acredito que podemos ajudar a empresa a ter uma presença digital mais profissional e que realmente passe confiança para quem encontra vocês pela internet.
Vocês já possuem alguém responsável pelo site e presença digital da empresa?`],
  ['m1_site','enviada','Empresa com site',`Olá, tudo bem? Sou {{nome_vendedor}}, da Kodaforge.
Estive conhecendo a {{empresa}} e encontrei o site de vocês: {{site}}.
Nós trabalhamos justamente com reestruturação e modernização de sites, deixando eles mais rápidos, profissionais e adaptados para celular.
Dei uma olhada no site de vocês e identifiquei alguns pontos que poderiam ser melhorados.
Posso te mostrar algumas dessas melhorias sem compromisso?`],
  ['m1_semsite','enviada','Empresa sem site',`Olá, tudo bem?
Sou {{nome_vendedor}}, da Kodaforge. Nós trabalhamos com criação de sites profissionais para empresas.
Conheci a {{empresa}} e percebi que vocês ainda não possuem um site próprio.
Hoje, quando alguém procura uma empresa como a de vocês no Google, ter um site profissional pode ajudar bastante a apresentar os serviços, gerar confiança e facilitar o contato.
Gostaria de te apresentar uma ideia que pensamos para a {{empresa}}. Posso te explicar?`],
  ['m1_personalizada','enviada','Abordagem personalizada (planilha)',`{{mensagem_personalizada}}`],

  ['fu1_curto','fu1','Follow-up curto',`Oi! Tudo certo?
Só passando para saber se conseguiu ver minha mensagem sobre o projeto da {{empresa}}.
Se quiser, posso te apresentar a ideia e os valores sem compromisso. 🙂`],
  ['fu1_prof','fu1','Follow-up profissional',`Olá! Tudo bem?
Passando novamente porque entrei em contato alguns dias atrás sobre a possibilidade de desenvolvermos ou reestruturarmos o site da {{empresa}}.
Sei que a rotina é corrida, então queria apenas saber se você conseguiu ver minha mensagem anterior.
Caso tenha interesse, posso te mostrar rapidamente como poderíamos trabalhar a presença digital da {{empresa}}.`],
  ['fu1_retomar','fu1','Retomar conversa',`Oi, {{contato}}! Tudo bem?
Retomando nossa conversa sobre o site da {{empresa}}.
Se agora não for um bom momento, sem problema. Me diz só se faz sentido eu te mandar uma ideia de como ficaria, que eu preparo sem compromisso.`],

  ['fu2_servico','fu2','Apresentar serviço',`Olá! Tudo bem?
Estou fazendo um último acompanhamento sobre o contato que fiz com a {{empresa}}.
A ideia da Kodaforge é desenvolver uma solução personalizada para cada empresa, e não simplesmente entregar um modelo pronto.
Podemos trabalhar desde a criação completa de um site até a modernização de um site que vocês já possuem.
Se fizer sentido para vocês, posso te enviar como funciona, o que está incluso e os valores.
Posso te enviar?`],
  ['fu2_valores','fu2','Oferecer valores',`Oi, {{contato}}! Tudo bem?
Pra facilitar, já te adianto: um site profissional para a {{empresa}} fica a partir de {{valor_site}}, com entrega em {{prazo}}.
Inclui design personalizado, versão para celular, botão de WhatsApp e publicação.
Quer que eu te mostre um exemplo de como ficaria?`],
  ['fu2_ultima','fu2','Última tentativa comercial',`Oi, {{contato}}! Tudo certo?
Sei que a rotina é corrida, então vou ser direto: consigo preparar um rascunho da página inicial da {{empresa}}, sem custo, para você ver como ficaria antes de decidir qualquer coisa.
Se gostar, a gente conversa. Se não, sem problema nenhum.
Posso preparar?`],

  ['ult_encerrar','ultima','Encerrar contato',`Olá, {{contato}}! Tudo bem?
Vou deixar nosso contato em pausa por enquanto para não ficar insistindo por aqui.
Caso em algum momento a {{empresa}} queira criar um novo site, modernizar o atual ou melhorar sua presença digital, pode contar com a Kodaforge.
Vou deixar nosso contato salvo por aqui.
Sucesso para vocês! 👊`],
  ['ult_porta','ultima','Porta aberta',`Oi, {{contato}}!
Como não consegui falar com você, vou encerrar o acompanhamento por enquanto.
Mas caso surja interesse futuramente em melhorar o site ou a presença digital da {{empresa}}, é só me chamar por aqui.
Ficamos à disposição! 🚀`],
  ['ult_futuro','ultima','Contato futuro',`Oi, {{contato}}! Tudo bem?
Imagino que agora não seja o melhor momento para pensar no site da {{empresa}}, e tudo bem.
Vou guardar seu contato e, se puder, volto a falar com você daqui a alguns meses.
Se precisar de algo antes disso, é só me chamar por aqui. Sucesso! 🙌`],

  ['r_interesse','respondeu','Demonstrou interesse',`Perfeito, {{contato}}!
Para entender melhor o que a {{empresa}} precisa, posso te fazer algumas perguntas rápidas sobre o projeto.
A partir disso conseguimos montar algo realmente personalizado para vocês.`],
  ['r_como','respondeu','Como funciona?',`Funciona de forma bem simples.
Primeiro entendemos o que a {{empresa}} precisa e qual objetivo vocês querem alcançar com o site.
Depois definimos a estrutura, identidade visual e funcionalidades necessárias.
A Kodaforge desenvolve o projeto e, durante o processo, vamos alinhando os detalhes com vocês.
No final, entregamos o site pronto e adaptado para computador, celular e tablet.
Se quiser, também podemos cuidar da manutenção e atualizações depois da entrega.`],
  ['r_preco','respondeu','Quanto custa?',`Claro!
Na Kodaforge trabalhamos com projetos personalizados, então o valor depende principalmente da estrutura e das funcionalidades que a {{empresa}} precisa.
Para um projeto dentro do escopo que conversamos, o investimento fica em torno de {{valor_site}}. O prazo de entrega é de {{prazo}}.
O projeto inclui:
• Desenvolvimento do site
• Design personalizado
• Versão para celular e computador
• Estrutura otimizada
• Formulários de contato
• Integração com WhatsApp
• Publicação do site
Depois da entrega, também temos a opção de manutenção por {{valor_manutencao}}/mês, caso vocês queiram deixar essa parte conosco.
Se quiser, posso explicar exatamente o que está incluso no projeto.`],
  ['r_duvida','respondeu','Ficou alguma dúvida?',`Oi, {{contato}}! Tudo certo?
Queria saber se ficou alguma dúvida em relação à proposta e aos valores que te passei.
Se tiver qualquer ponto que queira entender melhor, posso te explicar por aqui e também podemos ajustar o projeto de acordo com o que a {{empresa}} realmente precisa.`],
  ['r_duvida2','respondeu','Ficou alguma dúvida? (mais comercial)',`{{contato}}, conseguiu analisar os valores que te passei?
Se tiver alguma dúvida sobre o investimento, o que está incluso ou sobre como funciona o desenvolvimento, pode me perguntar tranquilamente.
A ideia é encontrarmos uma solução que faça sentido para a {{empresa}}, tanto em relação ao projeto quanto ao investimento.`],
  ['r_conhecer','respondeu','Quero conhecer o projeto',`Que bom, {{contato}}!
Você pode ver alguns sites que fizemos para negócios parecidos com a {{empresa}} em kodaforge.com.br.
Depois, se quiser, preparo uma ideia de como ficaria o site de vocês, sem compromisso.
O que você mais quer que o cliente faça no site: chamar no WhatsApp, agendar um horário ou ver os serviços?`],
  ['r_pensar','respondeu','Vou pensar',`Claro, {{contato}}, fica à vontade!
Pra te ajudar a decidir, posso montar um rascunho da página inicial da {{empresa}}, sem custo.
Se gostar, a gente conversa. Se não, sem problema nenhum. Pode ser?`],
  ['r_caro','respondeu','Está caro',`Entendo, {{contato}}. Investimento é sempre uma decisão importante.
O que posso fazer é ajustar o projeto ao que a {{empresa}} mais precisa agora, começando por uma versão mais enxuta e evoluindo depois.
Se fizer sentido, também podemos conversar sobre a forma de pagamento.
Quer que eu te mande uma opção mais simples?`],
  ['r_tenho_site','respondeu','Já tenho site',`Que ótimo, {{contato}}!
Se quiser, posso dar uma olhada no site da {{empresa}} e te mandar, sem compromisso, alguns pontos que poderiam trazer mais contatos: velocidade, versão para celular, aparecer no Google e botão de WhatsApp.
Me passa o endereço do site?`],

  ['p_agendar','negociando','Agendar reunião',`Perfeito, {{contato}}!
Acho que vale a pena conversarmos alguns minutos para entender melhor o que a {{empresa}} precisa e te mostrar algumas possibilidades para o projeto.
Podemos marcar uma conversa rápida?
Tenho disponibilidade {{data_horario_1}} ou {{data_horario_2}}.`],
  ['p_confirmar','negociando','Confirmar reunião',`Combinado, {{contato}}!
Nossa conversa ficou marcada para {{data}} às {{horario}}.
Vamos conversar sobre as necessidades da {{empresa}}, apresentar a proposta da Kodaforge e tirar qualquer dúvida sobre o projeto.
Até lá! 🚀`],
  ['p_proposta','negociando','Enviar proposta',`Olá, {{contato}}! Tudo bem?
Conforme combinamos, segue a proposta para o site da {{empresa}}.
• Investimento: {{valor_site}}
• Manutenção mensal (opcional): {{valor_manutencao}}/mês
• Prazo de entrega: {{prazo}}
Qualquer dúvida ou ajuste, é só me chamar por aqui.`],
  ['p_pos','negociando','Pós-reunião',`Olá, {{contato}}! Tudo bem?
Gostaria de agradecer pelo seu tempo hoje.
Conforme conversamos, preparei a proposta para a {{empresa}} considerando os pontos que levantamos durante nossa conversa.
Estou te encaminhando os detalhes para você analisar com calma.
Qualquer dúvida ou ajuste que quiser fazer, pode me chamar por aqui.`],
  ['p_followup','negociando','Follow-up da proposta',`Oi, {{contato}}! Tudo certo?
Conseguiu dar uma olhada na proposta para a {{empresa}}?
Se quiser ajustar algum ponto, a gente adapta. E se estiver tudo certo, já consigo reservar a agenda para começar o projeto.`],
  ['p_fechamento','negociando','Fechamento',`Perfeito, {{contato}}! Fico muito feliz em trabalhar com a {{empresa}}. 🚀
Para começar, vou precisar de:
• Logo da empresa (se tiver)
• Algumas fotos dos serviços ou do espaço
• Os principais serviços e diferenciais
O prazo de entrega é de {{prazo}}, contando a partir do recebimento dos materiais.
Assim que eu receber, já começamos!`],
].map(([id,etapa,nome,conteudo])=>({id,etapa,nome,conteudo}));

/* ---------- estado ---------- */
let st = load();
function load(){
  let s=null;
  try{ s=JSON.parse(localStorage.getItem(KEY)); }catch(e){}
  s = s || {};
  s.leads = s.leads || {};
  s.templates = Array.isArray(s.templates) ? s.templates : DEFAULT_TEMPLATES.map(t=>({...t}));
  delete s.tpl; // formato antigo
  s.fin = Object.assign({vendas:[], mensais:[], despesas:[]}, s.fin||{});
  s.cfg = Object.assign({modo:'web', meta:25, avancar:true, nome_vendedor:'Guilherme', cidade:'Guarapuava', valor_site:'', valor_manutencao:'', prazo:''}, s.cfg||{});
  return s;
}
let saveWarned=false;
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(e){ if(!saveWarned){ saveWarned=true; alert('Não consegui salvar no navegador. Faça um backup em "Ajustes".'); } } }
function L(id){ const s = st.leads[id] || (st.leads[id] = {status:'a_contatar', hist:[]}); s.hist ||= []; s.v ||= {}; return s; }
const leads = DATA.leads.map(b => ({...b, get s(){ return L(b.id); }}));
const byId = Object.fromEntries(leads.map(l=>[l.id,l]));
const tplById = id => st.templates.find(t=>t.id===id);
const tplsOf = cat => st.templates.filter(t=>t.etapa===cat);

/* ---------- utils ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ymd(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
const today = () => ymd(new Date());
function addDays(n){ const d=new Date(); d.setDate(d.getDate()+n); return ymd(d); }
function br(ds){ if(!ds) return ''; const [y,m,d]=ds.slice(0,10).split('-'); return d+'/'+m+(y!==String(new Date().getFullYear())?'/'+y:''); }
function nowStr(){ const d=new Date(); return ymd(d)+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
function phone(l){ let d=(l.tel||'').replace(/\D/g,''); if(!d) return ''; if(!d.startsWith('55')) d='55'+d; return d; }
const presKey = l => (l.pres||'')[0];
function presShort(l){ const p=l.pres||''; if(p[0]==='A') return 'Sem site'; if(p[0]==='C') return 'Site improvisado'; const m=p.match(/\((.*)\)/); return m?m[1]:'Só rede social'; }
function isDue(l){ const p=l.s.prox; return p && p<=today() && !['fechado','perdido','sem_retorno'].includes(l.s.status); }
function sentToday(){ const t=today(); let n=0; for(const id in st.leads) for(const h of st.leads[id].hist||[]) if(h.tipo==='envio' && h.t.startsWith(t)) n++; return n; }
const uid = () => 't'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ---------- motor de variáveis ---------- */
function fmtData(s){
  if(!s) return '';
  const [y,m,d]=s.split('-').map(Number); const dt=new Date(y,m-1,d);
  return dt.toLocaleDateString('pt-BR',{weekday:'long'})+', '+String(d).padStart(2,'0')+'/'+String(m).padStart(2,'0');
}
function varValues(l){
  const v = l ? l.s.v : {}, c = st.cfg;
  return {
    empresa: l?.emp || '',
    contato: (l?.s.contato||'').trim(),
    cidade: v.cidade || c.cidade,
    segmento: v.segmento || (l?.cat||'').toLowerCase(),
    site: v.site || '',
    nome_vendedor: c.nome_vendedor,
    valor_site: v.valor_site || c.valor_site,
    valor_manutencao: v.valor_manutencao || c.valor_manutencao,
    prazo: v.prazo || c.prazo,
    data: fmtData(v.data),
    horario: v.horario || '',
    data_horario_1: v.data_horario_1 || '',
    data_horario_2: v.data_horario_2 || '',
    mensagem_personalizada: l?.msg || '',
  };
}
const usedVars = txt => [...new Set([...String(txt).matchAll(VAR_RE)].map(m=>m[1]))];
/* Substitui as variáveis. Se uma variável estiver vazia:
   - contato/cidade/segmento: some só o trecho ("Olá, {{contato}}!" -> "Olá!", "em {{cidade}}" -> "")
   - demais: some a frase inteira; se a linha ficar vazia, some a linha. */
function renderTpl(content, vals){
  const empty = k => !String(vals[k] ?? '').trim();
  const out = [];
  for(let line of String(content).replace(/\r/g,'').split('\n')){
    if(!line.includes('{{')){ out.push(line); continue; }
    const startsVar = /^\s*\{\{/.test(line);
    for(const v of VARS.filter(v=>v.inline && empty(v.k))){
      const t = `\\{\\{\\s*${v.k}\\s*\\}\\}`;
      line = line.replace(new RegExp(`,\\s*${t}(?=\\s*[!?.,;:]|\\s*$)`,'g'),'')
                 .replace(new RegExp(`^(\\s*)${t}\\s*,\\s*`),'$1')
                 .replace(new RegExp(`\\s+(?:em|de|da|do|na|no|para|pra|com)\\s+${t}`,'gi'),'')
                 .replace(new RegExp(t,'g'),'');
    }
    const kept = line.split(/(?<=[.!?…])\s+/).filter(p => !usedVars(p).some(empty));
    if(!kept.length || !kept.join('').trim()) continue;
    line = kept.join(' ').replace(VAR_RE,(_,k)=>vals[k]).replace(/[ \t]+([!?.,;])/g,'$1').replace(/ {2,}/g,' ');
    if(startsVar) line = line.replace(/^(\s*)(\p{Ll})/u,(m,a,b)=>a+b.toUpperCase());
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
const fillFor = (t,l) => renderTpl(t.conteudo, varValues(l));

/* ---------- toast ---------- */
let toastFn=null, toastT=null;
function toast(msg, label, fn){
  $('#toastMsg').textContent=msg; toastFn=fn||null;
  $('#toastAct').textContent=label||''; $('#toastAct').classList.toggle('hidden',!fn);
  $('#toast').classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>$('#toast').classList.remove('on'), fn?8000:3500);
}
$('#toastAct').onclick=()=>{ const f=toastFn; toastFn=null; $('#toast').classList.remove('on'); if(f) f(); };

/* ---------- regras automáticas ---------- */
function housekeeping(){
  let changed=false;
  for(const l of leads){
    if(l.s.status==='ultima' && l.s.prox && l.s.prox<=today()){
      l.s.status='sem_retorno'; l.s.prox=null; log(l,'Etapa: Última mensagem enviada → Sem retorno (automático)'); changed=true;
    }
  }
  if(changed) save();
}
function statusAfterSend(cur, cat){
  if(cur==='fechado') return cur;
  if(SEQ.includes(cat)){
    if(cur==='a_contatar' || cur==='sem_retorno') return cat;
    if(SEQ.includes(cur) && SEQ.indexOf(cat) > SEQ.indexOf(cur)) return cat;
    return cur;
  }
  if(cat==='respondeu') return ['respondeu','negociando'].includes(cur) ? cur : 'respondeu';
  if(cat==='negociando') return 'negociando';
  return cur;
}

/* ---------- stats ---------- */
function renderStats(){
  const c = k => leads.filter(l=>l.s.status===k).length;
  const contatados = leads.filter(l=>l.s.status!=='a_contatar').length;
  const resp = c('respondeu')+c('negociando')+c('fechado');
  const due = leads.filter(isDue).length;
  const items = [
    ['Leads', leads.length], ['A contatar', c('a_contatar')], ['Contatados', contatados],
    ['Responderam', resp + (contatados?` <small style="font-size:12px;color:var(--muted)">${Math.round(resp/contatados*100)}%</small>`:'')],
    ['Proposta / reunião', c('negociando')], ['Fechados', c('fechado')], ['Enviadas hoje', sentToday()+' / '+st.cfg.meta],
  ];
  $('#stats').innerHTML = items.map(([a,b])=>`<div class="stat"><b>${b}</b><span>${a}</span></div>`).join('');
  $('#dueN').textContent=due; $('#dueN').classList.toggle('hidden',!due);
}

/* ---------- lista ---------- */
let sortK='pts', sortDir=-1, current=null, visible=[];
$('#fStatus').innerHTML += STAGES.map(s=>`<option value="${s.k}">${s.l}</option>`).join('');
$('#fNicho').innerHTML += [...new Set(leads.map(l=>l.nicho))].sort().map(n=>`<option>${esc(n)}</option>`).join('');
['q','fStatus','fPrio','fNicho','fPres','fCanal','fDue'].forEach(id=>$('#'+id).addEventListener('input',renderList));
document.querySelectorAll('th[data-s]').forEach(th=>th.onclick=()=>{ const k=th.dataset.s; sortDir = sortK===k ? -sortDir : (k==='emp'||k==='bairro'?1:-1); sortK=k; renderList(); });
const norm = s => (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function filtered(){
  const qn=norm($('#q').value.trim()), fs=$('#fStatus').value, fp=$('#fPrio').value, fn=$('#fNicho').value, fr=$('#fPres').value, fc=$('#fCanal').value, fd=$('#fDue').checked;
  const r = leads.filter(l =>
    (!qn || norm([l.emp,l.cat,l.bairro,l.tel,l.nicho,l.s.contato].join(' ')).includes(qn)) &&
    (!fs || l.s.status===fs) && (!fp || l.prio===fp) && (!fn || l.nicho===fn) && (!fr || presKey(l)===fr) &&
    (!fc || (l.canal||'').startsWith(fc)) && (!fd || isDue(l)));
  const val = l => sortK==='status' ? STAGES.findIndex(s=>s.k===l.s.status) : sortK==='prox' ? (l.s.prox||'9999') : sortK==='pts' ? l.pts*100000+(l.aval||0) : l[sortK];
  return r.sort((a,b)=>{ const x=val(a), y=val(b); return (x>y?1:x<y?-1:0)*sortDir; });
}
function renderList(){
  visible = filtered();
  $('#count').textContent = visible.length+' de '+leads.length;
  $('#rows').innerHTML = visible.map(l=>`<tr data-id="${l.id}" class="${current===l.id?'sel':''}">
    <td><span class="pill p-${esc(l.prio)}">${esc(l.prio)}</span></td>
    <td class="emp">${esc(l.emp)}<small>${esc(l.cat)}${l.s.contato?' · '+esc(l.s.contato):''}</small></td>
    <td>${esc(l.bairro||'')}</td>
    <td>${esc(presKey(l))} · ${esc(presShort(l))}</td>
    <td class="num">${l.nota?String(l.nota).replace('.',','):'–'} <small style="color:var(--muted)">(${l.aval??0})</small></td>
    <td>${l.canal==='WhatsApp'?'WhatsApp':l.canal?.startsWith('Ligar')?'Fixo':'—'}</td>
    <td><span class="pill s-${l.s.status}">${SL[l.s.status]}</span></td>
    <td class="${isDue(l)?'due':''}">${br(l.s.prox)}</td></tr>`).join('') || `<tr><td colspan="8" class="empty">Nenhum lead com esses filtros.</td></tr>`;
}
$('#rows').onclick = e => { const tr=e.target.closest('tr[data-id]'); if(tr) openLead(+tr.dataset.id); };

/* ---------- gaveta do lead ---------- */
let selCat=null, selTpl=null;
function defaultTpl(l, cat){
  const list = tplsOf(cat); if(!list.length) return null;
  // depois de "Posso te enviar?" no follow-up 2, quem responde geralmente quer os valores
  if(cat==='respondeu'){
    const last=[...l.s.hist].reverse().find(h=>h.tipo==='envio');
    if(last && CL[last.cat] && last.cat==='fu2' && tplById('r_preco')) return 'r_preco';
  }
  return list[0].id;
}
function openLead(id, keep){
  const changedLead = current!==id;
  current=id; const l=byId[id];
  if(!keep || changedLead){ selCat = NEXT_CAT[l.s.status]; selTpl = defaultTpl(l, selCat); }
  if(selTpl && !tplById(selTpl)) selTpl = defaultTpl(l, selCat);
  const scroll = $('#dr .db')?.scrollTop;
  $('#dr').innerHTML = drawerHTML(l);
  if(keep && !changedLead && scroll) $('#dr .db').scrollTop = scroll;
  $('#dr').classList.add('on'); $('#ov').classList.add('on');
  bindDrawer(l); renderList();
  if(PANEL){ $('#panelHome').classList.add('hidden'); renderPanelBar(); if(changedLead) window.scrollTo(0,0); }
}
function closeLead(){ $('#dr').classList.remove('on'); $('#ov').classList.remove('on'); current=null; renderList(); if(PANEL) renderPanelHome(); }
$('#ov').onclick=closeLead;
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if($('#modalRoot').innerHTML) closeModal(); else if(current) closeLead(); } });

function varInputs(l, t){
  const vals = varValues(l);
  const used = usedVars(t.conteudo).filter(k=>VK[k]?.lead);
  if(!used.length) return '';
  const defaults = {cidade:st.cfg.cidade, segmento:(l.cat||'').toLowerCase(), valor_site:st.cfg.valor_site, valor_manutencao:st.cfg.valor_manutencao, prazo:st.cfg.prazo};
  return `<div class="vars">${used.map(k=>{
    const own = k==='contato' ? (l.s.contato||'') : (l.s.v[k]||'');
    const isEmpty = !String(vals[k]||'').trim();
    return `<div class="${isEmpty?'empty':''}"><label>{{${k}}}</label><input data-var="${k}" type="${VK[k].type||'text'}" value="${esc(own)}" placeholder="${esc(defaults[k]||VK[k].d)}"></div>`;
  }).join('')}</div>`;
}
function drawerHTML(l){
  const ph=phone(l), t=selTpl?tplById(selTpl):null, nextCat=NEXT_CAT[l.s.status];
  const fixo=(l.canal||'').startsWith('Ligar');
  const vals=varValues(l);
  const missing = t ? usedVars(t.conteudo).filter(k=>!String(vals[k]??'').trim()) : [];
  const after = t ? statusAfterSend(l.s.status, t.etapa) : l.s.status;
  const envios = l.s.hist.filter(h=>h.tipo==='envio');
  const inChat = EXT && wa.leadId===l.id;
  const replied = inChat && wa.info?.incoming && !['respondeu','negociando','fechado'].includes(l.s.status);
  return `
  <div class="dh">
    <div style="min-width:0"><h2>${esc(l.emp)}</h2>
      <div class="meta">${esc(l.cat)} · ${esc(l.bairro||'')} · ${l.nota?String(l.nota).replace('.',',')+' ★ ('+l.aval+' avaliações)':'sem nota'}</div></div>
    <div class="navbtns" style="margin-left:auto"><button class="x" id="prev" title="Anterior">‹</button><button class="x" id="next" title="Próximo">›</button><button class="x" id="close" title="Fechar (Esc)">×</button></div>
  </div>
  <div class="db">
    ${replied?`<div class="pfound"><b>📩 Este lead já te mandou mensagem nesta conversa.</b><button class="btn xs" data-q="respondeu">Marcar como Respondeu</button><small>Pode ser resposta automática do WhatsApp Business: confira antes.</small></div>`:''}
    <div class="info">
      <span class="pill s-${l.s.status}">${SL[l.s.status]}</span>
      <span class="pill p-${esc(l.prio)}">Prioridade ${esc(l.prio)}</span>
      <span class="pill">${esc(l.pres)}</span>
      <span class="pill">Google mostra: ${esc(l.site)}</span>
    </div>
    <div class="links">
      ${l.maps?`<a class="btn sm" href="${esc(l.maps)}" target="_blank" rel="noopener">📍 Abrir no Maps</a>`:''}
      ${ph?`<a class="btn sm" href="tel:+${ph}">📞 ${esc(l.tel)}</a>`:'<span class="pill">Sem telefone: pegue o contato no Maps/Instagram</span>'}
      <button class="btn sm" id="copyTel" ${ph?'':'disabled'}>Copiar número</button>
    </div>
    <div class="grid2">
      <div><label>Nome do contato · {{contato}}</label><input id="contato" value="${esc(l.s.contato||'')}" placeholder="ex.: João"></div>
      <div><label>Etapa do funil</label><select id="status">${STAGES.map(s=>`<option value="${s.k}" ${s.k===l.s.status?'selected':''}>${s.l}</option>`).join('')}</select></div>
      <div><label>Próxima ação em</label><input type="date" id="prox" value="${esc(l.s.prox||'')}"></div>
      <div><label>1º contato · mensagens enviadas</label><input value="${esc(br(l.s.data1)||'—')} · ${envios.length}" disabled></div>
    </div>

    <div class="sendbox">
      <h3>💬 Mensagem</h3>
      <div class="cats">${CATS.map(c=>`<button data-cat="${c.k}" class="${c.k===selCat?'on':''}" title="${c.k===nextCat?'Próximo passo para este lead':''}">${c.e} ${c.l}${c.k===nextCat?'<span class="nx">●</span>':''}</button>`).join('')}</div>
      <div class="chips">${tplsOf(selCat).map(x=>`<button data-tpl="${x.id}" class="${x.id===selTpl?'on':''}">${esc(x.nome)}</button>`).join('') || '<span class="hint" style="margin:0">Nenhum modelo nesta etapa.</span>'}
        <button data-newtpl="1" title="Criar modelo nesta etapa">+ Novo</button></div>
      ${t ? `
      ${varInputs(l,t)}
      ${missing.length?`<div class="warn">Sem valor para ${missing.map(k=>'<b>'+esc(k)+'</b>').join(', ')}: ${missing.length>1?'esses trechos foram retirados':'esse trecho foi retirado'} da mensagem. Preencha acima para incluir.</div>`:''}
      ${fixo&&!inChat?`<div class="warn">Número fixo. Muitos comércios usam WhatsApp Business no fixo, então vale tentar. Se não abrir, ligue e peça o WhatsApp do responsável (roteiro em Ajustes).</div>`:''}
      <textarea class="inp" id="msg">${esc(fillFor(t,l))}</textarea>
      <div class="row" style="margin-top:8px">
        <button class="btn pri" id="send" ${ph||inChat?'':'disabled'}>${inChat?'Colocar na conversa':'Enviar no WhatsApp'}</button>
        <button class="btn sm" id="copy">Copiar mensagem</button>
        ${inChat?'':`<button class="btn sm" id="openOnly" ${ph?'':'disabled'}>Só abrir conversa</button>`}
        <button class="btn sm" id="editTpl">Editar modelo</button>
      </div>
      <div class="hint">${inChat?'O texto vai para a caixa de mensagem da conversa aberta':EXT?'Abre a conversa na aba do WhatsApp Web com o texto pronto':'Abre o '+(st.cfg.modo==='app'?'WhatsApp Desktop':'WhatsApp Web')+' com o texto pronto'}: confira e aperte Enter.
        ${after!==l.s.status?` Ao enviar, o lead vai para <b>${SL[after]}</b> e a próxima ação fica para daqui a ${CL[t.etapa].days} dias.`:' Ao enviar, o envio fica registrado no histórico.'}</div>` : ''}
    </div>

    <div class="field"><label class="lb">Observações</label>
      <textarea class="inp" id="obs" style="min-height:80px" placeholder="O que foi conversado, melhor horário, próximo passo…">${esc(l.s.obs||'')}</textarea></div>

    <div class="row">
      <button class="btn sm" data-q="respondeu">🟢 Respondeu</button>
      <button class="btn sm" data-q="negociando">🟣 Proposta / reunião</button>
      <button class="btn sm" data-q="fechado">✓ Fechou</button>
      <button class="btn sm danger" data-q="perdido">Sem interesse</button>
      ${['sem_retorno','perdido'].includes(l.s.status)?'<button class="btn sm" id="reativar">↺ Reativar</button>':''}
      ${['negociando','fechado'].includes(l.s.status)?'<button class="btn sm" id="regVenda">💰 Registrar venda</button>':''}
    </div>
    ${(()=>{ const vs=salesOf(l.id), ms=st.fin.mensais.filter(c=>c.leadId===l.id); if(!vs.length&&!ms.length) return '';
      return `<div class="box" style="margin-top:14px;padding:10px 12px"><b>💰 Vendas deste cliente</b>${vs.map(v=>`<div class="row" style="justify-content:space-between;margin-top:6px"><span>${br(v.data)} · ${esc(v.servico||'Projeto')}</span><span class="num"><b>${brl(v.valor)}</b>${v.valor-(v.recebido||0)>0?` <small class="due">falta ${brl(v.valor-(v.recebido||0))}</small>`:''} <button class="btn xs" data-editv="venda:${v.id}">Editar</button></span></div>`).join('')}${ms.map(c=>`<div class="row" style="justify-content:space-between;margin-top:6px"><span>Manutenção desde ${br(c.inicio)}${c.fim?' (encerrada)':''}</span><span class="num"><b>${brl(c.valor)}/mês</b> <button class="btn xs" data-editv="mensal:${c.id}">Editar</button></span></div>`).join('')}</div>`; })()}

    <h4>Histórico</h4>
    ${l.s.hist.length ? `<ul class="hist">${[...l.s.hist].reverse().map(h=>`<li class="${h.tipo||''}"><time>${esc(br(h.t))} ${esc(h.t.slice(11))}</time>${
      h.tipo==='envio' && h.tplNome ? `Enviou <b>${esc(h.tplNome)}</b> <span class="pill tag s-${esc(h.cat)}">${esc(CL[h.cat]?.l||h.cat)}</span>${h.editada?' <small style="color:var(--muted)">(texto editado)</small>':''}${h.para?` → ${esc(SL[h.para])}`:''}` : esc(h.txt)}</li>`).join('')}</ul>` : '<p class="hint">Nenhuma interação ainda.</p>'}
  </div>`;
}
function bindDrawer(l){
  const i = visible.findIndex(x=>x.id===l.id);
  $('#close').onclick=closeLead;
  $('#prev').onclick=()=>{ if(i>0) openLead(visible[i-1].id); };
  $('#next').onclick=()=>{ if(i>=0 && i<visible.length-1) openLead(visible[i+1].id); };
  $('#contato').onchange=e=>{ l.s.contato=e.target.value.trim(); save(); openLead(l.id,true); };
  $('#status').onchange=e=>setStatus(l,e.target.value);
  $('#prox').onchange=e=>{ l.s.prox=e.target.value||null; save(); refresh(); };
  $('#obs').onchange=e=>{ l.s.obs=e.target.value; save(); };
  $('#copyTel').onclick=()=>{ copyText(l.tel); toast('Número copiado'); };
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{ selCat=b.dataset.cat; selTpl=defaultTpl(l,selCat); openLead(l.id,true); });
  document.querySelectorAll('[data-tpl]').forEach(b=>b.onclick=()=>{ selTpl=b.dataset.tpl; openLead(l.id,true); });
  $('[data-newtpl]').onclick=()=>openEditor(null, selCat, l);
  document.querySelectorAll('[data-var]').forEach(inp=>inp.onchange=()=>{
    const k=inp.dataset.var, v=inp.value.trim();
    if(k==='contato'){ l.s.contato=v; } else if(v) l.s.v[k]=v; else delete l.s.v[k];
    save(); openLead(l.id,true);
  });
  document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>setStatus(l,b.dataset.q));
  if($('#reativar')) $('#reativar').onclick=()=>{ const snap=snapshot(l); log(l,'Reativado: '+SL[l.s.status]+' → A contatar'); l.s.status='a_contatar'; l.s.prox=today(); save(); refresh(); openLead(l.id); toast('Lead reativado','Desfazer',()=>restore(l,snap)); };
  if($('#regVenda')) $('#regVenda').onclick=()=>openFinForm('venda',null,{leadId:l.id, cliente:l.emp, servico:'Site', valor:parseMoney(l.s.v.valor_site||st.cfg.valor_site), data:today(), mensal:!salesOf(l.id).length && !!(l.s.v.valor_manutencao||st.cfg.valor_manutencao), mensalValor:l.s.v.valor_manutencao||st.cfg.valor_manutencao||''});
  document.querySelectorAll('[data-editv]').forEach(b=>b.onclick=()=>{ const [k,id]=b.dataset.editv.split(':'); openFinForm(k,id); });
  if(!$('#msg')) return;
  const t=tplById(selTpl);
  $('#copy').onclick=()=>{ const text=$('#msg').value; copyText(text); toast('Mensagem copiada','Registrar como enviada',()=>registerSend(l,t,text,false)); };
  if($('#openOnly')) $('#openOnly').onclick=()=>openWA(l,$('#msg').value);
  $('#editTpl').onclick=()=>openEditor(t.id, t.etapa, l);
  $('#send').onclick=()=>send(l,t);
}
function copyText(s){
  if(navigator.clipboard?.writeText) navigator.clipboard.writeText(s).catch(()=>fallbackCopy(s)); else fallbackCopy(s);
}
function fallbackCopy(s){ const ta=document.createElement('textarea'); ta.value=s; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(e){} ta.remove(); }
const snapshot = l => JSON.parse(JSON.stringify(l.s));
function restore(l,snap){ st.leads[l.id]=snap; save(); refresh(); if(current===l.id) openLead(l.id); }
function log(l,txt,extra){ l.s.hist.push(Object.assign({t:nowStr(), txt}, extra||{})); }
function setStatus(l,k){
  if(l.s.status===k) return;
  const snap=snapshot(l);
  log(l,'Etapa: '+SL[l.s.status]+' → '+SL[k]); l.s.status=k;
  if(['fechado','perdido','sem_retorno'].includes(k)) l.s.prox=null;
  if(['respondeu','negociando'].includes(k) && (!l.s.prox || l.s.prox<today())) l.s.prox=today();
  save(); refresh(); if(current===l.id) openLead(l.id);
  toast(l.emp+': '+SL[k],'Desfazer',()=>restore(l,snap));
  if(k==='fechado') promptSale(l);
}
function openWA(l,text){
  if(EXT) return extOpenWA(l,text);
  const ph=phone(l), t=encodeURIComponent(text);
  if(st.cfg.modo==='app') location.href=`whatsapp://send?phone=${ph}&text=${t}`;
  else if(st.cfg.modo==='wame') window.open(`https://wa.me/${ph}?text=${t}`,'kodaforge_wa');
  else window.open(`https://web.whatsapp.com/send?phone=${ph}&text=${t}`,'kodaforge_wa');
}
function registerSend(l,t,text,advance){
  const snap=snapshot(l), from=l.s.status, to=statusAfterSend(from,t.etapa);
  log(l,'Enviou '+t.nome,{tipo:'envio', tplId:t.id, tplNome:t.nome, cat:t.etapa, editada: text.trim()!==fillFor(t,l).trim(), para: to!==from?to:undefined});
  if(!l.s.data1) l.s.data1=today();
  if(to!==from || ['respondeu','negociando'].includes(t.etapa)){ l.s.status=to; l.s.prox=addDays(CL[t.etapa].days); }
  save(); refresh();
  toast(`Registrado: ${t.nome}`+(to!==from?` · ${l.emp} → ${SL[to]}`:''),'Desfazer',()=>restore(l,snap));
  const i=visible.findIndex(x=>x.id===l.id);
  const nxt = advance && st.cfg.avancar && SEQ.includes(t.etapa) ? visible.slice(i+1).find(x=>SEQ.includes(x.s.status) && x.s.status!=='ultima' && phone(x)) : null;
  if(nxt && !PANEL && !$('#v-lista').classList.contains('hidden')) openLead(nxt.id); else if(current===l.id) openLead(l.id);
}
function send(l,t){
  const text=$('#msg').value.trim();
  if(!text){ toast('Mensagem vazia'); return; }
  if(/\{\{|\[[A-ZÀ-Ú ]{3,}\]/.test(text) && !confirm('A mensagem ainda tem um campo para completar. Enviar assim mesmo?')) return;
  if(sentToday()>=st.cfg.meta && !confirm(`Você já registrou ${sentToday()} envios hoje (limite: ${st.cfg.meta}). Muitos envios seguidos para desconhecidos podem fazer o WhatsApp bloquear seu número. Continuar?`)) return;
  openWA(l,text);
  registerSend(l,t,text,true);
}

/* ---------- editor de modelos ---------- */
function closeModal(){ $('#modalRoot').innerHTML=''; }
function openEditor(id, cat, lead){
  const t = id ? tplById(id) : {id:null, etapa:cat||'enviada', nome:'', conteudo:''};
  const sample = lead || leads.find(l=>l.s.contato) || leads[0];
  $('#modalRoot').innerHTML = `<div class="modal" id="modalBg"><div class="dialog" role="dialog" aria-modal="true">
    <h3>${id?'Editar modelo':'Novo modelo'}</h3>
    <div class="grid2">
      <div><label>Nome</label><input id="eNome" value="${esc(t.nome)}" placeholder="ex.: Follow-up curto"></div>
      <div><label>Etapa</label><select id="eCat">${CATS.map(c=>`<option value="${c.k}" ${c.k===t.etapa?'selected':''}>${c.e} ${c.l}</option>`).join('')}</select></div>
    </div>
    <div class="ed">
      <div><label class="lb">Conteúdo</label><textarea class="inp" id="eTxt" style="width:100%">${esc(t.conteudo)}</textarea>
        <div class="hint">Clique para inserir uma variável no cursor:</div>
        <div class="vchips">${VARS.map(v=>`<button data-ins="${v.k}" title="${esc(v.d)}">{{${v.k}}}</button>`).join('')}</div></div>
      <div><label class="lb">Prévia com <b>${esc(sample.emp)}</b>${sample.s.contato?'':' (sem contato preenchido)'}</label><div class="prev" id="ePrev"></div>
        <div class="hint" id="eWarn"></div></div>
    </div>
    <div class="row" style="justify-content:flex-end;margin-top:14px">
      <button class="btn" id="eCancel">Cancelar</button><button class="btn acc" id="eSave">Salvar modelo</button>
    </div></div></div>`;
  const upd=()=>{
    const txt=$('#eTxt').value; $('#ePrev').textContent = renderTpl(txt, varValues(sample)) || '—';
    const unknown = usedVars(txt).filter(k=>!VK[k]);
    $('#eWarn').innerHTML = unknown.length ? `<span class="due">Variável desconhecida: ${unknown.map(esc).join(', ')}. Ela será removida da mensagem.</span>` : 'Campos sem valor somem da mensagem automaticamente.';
  };
  $('#eTxt').oninput=upd; upd();
  document.querySelectorAll('[data-ins]').forEach(b=>b.onclick=()=>{
    const ta=$('#eTxt'), ins=`{{${b.dataset.ins}}}`, s=ta.selectionStart, e=ta.selectionEnd;
    ta.value = ta.value.slice(0,s)+ins+ta.value.slice(e); ta.focus(); ta.selectionStart=ta.selectionEnd=s+ins.length; upd();
  });
  $('#modalBg').onclick=e=>{ if(e.target.id==='modalBg') closeModal(); };
  $('#eCancel').onclick=closeModal;
  $('#eSave').onclick=()=>{
    const nome=$('#eNome').value.trim(), conteudo=$('#eTxt').value.trim(), etapa=$('#eCat').value;
    if(!nome || !conteudo){ alert('Preencha o nome e o conteúdo do modelo.'); return; }
    let saved;
    if(id){ Object.assign(t,{nome,conteudo,etapa}); saved=t; }
    else { saved={id:uid(), etapa, nome, conteudo}; st.templates.push(saved); }
    save(); closeModal(); toast('Modelo salvo');
    renderModelos();
    if(current){ selCat=saved.etapa; selTpl=saved.id; openLead(current,true); }
  };
  setTimeout(()=>(id?$('#eTxt'):$('#eNome')).focus(),0);
}
function duplicateTpl(id){
  const t=tplById(id), i=st.templates.indexOf(t);
  const c={...t, id:uid(), nome:t.nome+' (cópia)'}; st.templates.splice(i+1,0,c); save(); renderModelos(); toast('Modelo duplicado');
  return c;
}
function deleteTpl(id){
  const t=tplById(id); if(!confirm(`Excluir o modelo "${t.nome}"?`)) return;
  const i=st.templates.indexOf(t); st.templates.splice(i,1); save(); renderModelos();
  toast('Modelo excluído','Desfazer',()=>{ st.templates.splice(i,0,t); save(); renderModelos(); });
}
function moveTpl(id,dir){
  const t=tplById(id), same=st.templates.filter(x=>x.etapa===t.etapa), j=same.indexOf(t)+dir;
  if(j<0||j>=same.length) return;
  const a=st.templates.indexOf(t), b=st.templates.indexOf(same[j]); [st.templates[a],st.templates[b]]=[st.templates[b],st.templates[a]];
  save(); renderModelos();
}
function renderModelos(){
  if($('#v-modelos').classList.contains('hidden')) return;
  const hl = s => esc(s).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,'<span class="v">{{$1}}</span>');
  $('#modelos').innerHTML = `
    <div class="box"><h3>Modelos de mensagem</h3>
      <p class="sub">Cada etapa pode ter vários modelos. No lead, a etapa do próximo passo abre sozinha, e o primeiro modelo da lista é o sugerido (use ↑ ↓ para mudar a ordem).
      As variáveis são trocadas pelos dados do lead. Se um campo estiver vazio, aquele trecho some da mensagem.</p>
      <div class="vchips">${VARS.map(v=>`<span class="pill" title="${esc(v.d)}" style="font-family:ui-monospace,Consolas,monospace">{{${v.k}}}</span>`).join('')}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm acc" id="newTpl">+ Novo modelo</button><button class="btn sm" id="resetTpl">Restaurar modelos padrão</button></div>
    </div>
    ${CATS.map(c=>{ const list=tplsOf(c.k); return `<div class="tplcat"><h3>${c.e} ${c.l} <span class="pill">${list.length}</span>
      <button class="btn xs" data-newin="${c.k}">+ Novo</button></h3>
      <div class="tplgrid">${list.map((t,i)=>`<div class="tcard"><b>${esc(t.nome)}</b><pre>${hl(t.conteudo)}</pre>
        <div class="row">
          <button class="btn xs" data-a="copy" data-id="${t.id}">Copiar mensagem</button>
          <button class="btn xs" data-a="edit" data-id="${t.id}">Editar</button>
          <button class="btn xs" data-a="dup" data-id="${t.id}">Duplicar</button>
          <button class="btn xs danger" data-a="del" data-id="${t.id}">Excluir</button>
          <span style="margin-left:auto"></span>
          <button class="btn xs" data-a="up" data-id="${t.id}" ${i===0?'disabled':''} title="Subir">↑</button>
          <button class="btn xs" data-a="down" data-id="${t.id}" ${i===list.length-1?'disabled':''} title="Descer">↓</button>
        </div></div>`).join('') || '<p class="hint">Nenhum modelo nesta etapa.</p>'}</div></div>`; }).join('')}`;
  $('#newTpl').onclick=()=>openEditor(null,'enviada');
  $('#resetTpl').onclick=()=>{ if(confirm('Restaurar os modelos padrão? Os modelos que você editou ou criou serão substituídos.')){ const old=st.templates; st.templates=DEFAULT_TEMPLATES.map(t=>({...t})); save(); renderModelos(); toast('Modelos restaurados','Desfazer',()=>{ st.templates=old; save(); renderModelos(); }); } };
  document.querySelectorAll('[data-newin]').forEach(b=>b.onclick=()=>openEditor(null,b.dataset.newin));
  document.querySelectorAll('.tcard [data-a]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.id, a=b.dataset.a;
    if(a==='copy'){ copyText(tplById(id).conteudo); toast('Modelo copiado (com as variáveis)'); }
    if(a==='edit') openEditor(id);
    if(a==='dup') openEditor(duplicateTpl(id).id);
    if(a==='del') deleteTpl(id);
    if(a==='up') moveTpl(id,-1);
    if(a==='down') moveTpl(id,1);
  });
}

/* ---------- funil ---------- */
function renderFunil(){
  $('#kanban').innerHTML = STAGES.map(s=>{
    const ls = leads.filter(l=>l.s.status===s.k).sort((a,b)=>b.pts-a.pts);
    const shown = ls.slice(0,80);
    return `<div class="col" data-k="${s.k}"><h3><span>${s.l}</span><span class="pill s-${s.k}">${ls.length}</span></h3><div class="cards">
      ${shown.map(l=>`<div class="card" draggable="true" data-id="${l.id}"><b>${esc(l.emp)}</b><small>${esc(l.cat)} · ${esc(l.prio)}${l.s.prox?` · <span class="${isDue(l)?'due':''}">${br(l.s.prox)}</span>`:''}</small></div>`).join('')}
      ${ls.length>shown.length?`<p class="hint">+${ls.length-shown.length} na aba Leads</p>`:''}
    </div></div>`;
  }).join('');
  let dragId=null;
  document.querySelectorAll('.card').forEach(c=>{
    c.onclick=()=>openLead(+c.dataset.id);
    c.ondragstart=()=>{ dragId=+c.dataset.id; c.classList.add('drag'); };
    c.ondragend=()=>c.classList.remove('drag');
  });
  document.querySelectorAll('.col').forEach(col=>{
    col.ondragover=e=>{ e.preventDefault(); col.classList.add('over'); };
    col.ondragleave=()=>col.classList.remove('over');
    col.ondrop=e=>{ e.preventDefault(); col.classList.remove('over'); if(dragId) setStatus(byId[dragId], col.dataset.k); };
  });
}

/* ---------- hoje ---------- */
function renderHoje(){
  const due = leads.filter(isDue).sort((a,b)=>(a.s.prox>b.s.prox?1:-1));
  const next = leads.filter(l=>l.s.status==='a_contatar' && phone(l)).sort((a,b)=>b.pts-a.pts || (b.aval||0)-(a.aval||0));
  const nextWA = next.filter(l=>l.canal==='WhatsApp');
  const n=sentToday(), meta=st.cfg.meta;
  const item = l => `<div class="li" data-id="${l.id}"><div><b>${esc(l.emp)}</b><small>${esc(l.cat)} · ${SL[l.s.status]}${l.s.prox?' · próximo: '+CL[NEXT_CAT[l.s.status]].l:''}</small></div>${l.s.prox?`<span class="${isDue(l)?'due':''}">${br(l.s.prox)}</span>`:`<span class="pill p-${esc(l.prio)}">${esc(l.prio)}</span>`}</div>`;
  $('#today').innerHTML = `
    <div class="box"><h3>Meta de hoje</h3><p class="sub">${n} de ${meta} mensagens enviadas</p>
      <div class="meter"><i style="width:${Math.min(100,n/meta*100)}%"></i></div>
      <p class="hint">Mande uma por vez e personalize quando der. Melhor horário: terça a quinta, 9h–11h ou 14h–16h.</p>
      <button class="btn pri" id="startSeq" ${nextWA.length?'':'disabled'}>Começar pelos próximos com WhatsApp →</button></div>
    <div class="box"><h3>Ações para hoje</h3><p class="sub">${due.length ? due.length+' lead(s) esperando o próximo passo' : 'Nada vencido. 👌'}</p>${due.map(item).join('')}</div>
    <div class="box"><h3>Próximos a contatar</h3><p class="sub">Maior prioridade primeiro · ${next.length} com telefone</p>${next.slice(0,12).map(item).join('')}</div>`;
  document.querySelectorAll('#today .li').forEach(e=>e.onclick=()=>openLead(+e.dataset.id));
  const b=$('#startSeq'); if(b) b.onclick=()=>{
    ['q','fStatus','fPrio','fNicho','fPres','fDue'].forEach(id=>{ const e=$('#'+id); if(e.type==='checkbox') e.checked=false; else e.value=''; });
    $('#fStatus').value='a_contatar'; $('#fCanal').value='WhatsApp'; sortK='pts'; sortDir=-1;
    show('lista'); renderList(); if(visible[0]) openLead(visible[0].id);
  };
}

/* ---------- ajustes ---------- */
function renderCfg(){
  const m=st.cfg.modo, c=st.cfg;
  $('#cfg').innerHTML = `
    <div class="box"><h3>Seus dados e valores padrão</h3><p class="sub">Usados nas variáveis quando o lead não tem um valor próprio. Dá para mudar o valor de um lead específico direto na mensagem dele.</p>
      <div class="grid2">
        <div><label>{{nome_vendedor}}</label><input data-cfg="nome_vendedor" value="${esc(c.nome_vendedor)}"></div>
        <div><label>{{cidade}} padrão</label><input data-cfg="cidade" value="${esc(c.cidade)}"></div>
        <div><label>{{valor_site}}</label><input data-cfg="valor_site" value="${esc(c.valor_site)}" placeholder="ex.: R$ 1.500"></div>
        <div><label>{{valor_manutencao}}</label><input data-cfg="valor_manutencao" value="${esc(c.valor_manutencao)}" placeholder="ex.: R$ 99"></div>
        <div><label>{{prazo}}</label><input data-cfg="prazo" value="${esc(c.prazo)}" placeholder="ex.: 15 dias"></div>
      </div></div>
    <div class="box"><h3>Como abrir o WhatsApp</h3><p class="sub">${EXT?'Na extensão, o CRM usa sempre a aba do WhatsApp Web. ':''}Todas usam o seu número. Nada é enviado sem você apertar Enter na conversa.</p>
      <div class="radio ${EXT?'hidden':''}">
        <label><input type="radio" name="modo" value="web" ${m==='web'?'checked':''}> WhatsApp Web (reaproveita a mesma aba)</label>
        <label><input type="radio" name="modo" value="app" ${m==='app'?'checked':''}> WhatsApp Desktop (app do Windows)</label>
        <label><input type="radio" name="modo" value="wame" ${m==='wame'?'checked':''}> Link wa.me (celular)</label>
      </div>
      <div class="grid2" style="margin-top:14px">
        <div><label>Limite de envios por dia</label><input type="number" id="meta" min="1" value="${c.meta}"></div>
        <div><label>Depois de enviar uma mensagem de prospecção</label><select id="avancar"><option value="1" ${c.avancar?'selected':''}>Abrir o próximo lead da lista</option><option value="0" ${!c.avancar?'selected':''}>Ficar no mesmo lead</option></select></div>
      </div></div>
    <div class="box"><h3>Sequência automática</h3>
      <p class="hint" style="font-size:13px;line-height:1.7">Ao enviar um modelo, o lead vai para a etapa do modelo e a próxima ação é agendada:
      1ª mensagem → follow-up 1 em <b>2 dias</b> → follow-up 2 em mais <b>4 dias</b> → última mensagem em mais <b>7 dias</b> → depois de <b>7 dias</b> sem resposta, vai para <b>Sem retorno</b> (pode ser reativado).
      Modelos de "Respondeu" e "Proposta / reunião" levam o lead para essas etapas e agendam retorno em 2 e 3 dias.</p></div>
    <div class="box"><h3>Roteiro de ligação (números fixos)</h3><p class="hint" style="font-size:13px;white-space:pre-wrap">${esc(DATA.scripts['LIGAÇÃO (número fixo)'])}</p></div>
    <div class="box"><h3>Backup e exportação</h3><p class="sub">Os dados (leads, histórico, modelos e vendas) ficam salvos neste navegador. Faça backup de vez em quando ou para levar a outro computador.</p>
      <div class="row">
        <button class="btn sm" id="bkp">Baixar backup (.json)</button>
        <label class="btn sm">Restaurar backup<input type="file" id="imp" accept=".json" hidden></label>
        <button class="btn sm" id="csv">Exportar planilha (.csv)</button>
        <button class="btn sm danger" id="reset">Apagar progresso dos leads</button>
      </div></div>`;
  document.querySelectorAll('[data-cfg]').forEach(i=>i.onchange=()=>{ st.cfg[i.dataset.cfg]=i.value.trim(); save(); toast('Salvo'); });
  document.querySelectorAll('[name=modo]').forEach(r=>r.onchange=()=>{ st.cfg.modo=r.value; save(); });
  $('#meta').onchange=e=>{ st.cfg.meta=Math.max(1,+e.target.value||25); save(); renderStats(); };
  $('#avancar').onchange=e=>{ st.cfg.avancar=e.target.value==='1'; save(); };
  $('#bkp').onclick=()=>download(`crm-kodaforge-backup-${today()}.json`, JSON.stringify(st,null,1), 'application/json');
  $('#imp').onchange=e=>{ const f=e.target.files[0]; if(!f) return; f.text().then(t=>{ try{ const d=JSON.parse(t); if(!d.leads) throw 0; if(confirm('Substituir o progresso atual por este backup?')){ localStorage.setItem(KEY,JSON.stringify(d)); st=load(); housekeeping(); refresh(); renderCfg(); toast('Backup restaurado'); } }catch(err){ alert('Arquivo de backup inválido.'); } }); };
  $('#csv').onclick=exportCSV;
  $('#reset').onclick=()=>{ if(confirm('Apagar etapa, notas e histórico de TODOS os leads? Os modelos de mensagem são mantidos. Isso não pode ser desfeito (a menos que você tenha um backup).')){ st.leads={}; save(); refresh(); toast('Progresso apagado'); } };
}
function download(name,content,type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function exportCSV(){
  const cols=[['#','id'],['Prioridade','prio'],['Pontos','pts'],['Empresa','emp'],['Nicho','nicho'],['Categoria','cat'],['Presença digital','pres'],['Telefone','tel'],['Canal','canal'],['Bairro','bairro'],['Nota','nota'],['Avaliações','aval'],['Google Maps','maps']];
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const head=[...cols.map(c=>c[0]),'Contato','Etapa','1º contato','Próxima ação','Mensagens enviadas','Último modelo enviado','Observações'];
  const lines=leads.map(l=>{ const env=l.s.hist.filter(h=>h.tipo==='envio'), u=env.at(-1);
    return [...cols.map(c=>l[c[1]]), l.s.contato, SL[l.s.status], br(l.s.data1), br(l.s.prox), env.length, u?`${u.t} · ${u.tplNome||u.txt}`:'', l.s.obs].map(q).join(';'); });
  download(`crm-kodaforge-${today()}.csv`, '﻿'+[head.map(q).join(';'),...lines].join('\r\n'), 'text/csv');
}

/* ---------- vendas e lucro ---------- */
// vendas: projetos (valor único) · mensais: manutenção recorrente · despesas: avulsas ou mensais fixas
const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const brl = n => BRL.format(n||0);
const brlShort = n => Math.abs(n)>=1000 ? 'R$ '+(n/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil' : brl(n).replace(',00','');
function parseMoney(v){
  let s=String(v??'').replace(/[^\d,.-]/g,''); if(!s) return 0;
  if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(s)) s=s.replace(/\./g,'');
  return Math.round((parseFloat(s)||0)*100)/100;
}
const ym = d => d.slice(0,7);
const curYM = () => today().slice(0,7);
function addMonths(m,n){ let [y,mo]=m.split('-').map(Number); mo+=n; while(mo>12){mo-=12;y++;} while(mo<1){mo+=12;y--;} return y+'-'+String(mo).padStart(2,'0'); }
function monthsBetween(a,b){ const out=[]; for(let m=a; m<=b; m=addMonths(m,1)) out.push(m); return out; }
const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const mLabel = m => MES[+m.slice(5)-1]+'/'+m.slice(2,4);
const activeIn = (ini,fim,m) => ini && ym(ini)<=m && (!fim || ym(fim)>=m);

function monthFigures(m){
  const F=st.fin, r={m, vendas:0, custoVendas:0, mensal:0, custoMensal:0, despesas:0, nVendas:0};
  for(const v of F.vendas) if(ym(v.data)===m){ r.vendas+=v.valor; r.custoVendas+=v.custo||0; r.nVendas++; }
  for(const c of F.mensais) if(activeIn(c.inicio,c.fim,m)){ r.mensal+=c.valor; r.custoMensal+=c.custo||0; }
  for(const d of F.despesas) if(d.mensal ? activeIn(d.data,d.fim,m) : ym(d.data)===m) r.despesas+=d.valor;
  r.fat=r.vendas+r.mensal; r.custos=r.custoVendas+r.custoMensal+r.despesas; r.lucro=r.fat-r.custos;
  return r;
}
const PERIODS = {mes:'Este mês', ant:'Mês anterior', tri:'Últimos 3 meses', ano:'Este ano', d12:'Últimos 12 meses', tudo:'Tudo'};
function periodRange(p){
  const c=curYM();
  if(p==='ant') return [addMonths(c,-1), addMonths(c,-1)];
  if(p==='tri') return [addMonths(c,-2), c];
  if(p==='ano') return [c.slice(0,4)+'-01', c];
  if(p==='d12') return [addMonths(c,-11), c];
  if(p==='tudo'){
    const F=st.fin, ds=[...F.vendas.map(v=>v.data), ...F.mensais.map(x=>x.inicio), ...F.despesas.map(d=>d.data)].filter(Boolean).sort();
    return [ds.length?ym(ds[0]):c, c];
  }
  return [c,c];
}
let finPeriod='mes', finTable=false;
function renderVendas(){
  const F=st.fin, [a,b]=periodRange(finPeriod), months=monthsBetween(a,b);
  const tot = months.map(monthFigures).reduce((s,r)=>{ for(const k in r) if(k!=='m') s[k]=(s[k]||0)+r[k]; return s; },{});
  const inRange = d => d && ym(d)>=a && ym(d)<=b;
  const aReceber = F.vendas.reduce((s,v)=>s+Math.max(0,v.valor-(v.recebido||0)),0);
  const mrr = F.mensais.filter(c=>activeIn(c.inicio,c.fim,curYM())).reduce((s,c)=>s+c.valor,0);
  const fechados = leads.filter(l=>l.s.status==='fechado').length, contatados = leads.filter(l=>l.s.status!=='a_contatar').length;
  const margem = tot.fat ? Math.round(tot.lucro/tot.fat*100) : null;
  const vendasP = F.vendas.filter(v=>inRange(v.data)).sort((x,y)=>y.data.localeCompare(x.data));
  const despP = F.despesas.filter(d=>d.mensal ? months.some(m=>activeIn(d.data,d.fim,m)) : inRange(d.data)).sort((x,y)=>y.data.localeCompare(x.data));
  const mensais = [...F.mensais].sort((x,y)=>(x.fim?1:0)-(y.fim?1:0) || y.inicio.localeCompare(x.inicio));
  const tile = (label,val,sub,cls='') => `<div class="kpi ${cls}"><span>${label}</span><b>${val}</b>${sub?`<small>${sub}</small>`:''}</div>`;
  const leadLink = id => id && byId[id] ? `<a href="#" data-lead="${id}">${esc(byId[id].emp)}</a>` : '';
  $('#vendas').innerHTML = `
    <div class="finbar">
      <div class="seg">${Object.entries(PERIODS).map(([k,l])=>`<button data-per="${k}" class="${k===finPeriod?'on':''}">${l}</button>`).join('')}</div>
      <div class="row" style="margin-left:auto"><button class="btn sm acc" data-new="venda">+ Venda</button><button class="btn sm" data-new="mensal">+ Mensalidade</button><button class="btn sm" data-new="despesa">+ Despesa</button></div>
    </div>
    <p class="hint" style="margin:0 0 12px">${a===b?mLabel(a):mLabel(a)+' a '+mLabel(b)} · vendas contam na data da venda; mensalidades e despesas fixas contam em cada mês em que estão ativas.</p>
    <div class="kpis">
      ${tile('Faturamento', brl(tot.fat), `${brl(tot.vendas)} em projetos · ${brl(tot.mensal)} em mensalidades`)}
      ${tile('Custos e despesas', brl(tot.custos), `${brl(tot.custoVendas+tot.custoMensal)} diretos · ${brl(tot.despesas)} despesas`)}
      ${tile('Lucro', brl(tot.lucro), margem===null?'sem faturamento no período':`margem de ${margem}%`, tot.lucro<0?'neg':'pos')}
      ${tile('Vendas fechadas', tot.nVendas||0, tot.nVendas?`ticket médio ${brl(tot.vendas/tot.nVendas)}`:'nenhuma no período')}
      ${tile('A receber', brl(aReceber), 'total em aberto das vendas')}
      ${tile('Receita recorrente', brl(mrr)+'<small style="display:inline;font-size:13px">/mês</small>', `${F.mensais.filter(c=>activeIn(c.inicio,c.fim,curYM())).length} mensalidade(s) ativa(s)`)}
      ${tile('Conversão do funil', contatados?Math.round(fechados/contatados*100)+'%':'—', `${fechados} fechado(s) de ${contatados} contatado(s)`)}
    </div>
    <div class="box" style="margin-top:16px">
      <div class="row" style="justify-content:space-between"><h3>Faturamento e lucro por mês</h3>
        <div class="row"><span class="lg"><i style="background:var(--s1)"></i>Faturamento</span><span class="lg"><i style="background:var(--s2)"></i>Lucro</span>
        <button class="btn xs" id="finTbl">${finTable?'Ver gráfico':'Ver tabela'}</button></div></div>
      <div id="finChart"></div>
    </div>
    <div class="box" style="margin-top:16px"><h3>Vendas no período</h3>
      ${vendasP.length?`<div class="tablewrap"><table class="ft"><thead><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th class="r">Valor</th><th class="r">Custo</th><th class="r">Lucro</th><th>Pagamento</th><th></th></tr></thead><tbody>
      ${vendasP.map(v=>{ const pend=v.valor-(v.recebido||0); return `<tr><td>${br(v.data)}</td><td>${leadLink(v.leadId)||esc(v.cliente)}</td><td>${esc(v.servico)}</td>
        <td class="r num">${brl(v.valor)}</td><td class="r num">${brl(v.custo)}</td><td class="r num">${brl(v.valor-(v.custo||0))}</td>
        <td>${pend<=0?'<span class="pill s-fechado">Pago</span>':(v.recebido?`<span class="pill s-respondeu">Falta ${brl(pend)}</span>`:'<span class="pill s-perdido">A receber</span>')}${v.forma?` <small style="color:var(--muted)">${esc(v.forma)}</small>`:''}</td>
        <td class="r"><button class="btn xs" data-edit="venda:${v.id}">Editar</button></td></tr>`; }).join('')}</tbody></table></div>`:'<p class="hint">Nenhuma venda neste período. Quando um lead for para "Fechado", o CRM já abre o registro da venda.</p>'}
    </div>
    <div class="box" style="margin-top:16px"><h3>Mensalidades de manutenção</h3>
      ${mensais.length?`<div class="tablewrap"><table class="ft"><thead><tr><th>Cliente</th><th>Início</th><th class="r">Valor/mês</th><th class="r">Custo/mês</th><th>Situação</th><th></th></tr></thead><tbody>
      ${mensais.map(c=>`<tr><td>${leadLink(c.leadId)||esc(c.cliente)}</td><td>${br(c.inicio)}</td><td class="r num">${brl(c.valor)}</td><td class="r num">${brl(c.custo)}</td>
        <td>${c.fim?`<span class="pill">Encerrada em ${br(c.fim)}</span>`:'<span class="pill s-fechado">Ativa</span>'}</td><td class="r"><button class="btn xs" data-edit="mensal:${c.id}">Editar</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">Nenhuma mensalidade cadastrada.</p>'}
    </div>
    <div class="box" style="margin-top:16px"><h3>Despesas no período</h3>
      ${despP.length?`<div class="tablewrap"><table class="ft"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="r">Valor</th><th>Tipo</th><th></th></tr></thead><tbody>
      ${despP.map(d=>`<tr><td>${br(d.data)}</td><td>${esc(d.descricao)}</td><td>${esc(d.categoria||'')}</td><td class="r num">${brl(d.valor)}</td>
        <td>${d.mensal?(d.fim?`Mensal até ${br(d.fim)}`:'Mensal fixa'):'Avulsa'}</td><td class="r"><button class="btn xs" data-edit="despesa:${d.id}">Editar</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">Nenhuma despesa neste período. Cadastre domínio, hospedagem, ferramentas, anúncios…</p>'}
      <div class="row" style="margin-top:10px"><button class="btn xs" id="finCsv">Exportar financeiro (.csv)</button></div>
    </div>`;
  document.querySelectorAll('[data-per]').forEach(b=>b.onclick=()=>{ finPeriod=b.dataset.per; try{sessionStorage.setItem(KEY+'-per',finPeriod);}catch(e){} renderVendas(); });
  document.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>openFinForm(b.dataset.new));
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{ const [k,id]=b.dataset.edit.split(':'); openFinForm(k, id); });
  document.querySelectorAll('#vendas [data-lead]').forEach(a=>a.onclick=e=>{ e.preventDefault(); openLead(+a.dataset.lead); });
  $('#finTbl').onclick=()=>{ finTable=!finTable; renderVendas(); };
  $('#finCsv').onclick=exportFinCSV;
  renderFinChart(addMonths(b,-11), b);
}
function renderFinChart(a,b){
  const rows = monthsBetween(a,b).map(monthFigures);
  if(finTable){
    $('#finChart').innerHTML = `<div class="tablewrap"><table class="ft"><thead><tr><th>Mês</th><th class="r">Faturamento</th><th class="r">Custos</th><th class="r">Lucro</th><th class="r">Vendas</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${mLabel(r.m)}</td><td class="r num">${brl(r.fat)}</td><td class="r num">${brl(r.custos)}</td><td class="r num">${brl(r.lucro)}</td><td class="r num">${r.nVendas}</td></tr>`).join('')}</tbody></table></div>`;
    return;
  }
  const W=Math.max(320, $('#finChart').clientWidth||800), H=240, padL=64, padR=8, padT=12, padB=26;
  const vals = rows.flatMap(r=>[r.fat,r.lucro]);
  let max=Math.max(0,...vals), min=Math.min(0,...vals);
  if(max===min) max=1000;
  const step = niceStep((max-min)/4); max=Math.ceil(max/step)*step; min=Math.floor(min/step)*step;
  const y = v => padT+(max-v)/(max-min)*(H-padT-padB);
  const band=(W-padL-padR)/rows.length, bw=Math.min(18,(band-10)/2);
  let ticks=''; for(let v=min; v<=max+1e-9; v+=step) ticks+=`<line x1="${padL}" x2="${W-padR}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" ${v===0?'':'stroke-dasharray="2 3"'}/><text x="${padL-8}" y="${y(v)+4}" text-anchor="end" class="ax">${brlShort(v)}</text>`;
  const bar=(v,x,fill)=>{ if(!v) return ''; const y0=y(0), y1=y(v), h=Math.max(1,Math.abs(y0-y1)), top=Math.min(y0,y1), r=Math.min(4,h,bw/2);
    // canto arredondado só na ponta do dado, base reta no zero
    return v>0 ? `<path d="M${x},${y0} V${top+r} Q${x},${top} ${x+r},${top} H${x+bw-r} Q${x+bw},${top} ${x+bw},${top+r} V${y0} Z" fill="${fill}"/>`
               : `<path d="M${x},${y0} V${top+h-r} Q${x},${top+h} ${x+r},${top+h} H${x+bw-r} Q${x+bw},${top+h} ${x+bw},${top+h-r} V${y0} Z" fill="${fill}"/>`; };
  const g = rows.map((r,i)=>{ const cx=padL+band*i+band/2, x1=cx-bw-1, x2=cx+1;
    return `<g><rect x="${padL+band*i}" y="${padT}" width="${band}" height="${H-padT-padB}" fill="transparent" rx="6" class="bgh"/>${bar(r.fat,x1,'var(--s1)')}${bar(r.lucro,x2,'var(--s2)')}<text x="${cx}" y="${H-8}" text-anchor="middle" class="ax">${mLabel(r.m)}</text>
      <rect x="${padL+band*i}" y="${padT}" width="${band}" height="${H-padT-padB}" fill="transparent" data-i="${i}" class="hit"/></g>`; }).join('');
  $('#finChart').innerHTML = `<div style="position:relative"><svg width="100%" viewBox="0 0 ${W} ${H}" role="img" aria-label="Faturamento e lucro dos últimos 12 meses">${ticks}${g}</svg><div class="tip hidden" id="finTip"></div></div>`;
  const tip=$('#finTip');
  $('#finChart').querySelectorAll('.hit').forEach(h=>{
    h.onmouseenter=()=>{ const r=rows[+h.dataset.i]; h.parentNode.querySelector('.bgh').setAttribute('fill','var(--panel2)');
      tip.innerHTML=`<b>${mLabel(r.m)}</b><div><i style="background:var(--s1)"></i>Faturamento <span>${brl(r.fat)}</span></div><div><i style="background:var(--s2)"></i>Lucro <span>${brl(r.lucro)}</span></div><div class="mut">Custos ${brl(r.custos)} · ${r.nVendas} venda(s)</div>`;
      tip.classList.remove('hidden'); const sv=$('#finChart svg').getBoundingClientRect(), hb=h.getBoundingClientRect();
      let left=hb.left-sv.left+hb.width/2+8; if(left+200>sv.width) left=hb.left-sv.left+hb.width/2-208; tip.style.left=left+'px'; tip.style.top='8px'; };
    h.onmouseleave=()=>{ h.parentNode.querySelector('.bgh').setAttribute('fill','transparent'); tip.classList.add('hidden'); };
  });
}
function niceStep(raw){ const p=Math.pow(10,Math.floor(Math.log10(raw||1))), n=raw/p; return (n<=1?1:n<=2?2:n<=5?5:10)*p; }

const FIN_FORMS = {
  venda: {title:'venda', list:'vendas', fields:[
    ['cliente','Cliente (lead ou nome)','lead'], ['servico','Serviço','text','Site institucional'], ['data','Data da venda','date'],
    ['valor','Valor da venda','money'], ['custo','Custos do projeto (freelancer, tema, domínio…)','money'], ['recebido','Valor já recebido','money'],
    ['forma','Forma de pagamento','text','Pix, cartão, 50% + 50%…'], ['obs','Observações','textarea']]},
  mensal: {title:'mensalidade', list:'mensais', fields:[
    ['cliente','Cliente (lead ou nome)','lead'], ['valor','Valor mensal','money'], ['custo','Custo mensal (hospedagem, ferramentas…)','money'],
    ['inicio','Início','date'], ['fim','Encerrada em (deixe vazio se ativa)','date'], ['obs','Observações','textarea']]},
  despesa: {title:'despesa', list:'despesas', fields:[
    ['descricao','Descrição','text','ex.: Hospedagem, domínio, anúncios'], ['categoria','Categoria','text','Ferramentas, Marketing, Impostos…'], ['valor','Valor','money'],
    ['data','Data (ou início, se mensal)','date'], ['mensal','Despesa mensal fixa (repete todo mês)','check'], ['fim','Encerrada em (só para mensal)','date']]},
};
function openFinForm(kind, id, preset){
  const F=FIN_FORMS[kind], arr=st.fin[F.list], item = id ? arr.find(x=>x.id===id) : Object.assign({data:today(), inicio:today()}, preset||{});
  const val = k => k==='cliente' ? (item.leadId && byId[item.leadId] ? byId[item.leadId].emp : item.cliente||'') : item[k];
  const fld = ([k,label,type,ph]) => {
    const v=val(k);
    if(type==='textarea') return `<div style="grid-column:1/-1"><label>${label}</label><textarea class="inp" data-f="${k}" rows="2" style="width:100%">${esc(v||'')}</textarea></div>`;
    if(type==='check') return `<div style="grid-column:1/-1"><label class="chk" style="color:var(--text)"><input type="checkbox" data-f="${k}" ${v?'checked':''}> ${label}</label></div>`;
    const t = type==='money' ? 'text' : type==='lead' ? 'text' : type;
    return `<div><label>${label}</label><input data-f="${k}" type="${t}" ${type==='money'?'inputmode="decimal" placeholder="R$ 0,00"':''} ${type==='lead'?'list="leadNames" placeholder="Digite para buscar"':''} ${ph&&type!=='money'?`placeholder="${esc(ph)}"`:''} value="${esc(type==='money'&&v?String(v).replace('.',','):v||'')}"></div>`;
  };
  $('#modalRoot').innerHTML = `<div class="modal" id="modalBg"><div class="dialog" role="dialog" aria-modal="true" style="width:min(640px,100%)">
    <h3>${id?'Editar':'Nova'} ${F.title}</h3>
    <datalist id="leadNames">${leads.map(l=>`<option value="${esc(l.emp)}">`).join('')}</datalist>
    <div class="grid2">${F.fields.map(fld).join('')}
      ${kind==='venda'&&!id?`<div style="grid-column:1/-1"><label class="chk" style="color:var(--text)"><input type="checkbox" id="fMensal" ${preset?.mensal?'checked':''}> Também criar mensalidade de manutenção de <input id="fMensalV" class="inp" style="width:120px;display:inline-block;padding:3px 6px" value="${esc(preset?.mensalValor||st.cfg.valor_manutencao||'')}" placeholder="R$ 0,00"></label></div>`:''}
    </div>
    <div class="row" style="margin-top:6px">
      ${id?`<button class="btn sm danger" id="fDel">Excluir</button>`:''}
      <span style="margin-left:auto"></span><button class="btn" id="fCancel">Cancelar</button><button class="btn acc" id="fSave">Salvar</button>
    </div></div></div>`;
  $('#modalBg').onclick=e=>{ if(e.target.id==='modalBg') closeModal(); };
  $('#fCancel').onclick=closeModal;
  if($('#fDel')) $('#fDel').onclick=()=>{ if(!confirm(`Excluir esta ${F.title}?`)) return; const i=arr.indexOf(item); arr.splice(i,1); save(); closeModal(); afterFin(); toast(`${F.title[0].toUpperCase()+F.title.slice(1)} excluída`,'Desfazer',()=>{ arr.splice(i,0,item); save(); afterFin(); }); };
  $('#fSave').onclick=()=>{
    const out={...item};
    document.querySelectorAll('#modalRoot [data-f]').forEach(inp=>{
      const k=inp.dataset.f, type=F.fields.find(f=>f[0]===k)[2];
      out[k] = type==='check' ? inp.checked : type==='money' ? parseMoney(inp.value) : inp.value.trim();
    });
    if('cliente' in out){ const l=leads.find(x=>norm(x.emp)===norm(out.cliente)); out.leadId=l?l.id:null; }
    if(kind==='despesa' && !out.descricao){ alert('Preencha a descrição.'); return; }
    if(kind!=='despesa' && !out.cliente){ alert('Preencha o cliente.'); return; }
    if(!out.valor){ alert('Preencha o valor.'); return; }
    if(kind==='venda' && !out.data || kind==='mensal' && !out.inicio || kind==='despesa' && !out.data){ alert('Preencha a data.'); return; }
    if(id) Object.assign(item,out); else { out.id=uid(); arr.push(out); }
    if(kind==='venda' && !id && $('#fMensal')?.checked){
      const mv=parseMoney($('#fMensalV').value);
      if(mv) st.fin.mensais.push({id:uid(), leadId:out.leadId, cliente:out.cliente, valor:mv, custo:0, inicio:out.data, fim:''});
    }
    if(out.leadId && kind!=='despesa' && !id){ const l=byId[out.leadId]; log(l, kind==='venda'?`Venda registrada: ${out.servico||'projeto'} · ${brl(out.valor)}`:`Mensalidade: ${brl(out.valor)}/mês`); if(kind==='venda' && l.s.status!=='fechado'){ log(l,'Etapa: '+SL[l.s.status]+' → Fechado'); l.s.status='fechado'; l.s.prox=null; } }
    save(); closeModal(); afterFin(); toast(`${F.title[0].toUpperCase()+F.title.slice(1)} salva`);
  };
  setTimeout(()=>$('#modalRoot [data-f]')?.focus(),0);
}
function afterFin(){ refresh(); if(!$('#v-vendas').classList.contains('hidden')) renderVendas(); if(current) openLead(current,true); }
function salesOf(id){ return st.fin.vendas.filter(v=>v.leadId===id); }
function promptSale(l){
  if(salesOf(l.id).length) return;
  openFinForm('venda', null, {leadId:l.id, cliente:l.emp, servico:'Site', valor:parseMoney(l.s.v.valor_site||st.cfg.valor_site), data:today(),
    mensal:!!(l.s.v.valor_manutencao||st.cfg.valor_manutencao), mensalValor:l.s.v.valor_manutencao||st.cfg.valor_manutencao||''});
}
function exportFinCSV(){
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"', n=v=>String(v||0).replace('.',',');
  const lines=[['Tipo','Data/Início','Fim','Cliente/Descrição','Serviço/Categoria','Valor','Custo','Recebido','Forma','Observações'].map(q).join(';')];
  for(const v of st.fin.vendas) lines.push(['Venda',br(v.data),'',v.cliente,v.servico,n(v.valor),n(v.custo),n(v.recebido),v.forma,v.obs].map(q).join(';'));
  for(const c of st.fin.mensais) lines.push(['Mensalidade',br(c.inicio),br(c.fim),c.cliente,'Manutenção',n(c.valor),n(c.custo),'','',c.obs].map(q).join(';'));
  for(const d of st.fin.despesas) lines.push([d.mensal?'Despesa mensal':'Despesa',br(d.data),br(d.fim),d.descricao,d.categoria,n(d.valor),'','','',''].map(q).join(';'));
  download(`financeiro-kodaforge-${today()}.csv`, '﻿'+lines.join('\r\n'), 'text/csv');
}
try{ finPeriod=sessionStorage.getItem(KEY+'-per')||'mes'; }catch(e){}
window.addEventListener('resize',()=>{ if(!$('#v-vendas').classList.contains('hidden') && !finTable) renderVendas(); });

/* ---------- navegação ---------- */
const VIEWS=['lista','funil','hoje','vendas','modelos','config'];
function show(v){
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  VIEWS.forEach(x=>$('#v-'+x).classList.toggle('hidden',x!==v));
  if(v==='funil') renderFunil(); if(v==='hoje') renderHoje(); if(v==='modelos') renderModelos(); if(v==='vendas') renderVendas(); if(v==='config') renderCfg();
  try{ sessionStorage.setItem(KEY+'-tab',v); }catch(e){}
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>show(b.dataset.v));
function refresh(){
  renderStats(); renderList();
  if(!$('#v-funil').classList.contains('hidden')) renderFunil();
  if(!$('#v-hoje').classList.contains('hidden')) renderHoje();
}
window.addEventListener('storage',e=>{ if(e.key===KEY){ st=load(); refresh(); } });

/* ---------- extensão: ponte com o WhatsApp Web ---------- */
// wa.info = conversa aberta no WhatsApp Web (enviada pelo wa.js); wa.leadId = lead dessa conversa
const wa = {tabId:null, info:null, chats:[], leadId:null, lastTitle:null};
const byPhone8 = new Map(leads.filter(l=>phone(l)).map(l=>[phone(l).slice(-8), l.id]));
function matchChat(title, extra){
  if(!title) return null;
  const link = (st.waLinks||{})[title];
  if(link && byId[link]) return link;
  for(const txt of [title, extra||'']){
    for(const m of txt.match(/\+?\d[\d\s().-]{8,}\d/g)||[]){
      const d=m.replace(/\D/g,''); if(d.length>=10 && byPhone8.has(d.slice(-8))) return byPhone8.get(d.slice(-8));
    }
  }
  const nt=norm(title).replace(/[^a-z0-9 ]/g,'').trim();
  if(nt.length<4) return null;
  const exact=leads.filter(l=>norm(l.emp)===nt); if(exact.length===1) return exact[0].id;
  if(nt.length>=6){ const part=leads.filter(l=>{ const e=norm(l.emp); return e.includes(nt)||nt.includes(e); }); if(part.length===1) return part[0].id; }
  return null;
}
async function waTab(){
  const tabs = await chrome.tabs.query({url:'https://web.whatsapp.com/*'});
  return tabs.find(t=>t.id===wa.tabId) || tabs.find(t=>t.active) || tabs[0] || null;
}
async function extOpenWA(l,text){
  const url=`https://web.whatsapp.com/send?phone=${phone(l)}&text=${encodeURIComponent(text)}`;
  const tab=await waTab();
  if(wa.leadId===l.id && tab){
    try{
      const r=await chrome.tabs.sendMessage(tab.id,{type:'koda-insert', text});
      if(r?.ok){ if(!PANEL){ chrome.tabs.update(tab.id,{active:true}); chrome.windows.update(tab.windowId,{focused:true}); } return; }
    }catch(e){}
    copyText(text); toast('Não consegui colocar o texto na conversa. Ele foi copiado: cole com Ctrl+V.'); return;
  }
  if(!phone(l)){ copyText(text); toast('Lead sem telefone. Texto copiado.'); return; }
  if(!tab){ chrome.tabs.create({url}); return; }
  // abre a conversa do lead na própria aba do WhatsApp Web (a página recarrega)
  await chrome.tabs.update(tab.id,{url, active:true});
  chrome.windows.update(tab.windowId,{focused:true});
}
function onWaUpdate(msg){
  wa.info=msg.info||null; wa.chats=msg.chats||[];
  const title = wa.info?.open ? wa.info.title : null;
  wa.leadId = title ? matchChat(title, wa.info.headerText) : null;
  if(!PANEL){ if(current && current===wa.leadId) openLead(current,true); return; }
  const changed = title!==wa.lastTitle; wa.lastTitle=title;
  if(changed && wa.leadId) openLead(wa.leadId);
  else if(changed && current){ current=null; $('#dr').classList.remove('on'); renderPanelHome(); }
  else if(current) openLead(current,true);
  else renderPanelHome();
  renderPanelBar();
}
function linkChat(title,id){
  st.waLinks ||= {}; if(id) st.waLinks[title]=id; else delete st.waLinks[title];
  save(); wa.lastTitle=null; onWaUpdate({info:wa.info, chats:wa.chats});
  toast(id ? 'Conversa vinculada a '+byId[id].emp : 'Conversa desvinculada');
}
function renderPanelBar(){
  const t=wa.info?.open?wa.info.title:'', l=wa.leadId?byId[wa.leadId]:null, linked=t && (st.waLinks||{})[t];
  $('#panelBar').innerHTML = `<button class="btn xs" id="pHome" title="Início">⌂</button>
    <div class="chat">${!wa.tabId?'WhatsApp Web não está aberto':t?`💬 <b>${esc(t)}</b> · ${l?esc(l.emp):'não é um lead'}`:'Nenhuma conversa aberta'}</div>
    ${linked?'<button class="btn xs" id="pUnlink" title="Desvincular esta conversa do lead">Desvincular</button>':''}
    <button class="btn xs" id="pFull" title="Abrir o CRM completo numa aba">CRM ↗</button>`;
  $('#pHome').onclick=()=>{ current=null; $('#dr').classList.remove('on'); renderPanelHome(); };
  $('#pFull').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('crm.html')});
  if($('#pUnlink')) $('#pUnlink').onclick=()=>linkChat(t,null);
}
function renderPanelHome(){
  if(!PANEL) return;
  $('#panelHome').classList.remove('hidden'); renderPanelBar();
  const t=wa.info?.open?wa.info.title:'';
  const item = (l,right) => `<div class="li" data-id="${l.id}"><div><b>${esc(l.emp)}</b><small>${esc(l.cat)} · ${SL[l.s.status]}</small></div>${right||''}</div>`;
  const unreadIds = [...new Set(wa.chats.filter(c=>c.unread).map(c=>matchChat(c.title)).filter(Boolean))];
  const unread = unreadIds.map(id=>byId[id]);
  const due = leads.filter(isDue).sort((a,b)=>(a.s.prox>b.s.prox?1:-1)).slice(0,10);
  $('#panelHome').innerHTML = `
    ${!wa.tabId?`<div class="box"><h3>Abra o WhatsApp Web</h3><p class="sub">O painel acompanha a conversa aberta e mostra o lead certo.</p><button class="btn pri" id="pOpenWA">Abrir WhatsApp Web</button></div>`:''}
    ${t && !wa.leadId?`<div class="box"><h3>Vincular “${esc(t)}” a um lead</h3><p class="sub">Não reconheci esta conversa pelo número nem pelo nome. Busque a empresa:</p>
      <input class="inp" id="pLinkQ" placeholder="Nome da empresa…" autocomplete="off" style="width:100%"><div id="pLinkR"></div></div>`:''}
    <div class="box"><h3>Novas mensagens de leads</h3><p class="sub">${unread.length?'Conversas não lidas que são de leads':'Nenhuma conversa não lida de lead na lista do WhatsApp.'}</p>
      ${unread.map(l=>item(l, ['respondeu','negociando','fechado'].includes(l.s.status)?'':`<button class="btn xs" data-resp="${l.id}">Respondeu</button>`)).join('')}</div>
    <div class="box"><h3>Ações para hoje</h3><p class="sub">${due.length?'Leads esperando o próximo passo':'Nada vencido. 👌'}</p>${due.map(l=>item(l,`<span class="due">${br(l.s.prox)}</span>`)).join('')}</div>
    <div class="box"><h3>Buscar lead</h3><input class="inp" id="pQ" placeholder="Empresa, categoria, bairro…" autocomplete="off" style="width:100%"><div id="pR"></div></div>`;
  const bindItems = root => root.querySelectorAll('.li').forEach(e=>e.onclick=ev=>{ if(ev.target.dataset.resp) return; openLead(+e.dataset.id); });
  bindItems($('#panelHome'));
  $('#panelHome').querySelectorAll('[data-resp]').forEach(b=>b.onclick=()=>{ setStatus(byId[b.dataset.resp],'respondeu'); renderPanelHome(); });
  if($('#pOpenWA')) $('#pOpenWA').onclick=()=>chrome.tabs.create({url:'https://web.whatsapp.com/'});
  const search = q => { const n=norm(q.trim()); return n.length<2?[]:leads.filter(l=>norm([l.emp,l.cat,l.bairro,l.s.contato].join(' ')).includes(n)).slice(0,8); };
  $('#pQ').oninput=e=>{ $('#pR').innerHTML=search(e.target.value).map(l=>item(l)).join(''); bindItems($('#pR')); };
  if($('#pLinkQ')) $('#pLinkQ').oninput=e=>{
    $('#pLinkR').innerHTML=search(e.target.value).map(l=>item(l,'<button class="btn xs">Vincular</button>')).join('');
    $('#pLinkR').querySelectorAll('.li').forEach(x=>x.onclick=()=>linkChat(t,+x.dataset.id));
  };
}
async function initExt(){
  chrome.runtime.onMessage.addListener((msg,sender)=>{ if(msg?.type==='koda-wa'){ wa.tabId=sender.tab?.id||wa.tabId; onWaUpdate(msg); } });
  chrome.tabs.onRemoved.addListener(id=>{ if(id===wa.tabId){ wa.tabId=null; onWaUpdate({}); } });
  const tab=await waTab();
  if(tab){ wa.tabId=tab.id; try{ const r=await chrome.tabs.sendMessage(tab.id,{type:'koda-get'}); if(r) return onWaUpdate(r); }catch(e){} }
  onWaUpdate({});
}

housekeeping();
renderStats(); renderList();
if(PANEL){ document.body.classList.add('panel'); $('#panelBar').classList.remove('hidden'); renderPanelHome(); }
else { let startTab='hoje'; try{ startTab=sessionStorage.getItem(KEY+'-tab')||'hoje'; }catch(e){} show(VIEWS.includes(startTab)?startTab:'hoje'); }
if(EXT) initExt();
