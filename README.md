# Print Minas — Gestão de Frota

## 📁 Estrutura de Arquivos

```
PROJETO/
├── index.html          # Estrutura HTML (limpa)
├── style.css           # Estilos CSS
├── js/
│   ├── db.js           # Banco de dados (Supabase + localStorage fallback)
│   └── app.js          # Lógica da aplicação
└── README.md           # Documentação
```

## 🗄️ Detalhes dos Arquivos

### **js/db.js**
- **Banco de Dados**: Usa Supabase para persistência remota quando configurado, com fallback para localStorage
- Funções: DB.trips(), DB.drivers(), DB.incidents()
- Método: DB.save(key, data) persiste dados localmente e sincroniza com Supabase
- Funções utilitárias: genId(), fmt(), fmtDate(), fmtTime(), initials(), calcKm()

### **js/app.js**
- **Lógica da Aplicação**: todas as funções de interface
- Renderização de abas: renderViagem(), renderRegistros(), renderMotoristas(), renderOcorrencias(), renderRelatorio(), renderQR()
- Gerenciamento de modais, alertas e eventos
- Impressão de relatórios

O aplicativo usa Supabase para persistência remota quando configurado. Se o Supabase não estiver configurado, os dados são salvos no **localStorage** do navegador:

**Dados ficam salvos no navegador indefinidamente**, mas:
- Para sincronizar entre dispositivos, configure o Supabase no **js/db.js** com sua URL e chave pública.
- Se limpar histórico/cache, os dados locais serão apagados.
- Se usar Supabase, os dados ficarão disponíveis em qualquer dispositivo com a mesma configuração.
- ⚠️ Dados não sincronizam entre dispositivos/navegadores, a menos que o Supabase esteja configurado corretamente.

---

## 💾 Banco de Dados

O aplicativo usa Supabase para persistência remota quando configurado. Se o Supabase não estiver configurado, os dados são salvos no **localStorage** do navegador.

Tabelas / chaves de armazenamento:
- **pm_trips**: Viagens registradas
- **pm_drivers**: Motoristas cadastrados
- **pm_incidents**: Ocorrências/multas

**Notas importantes**:
- Configure `SUPABASE_URL` e `SUPABASE_ANON_KEY` em `js/db.js` para habilitar o Supabase.
- Se limpar histórico/cache, os dados locais serão apagados.
- Se usar Supabase, os dados poderão ser sincronizados entre dispositivos com a mesma configuração.

---

## 🌐 Hospedagem no Netlify

### **Como Fazer Deploy**

**Opção 1: Direto pelo GitHub (Recomendado)**
1. Coloque os arquivos em um repositório GitHub
2. Vá para [netlify.com](https://netlify.com)
3. Clique em "New site from Git"
4. Selecione seu repositório
5. Configure:
   - Build command: (deixe em branco)
   - Publish directory: `.` ou `./`
6. Clique em Deploy

### Deploy com Supabase (Netlify)

1. No painel do Netlify, abra seu site > Site settings > Build & deploy > Environment.
2. Adicione as variáveis de ambiente:
   - `SUPABASE_URL` = sua URL Supabase (ex: https://...supabase.co)
   - `SUPABASE_ANON_KEY` = sua chave pública (anon)
3. Em Build settings, configure:
   - Build command: `npm run build`
   - Publish directory: `.`
   - Base directory: deixe em branco
   - Functions directory: deixe em branco
4. Garanta que o arquivo `scripts/generate-config.js` exista (o repositório já contém um gerador que cria `js/config.js`).
5. Deploy: Netlify executará o script para gravar `js/config.js` com as variáveis e publicará o site.

Importante: não comite chaves privadas no repositório. Use variáveis de ambiente no Netlify.

**Opção 2: Upload Manual**
1. Compacte a pasta (ZIP)
2. Vá para [netlify.com](https://netlify.com)
3. Arraste a pasta na área "Deploy manually"

**Opção 3: Netlify CLI**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=.
```

### **Resultado**
- Seu site estará online em: `https://seu-site-aleatório.netlify.app`
- URL customizada: Pode configurar no painel do Netlify

---

## 🔒 Segurança & Considerações

- ✅ Funciona completamente offline
- ✅ Sem servidor necessário
- ⚠️ Dados locais = não acessa servidor
- ⚠️ Para múltiplos usuários/dispositivos, seria necessário backend (Firebase, etc)

---

## 📱 Funcionalidades

- ✅ Nova Viagem (saída/chegada com fotos)
- ✅ Registros (filtro por data e motorista)
- ✅ Cadastro de Motoristas
- ✅ Ocorrências (multas, acidentes)
- ✅ Relatório mensal com assinatura
- ✅ QR Code para escanear
- ✅ Impressão de documentos
- ✅ Responsivo para mobile

---

## 🛠️ Manutenção

Para adicionar funcionalidades:
1. Adicione dados em **js/db.js** (estrutura)
2. Adicione função de renderização em **js/app.js**
3. Adicione estilo em **style.css**

Tudo é **JavaScript puro**, sem dependências (exceto QRCode CDN).
