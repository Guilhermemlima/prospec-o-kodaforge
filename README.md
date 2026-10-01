# CRM de prospecção · Koda Forge

CRM em um único arquivo HTML com os 340 leads de Guarapuava (fonte: Google Maps). Publicado na Vercel a partir do `index.html`.

## Como usar
Clique numa empresa → escolha o modelo de mensagem → "Enviar no WhatsApp" abre a conversa com o texto pronto; é só apertar Enter.
A etapa do funil, o histórico (qual modelo foi enviado) e a próxima ação são atualizados automaticamente.

- **Modelos de mensagem:** vários modelos por etapa (1ª mensagem, follow-ups, última, respondeu, proposta/reunião), com copiar, editar, duplicar, excluir e reordenar.
- **Variáveis:** `{{empresa}} {{contato}} {{cidade}} {{segmento}} {{site}} {{nome_vendedor}} {{valor_site}} {{valor_manutencao}} {{prazo}} {{data}} {{horario}} {{data_horario_1}} {{data_horario_2}} {{mensagem_personalizada}}`. Campos vazios são retirados da mensagem sem quebrar o texto.
- O progresso fica salvo no navegador (localStorage). Faça backup em "Ajustes".

## Editar o código
O código fica em `src/crm.template.html` e os leads em `src/leads.json`. Depois de editar, gere o `index.html`:

```bash
python build.py
```
