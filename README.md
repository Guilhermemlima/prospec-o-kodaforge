# CRM de prospecção · Koda Forge

CRM em um único arquivo HTML com os 340 leads de Guarapuava (fonte: Google Maps). Publicado na Vercel a partir do `index.html`.

## Como usar
Clique numa empresa → escolha o modelo de mensagem → "Enviar no WhatsApp" abre a conversa com o texto pronto; é só apertar Enter.
A etapa do funil, o histórico (qual modelo foi enviado) e a próxima ação são atualizados automaticamente.

- **Modelos de mensagem:** vários modelos por etapa (1ª mensagem, follow-ups, última, respondeu, proposta/reunião), com copiar, editar, duplicar, excluir e reordenar.
- **Variáveis:** `{{empresa}} {{contato}} {{cidade}} {{segmento}} {{site}} {{nome_vendedor}} {{valor_site}} {{valor_manutencao}} {{prazo}} {{data}} {{horario}} {{data_horario_1}} {{data_horario_2}} {{mensagem_personalizada}}`. Campos vazios são retirados da mensagem sem quebrar o texto.
- **Vendas e lucro:** faturamento, custos, lucro, margem, valores a receber, mensalidades (receita recorrente) e despesas, com gráfico mensal. Ao marcar um lead como "Fechado", o CRM abre o registro da venda.
- O progresso fica salvo no navegador (localStorage). Faça backup em "Ajustes".

## Extensão do Chrome (CRM ao lado do WhatsApp Web)
A pasta `extension/` é uma extensão que abre o CRM num painel lateral ao lado do WhatsApp Web.

Usa a biblioteca aberta [WPPConnect wa-js](https://github.com/wppconnect-team/wa-js) (Apache-2.0) só para abrir conversas e preencher o texto, com estatísticas e serviços externos desligados (`extension/wa-config.js`). Nada é enviado automaticamente.

**Instalar:** `chrome://extensions` → ligue o **Modo do desenvolvedor** → **Carregar sem compactação** → selecione a pasta `extension`. Fixe o ícone "K" na barra.

**Usar:** abra o WhatsApp Web e clique no ícone "K".
- Ao abrir uma conversa, o painel mostra o lead (pelo número ou pelo nome da empresa). Se não reconhecer, dá para vincular a conversa a um lead.
- "Enviar" abre a conversa **dentro do WhatsApp Web já aberto, sem recarregar a página**, e põe o modelo na caixa de mensagem; você confere e aperta Enter.
- **Fila de envio** (início do painel): follow-ups do dia e depois leads novos por prioridade. Enviou, o próximo já aparece.
- Números sem WhatsApp são detectados e marcados (ligue para pedir o WhatsApp do responsável).
- O painel avisa quando o lead já te mandou mensagem e lista conversas não lidas de leads, com botão para marcar "Respondeu".
- "CRM ↗" abre o CRM completo numa aba, com os mesmos dados do painel.

Os dados da extensão ficam separados do site da Vercel. Para levar o progresso: no site, **Ajustes → Baixar backup**; na extensão, **CRM ↗ → Ajustes → Restaurar backup**.

## Editar o código
O código fica em `src/crm.template.html` e os leads em `src/leads.json`. Depois de editar, gere o `index.html` e os arquivos da extensão:

```bash
python build.py
```
