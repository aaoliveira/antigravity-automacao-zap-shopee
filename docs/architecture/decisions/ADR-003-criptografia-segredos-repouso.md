# ADR-003: Criptografia Autenticada de Segredos em Repouso

- **Status:** Aprovado
- **Data:** 2026-11-09
- **Autores:** Security Architect Team

---

## Contexto e Problema
A plataforma precisa armazenar dados de alto valor confidencial: o `AppSecret` da Shopee Affiliate Open API e a `API Key` do servidor Evolution API. Em caso de dump acidental de banco de dados ou acesso indevido à persistência, esses segredos não podem estar em texto claro. Além da confidencialidade, é essencial garantir a integridade (detecção de adulteração).

---

## Alternativas Consideradas
1. **Alternativa A (AES-256-CBC com HMAC externo):** Padrão tradicional, mas requer gerenciamento de duas chaves e suscetível a erros de implementação de padding.
2. **Alternativa B (AES-256-GCM - Galois/Counter Mode - Escolhida):** Criptografia simétrica autenticada nativa do módulo `crypto` do Node.js. Fornece confidencialidade e autenticação de integridade integrada através de uma authentication tag de 16 bytes.
3. **Alternativa C (Hash Unidirecional tipo SHA-256):** Inaplicável, pois o sistema precisa do segredo original descriptografado na memória volátil do worker para assinar as requisições HMAC-SHA256 para a Shopee e chamar a Evolution API.

---

## Decisão Tomada e Justificativa
Adotar a **Alternativa B (AES-256-GCM)** com as seguintes regras inegociáveis:
1. Chave mestra de 256 bits (`ENCRYPTION_MASTER_KEY`) fornecida via variável de ambiente, nunca commitada no Git e nunca persistida no banco.
2. Vetor de inicialização (IV) de 12 bytes gerado com `crypto.randomBytes(12)` aleatoriamente para cada operação de cifragem. Proibido reutilizar IV.
3. Tag de autenticação de 16 bytes armazenada junto ao ciphertext (`iv:ciphertext:tag`).
4. Mascaramento obrigatório para exibição no frontend (`************1234`).
5. Limpeza de variáveis de memória e zero logs contendo o segredo descriptografado.

---

## Consequências
- **Positivas:** Máxima segurança em conformidade com as Regras Permanentes 5 de `AGENTS.md`; proteção contra dumps de banco; integridade criptográfica verificada.
- **Negativas / Mitigações:** Overhead de computação na decifragem antes de cada chamada à Shopee/Evolution, imperceptível para o volume de requisições do MVP.
