# Manual de Instalação e Uso — Extensão Chrome ShopeeZap (Mercado Livre Afiliados)

> **Versão da Extensão:** `1.0.0` (Manifest V3)  
> **Público:** Operadores e Afiliados ShopeeZap (Alternativa B)  
> **Arquitetura:** Pacote independente em [`extensions/mercadolivre-chrome/`](../../extensions/mercadolivre-chrome/README.md)

---

## 1. Pré-requisitos

- Navegador **Google Chrome** (ou navegador baseado em Chromium, como Edge/Brave) atualizado.
- Acesso autenticado ao painel web **ShopeeZap** com a flag **Alternativa B** ativada (padrão: **Ativa**).
- Conta ativa e autenticada no [Portal de Afiliados do Mercado Livre](https://www.mercadolivre.com.br/l/afiliados-home).

---

## 2. Como Baixar e Instalar a Extensão

### Passo 1: Baixar o pacote pela plataforma
1. Acesse o painel **ShopeeZap** e clique em **Integrações → Mercado Livre** no menu lateral.
2. Na caixa amarela **Conectar automaticamente via Extensão Chrome**, clique em **Baixar Extensão (.zip)**.
3. Salve o arquivo `shopeezap-ml-extensao-v1.0.0.zip` e **extraia (descompacte)** todo o conteúdo em uma pasta permanente no seu computador (por exemplo: `Documentos/shopeezap-ml-extensao`).
   > **Importante:** Não apague essa pasta após instalar, pois o Chrome lê a extensão diretamente dela enquanto instalada em Modo do Desenvolvedor.

### Passo 2: Carregar a extensão no Google Chrome
1. Abra uma nova aba no Google Chrome e digite na barra de endereços:
   ```
   chrome://extensions
   ```
2. No canto superior direito, ative a opção **Modo do desenvolvedor** (*Developer mode*).
3. Clique no botão **Carregar sem compactação** (*Load unpacked*), no canto superior esquerdo.
4. Selecione a pasta extraída onde está o arquivo `manifest.json` (verifique se selecionou a pasta raiz contendo `manifest.json`, `icons/` e `src/`).
5. A extensão **ShopeeZap — Conector Mercado Livre Afiliados** aparecerá ativa na lista.
6. *(Recomendado)* Clique no ícone de **quebra-cabeça (Extensões)** ao lado da barra de endereços e clique no ícone de **alfinete (Fixar)** para manter o ícone do ShopeeZap visível.

---

## 3. Como Parear e Usar Todas as Etapas da Alternativa B

### Etapa A — Gerar e Parear o Token da Extensão
1. No painel web do ShopeeZap (**Mercado Livre**), clique em **Gerar Token da Extensão** e depois em **Copiar Token**.
2. Clique no ícone da extensão **ShopeeZap ML** no Chrome.
3. Na aba **1. Sessão**:
   - **URL da Plataforma ShopeeZap:** informe o endereço onde você acessa o painel (ex.: `http://localhost:5173` em ambiente local ou `https://seu-dominio.com` em produção).
   - **Token da Extensão:** cole o token copiado.
4. Clique em **Validar & Parear**.
   - Caso apareça um pedido de permissão do Chrome para acessar o domínio informado, clique em **Permitir**.

### Etapa B — Sincronizar Cookies (incluindo `HttpOnly`) e Tag de Afiliado
1. No mesmo navegador Chrome, entre em [mercadolivre.com.br](https://www.mercadolivre.com.br) logado com sua conta de afiliado.
2. Abra o popup da extensão **ShopeeZap ML** (aba **1. Sessão**).
3. Informe sua **Tag de Afiliado** (ex.: `azevedoalexandre39`) e clique em **Sincronizar Cookies (incl. HttpOnly) & Tag**.
4. A extensão coleta com segurança os cookies dos domínios do Mercado Livre (incluindo `orguserid`, `ssid`, `orguseridp`, mesmo se `HttpOnly`) e envia para o backend cifrá-los com **AES-256-GCM** e controle de expiração de **14 dias**.

### Etapa C — Capturar Ofertas e Testar Conversão (Aba `2. Oferta / Converter`)
1. Navegue em qualquer produto no **Mercado Livre**.
2. Abra o popup da extensão na aba **2. Oferta / Converter** (ou clique em **Capturar aba ML**).
3. A extensão preenche automaticamente título, preço, vendedor (`sellerName`), imagem e URL original do produto.
4. **Escolha uma das duas opções:**
   - **Com Gateway Homologado configurado:** clique em **Testar / Converter Gateway** para validar e preencher o link curto automaticamente;
   - **Captura Oficial pela Barra de Afiliados:** clique no botão oficial da barra de afiliados do Mercado Livre no anúncio, cole ou deixe a extensão detectar o link `https://meli.la/...` na página e clique em **Enviar Oferta para Fila de Automações**.

### Etapa D — Gateway Parceiro Homologado & Limpeza de Sessão (Aba `3. Gateway & Manual`)
- Na aba **3. Gateway & Manual**, você pode configurar/atualizar a URL HTTPS de um Gateway Parceiro Homologado + API Key (validados contra SSRF no servidor) ou clicar em **Remover Sessão ML** para limpar tag e cookies salvos.

---

## 4. Evolução Independente da Extensão

A extensão foi arquitetada para evoluir separadamente da plataforma principal:

- Todo o código vive de forma autônoma em `extensions/mercadolivre-chrome/`.
- Os contratos de API ficam concentrados em `src/config/contracts.js` e `src/services/api-client.js`.
- Para atualizar a extensão:
  1. Edite apenas `extensions/mercadolivre-chrome/` e incremente `"version"` em `manifest.json`, `package.json` e `src/config/contracts.js`.
  2. Rode os testes isolados da extensão:
     ```bash
     cd extensions/mercadolivre-chrome && npm test
     ```
  3. O servidor ShopeeZap lê automaticamente `extensions/mercadolivre-chrome` (ou o diretório definido em `ML_EXTENSION_DIR`) e disponibiliza a nova versão para download pelo botão **Baixar Extensão (.zip)** — sem precisar alterar ou recompilar o frontend/backend.
  4. No popup de quem usa uma versão anterior, aparecerá o alerta amarelo **"Nova versão disponível na plataforma"**. Para atualizar no Chrome, baixe o novo `.zip`, extraia substituindo a pasta antiga e clique no botão **Atualizar (↻)** em `chrome://extensions`.

---

## 5. Segurança e Revogação

- Caso suspeite de uso indevido ou troque de computador, clique em **Revogar Token** na tela **Mercado Livre** do ShopeeZap. A extensão conectada perderá acesso imediatamente (`HTTP 401 Unauthorized`).
- Para desinstalar, acesse `chrome://extensions` e clique em **Remover**.

---

## 6. Resolução de Problemas Comuns

| Sintoma | Causa Provável | Solução |
| :--- | :--- | :--- |
| **"Nenhum cookie do Mercado Livre encontrado"** | Você não está autenticado no ML neste perfil do Chrome | Faça login em `mercadolivre.com.br` no mesmo perfil onde instalou a extensão e clique em sincronizar novamente. |
| **Erro de permissão / rede ao clicar em "Validar & Parear"** | URL da plataforma incorreta ou permissão de domínio recusada | Verifique a URL (com `http://` ou `https://` sem barra final) e aceite o diálogo de permissão do Chrome. |
| **Erro HTTP 403 ("ml_alternative_b_enabled desabilitada")** | A Alternativa B foi desligada nas Feature Flags do seu tenant | Reative a chave **Alternativa B — Tela Protótipo** no topo da página **Mercado Livre** ou em **Configurações**. |
| **Erro HTTP 401 ("Token revogado ou inválido")** | Token rotacionado/revogado no painel | Clique em **Gerar Token da Extensão** no painel e cole o novo token na aba **1. Sessão** da extensão. |
| **"Validação Local Concluída (Sem Gateway Configurado)" ao testar conversão** | Comportamento esperado sem Gateway Homologado (`BLK-003`) | Gere o link `meli.la` na barra oficial do ML na aba aberta e envie a oferta diretamente para a fila na aba **2. Oferta / Converter**. |
