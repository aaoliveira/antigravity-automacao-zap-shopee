# Contratos Oficiais da Evolution API v2 (EVOLUTION_API_CONTRACTS)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão da API Avaliada:** Evolution API v2.x  
> **Provedor Homologado:** `WHATSAPP-BAILEYS`  
> **Status:** Verificado e Homologado  
> **Data de Verificação:** 2026-11-10 (`evoapicloud/evolution-api:v2.3.7`)  
> **Fonte Oficial:** [Evolution API Official Documentation](https://docs.evolutionfoundation.com.br/evolution-api)

---

## 1. Padrões de Conectividade e Autenticação

- **Protocolo / Transporte:** HTTPS / REST com JSON
- **Headers Obrigatórios:**
  - `Content-Type: application/json` (ou `multipart/form-data` para envio de binários locais)
  - `apikey: <CHAVE_DE_ACESSO>` (Global API Key para rotas `/instance/*` e Token da Instância ou Global para rotas `/message/*` e `/group/*`).
- **URL Base:** Definida dinamicamente por tenant (ex: `https://meu-servidor-evolution.com`).

---

## 2. Endpoints do Ciclo de Vida de Instâncias

### 2.1 Criar Instância (`POST /instance/create`)
- **Descrição:** Registra uma nova instância do WhatsApp no servidor Evolution.
- **Headers:** `apikey: <GLOBAL_API_KEY>`, `Content-Type: application/json`
- **Payload (Request Body):**
```json
{
  "instanceName": "instancia-afiliado-01",
  "qrcode": true,
  "integration": "WHATSAPP-BAILEYS"
}
```
- **Resposta de Sucesso (`HTTP 201 Created`):**
```json
{
  "instance": {
    "instanceName": "instancia-afiliado-01",
    "status": "created",
    "integration": "WHATSAPP-BAILEYS"
  },
  "hash": {
    "apikey": "instance-token-generated-abc"
  },
  "qrcode": {
    "pairingCode": null,
    "code": "2@b...base64...",
    "base64": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

---

### 2.2 Conectar Instância e Obter QR Code (`GET /instance/connect/{instanceName}`)
- **Descrição:** Solicita o QR Code de pareamento atualizado para leitura no WhatsApp celular.
- **Headers:** `apikey: <GLOBAL_API_KEY>`
- **Resposta de Sucesso (`HTTP 200 OK`):**
```json
{
  "pairingCode": null,
  "code": "2@c...code...",
  "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

---

### 2.3 Consultar Estado da Conexão (`GET /instance/connectionState/{instanceName}`)
- **Descrição:** Retorna o status de conexão da instância com a rede do WhatsApp.
- **Headers:** `apikey: <GLOBAL_API_KEY>`
- **Resposta de Sucesso (`HTTP 200 OK`):**
```json
{
  "instance": {
    "instanceName": "instancia-afiliado-01",
    "state": "open"
  }
}
```
- **Estados Possíveis:**
  - `open`: Instância conectada e pronta para envio.
  - `close`: Instância desconectada ou deslogada.
  - `connecting`: Instância restabelecendo sessão.

---

### 2.4 Logout da Instância (`DELETE /instance/logout/{instanceName}`)
- **Descrição:** Desconecta o WhatsApp da instância sem deletar as configurações do banco.
- **Headers:** `apikey: <GLOBAL_API_KEY>`
- **Resposta de Sucesso (`HTTP 200 OK`):**
```json
{
  "status": "SUCCESS",
  "error": false,
  "response": {
    "message": "Instance logged out"
  }
}
```

---

### 2.5 Excluir Instância (`DELETE /instance/delete/{instanceName}`)
- **Descrição:** Remove completamente a instância do servidor Evolution.
- **Headers:** `apikey: <GLOBAL_API_KEY>`
- **Resposta de Sucesso (`HTTP 200 OK`):**
```json
{
  "status": "SUCCESS",
  "error": false,
  "response": {
    "message": "Instance deleted"
  }
}
```

---

## 3. Endpoints de Grupos

### 3.1 Listar Todos os Grupos (`GET /group/fetchAllGroups/{instanceName}`)
- **Descrição:** Recupera a lista de grupos de WhatsApp nos quais o número conectado participa.
- **Parâmetros de Query:** `?getParticipants=false` (otimização de tráfego, dispensando carregar a lista de milhares de membros).
- **Headers:** `apikey: <API_KEY>`
- **Resposta de Sucesso (`HTTP 200 OK`):**
```json
[
  {
    "id": "1203630192837465@g.us",
    "subject": "Ofertas & Achadinhos Casa VIP",
    "subjectOwner": "5511999999999@s.whatsapp.net",
    "subjectTime": 1700000000,
    "size": 240,
    "creation": 1690000000,
    "owner": "5511999999999@s.whatsapp.net",
    "desc": "Grupo oficial de descontos Shopee",
    "restrict": true,
    "announce": true
  }
]
```
- **Campos Críticos Persistidos no SaaS:**
  - `id`: JID original do grupo (ex: `1203630192837465@g.us`).
  - `subject`: Nome visível do grupo.
  - `size`: Quantidade atual de participantes no grupo.

### 3.2 Consultar Informações e Lotação de Grupo (`GET /group/findGroupInfos/{instanceName}`)
- **Descrição:** Retorna metadados atualizados de um grupo específico, incluindo contagem atual de membros (`size`), usada para validar capacidade máxima antes do redirecionamento em links permanentes.
- **Parâmetros de Query:** `?groupJid=1203630192837465@g.us`
- **Headers:** `apikey: <API_KEY>`
- **Resposta de Sucesso (`HTTP 200 OK`):**
```json
{
  "id": "1203630192837465@g.us",
  "subject": "Ofertas & Achadinhos Casa VIP",
  "size": 245,
  "creation": 1690000000
}
```

### 3.3 Obter Código/Link Oficial de Convite (`GET /group/inviteCode/{instanceName}`)
- **Descrição:** Obtém o código de convite oficial e a URL `https://chat.whatsapp.com/...` de um grupo (verificado diretamente no código compilado da imagem `evoapicloud/evolution-api:v2.3.7`).
- **Pré-requisito do WhatsApp:** O número conectado à instância precisa ter permissão de **administrador** do grupo. Caso contrário, a Evolution API retorna erro (`"No invite code"`), devendo o link oficial ser informado manualmente pelo operador.
- **Parâmetros de Query:** `?groupJid=1203630192837465@g.us`
- **Headers:** `apikey: <API_KEY>`
- **Resposta de Sucesso (`HTTP 200 OK`):**
```json
{
  "inviteUrl": "https://chat.whatsapp.com/CodigoDeConviteExemplo",
  "inviteCode": "CodigoDeConviteExemplo"
}
```

---

## 4. Endpoints de Mensagens e Publicação

### 4.1 Envio de Mídia com Legenda (`POST /message/sendMedia/{instanceName}`)
- **Descrição:** Envia imagem do produto com legenda contendo título, preço e link curto de afiliado.
- **Headers:** `apikey: <API_KEY>`, `Content-Type: application/json`
- **Payload Oficial Homologado (JSON):**
```json
{
  "number": "1203630192837465@g.us",
  "mediatype": "image",
  "mimetype": "image/jpeg",
  "caption": "🔥 *Garrafa Térmica Inox 500ml com Sensor Digital*\n\n💰 *Por apenas:* R$ 29,90\n\n👉 *Compre com desconto aqui:* https://shope.ee/m9XyzAbc",
  "media": "https://down-br.img.susercontent.com/file/br-11134207-7r98o-lx192837",
  "fileName": "oferta-shopee-item123.jpg",
  "delay": 1200
}
```
> *Nota verificada em 2026-11-11 via documentação oficial (`https://docs.evolutionfoundation.com.br/evolution-api`):* o campo opcional `delay` (inteiro em milissegundos) é aceito oficialmente em `POST /message/sendMedia/{instanceName}` para simular comportamento humano antes do envio da mídia.
- **Resposta de Sucesso (`HTTP 201 Created`):**
```json
{
  "key": {
    "remoteJid": "1203630192837465@g.us",
    "fromMe": true,
    "id": "BAE591823719283A"
  },
  "message": {
    "imageMessage": {
      "url": "https://...",
      "mimetype": "image/jpeg",
      "caption": "🔥 *Garrafa Térmica...",
      "fileLength": "84920"
    }
  },
  "messageTimestamp": "1731150000",
  "status": "PENDING"
}
```

### 4.2 Envio de Texto Simples (`POST /message/sendText/{instanceName}`)
- **Descrição:** Envia mensagem de texto simples para um contato ou grupo (utilizado para alertas de sistema ou fallback de texto).
- **Headers:** `apikey: <API_KEY>`, `Content-Type: application/json`
- **Payload (Request Body):**
```json
{
  "number": "1203630192837465@g.us",
  "text": "🔥 Oferta Relâmpago Shopee: confira os achadinhos de hoje!",
  "delay": 1200
}
```
- **Resposta de Sucesso (`HTTP 201 Created`):**
```json
{
  "key": {
    "remoteJid": "1203630192837465@g.us",
    "fromMe": true,
    "id": "BAE591823719283B"
  },
  "message": {
    "conversation": "🔥 Oferta Relâmpago Shopee..."
  },
  "messageTimestamp": "1731150005",
  "status": "PENDING"
}
```

---

## 5. Webhooks e Eventos da Evolution API

A Evolution API permite configurar o encaminhamento de eventos via webhook HTTP POST para o backend do SaaS, reduzindo a necessidade de polling ativo para o status das instâncias.

### 5.1 Configuração do Webhook na Instância (`POST /webhook/set/{instanceName}`)
- **Payload de Configuração:**
```json
{
  "enabled": true,
  "url": "https://api.meusaas.com/api/webhooks/evolution",
  "headers": {
    "x-webhook-secret": "token-secreto-do-tenant"
  },
  "byEvents": false,
  "base64": false,
  "events": [
    "QRCODE_UPDATED",
    "CONNECTION_UPDATE"
  ]
}
```

### 5.2 Evento: Atualização de Estado de Conexão (`CONNECTION_UPDATE`)
- **Payload Recebido:**
```json
{
  "event": "connection.update",
  "instance": "instancia-afiliado-01",
  "data": {
    "state": "open",
    "statusReason": 200
  },
  "destination": "https://api.meusaas.com/api/webhooks/evolution",
  "date_time": "2026-11-09T10:30:00.000Z"
}
```
- **Ação no SaaS:** Atualiza o campo `status` da `WhatsAppInstance` para `CONNECTED` (quando `open`) ou `DISCONNECTED` (quando `close`).

### 5.3 Evento: Atualização do QR Code (`QRCODE_UPDATED`)
- **Payload Recebido:**
```json
{
  "event": "qrcode.updated",
  "instance": "instancia-afiliado-01",
  "data": {
    "qrcode": {
      "base64": "data:image/png;base64,iVBORw0KGgo...",
      "code": "2@b...pairing..."
    }
  },
  "date_time": "2026-11-09T10:30:00.000Z"
}
```
- **Ação no SaaS:** Emite evento de WebSocket / SSE para o frontend atualizar a imagem do QR Code na tela do usuário em tempo real.

---

## 6. Regras de Resiliência e Códigos de Retorno

| Código HTTP | Significado | Causa | Conduta no SaaS |
| :---: | :--- | :--- | :--- |
| `200 / 201` | Sucesso | Mensagem despachada para o WhatsApp. | Registrar `SUCCESS` na publicação com o `id` da mensagem. |
| `400` | Bad Request | Formato do JID inválido ou imagem inacessível. | Registrar `FAILED` no grupo específico e avançar para o próximo grupo. |
| `401 / 403` | Unauthorized | API Key incorreta ou revogada. | Abortar execução e marcar servidor/instância com alerta de credencial. |
| `404` | Not Found | Instância não existe no servidor Evolution. | Marcar instância local como `ORPHAN` / `DESCONECTADA`. |
| `500` | Internal Error | Instância offline ou erro no Baileys. | Verificar `connectionState`. Se desconectado, abortar execuções pendentes. |
