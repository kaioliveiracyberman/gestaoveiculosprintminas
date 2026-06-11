# Print Minas — Gestão de Frota

## 📁 Estrutura de Arquivos

```
PROJETO/
├── index.html          # Estrutura HTML (limpa)
├── style.css           # Estilos CSS
├── js/
│   ├── db.js           # Banco de dados (localStorage)
│   └── app.js          # Lógica da aplicação
└── README.md           # Documentação
```

## 🗄️ Detalhes dos Arquivos

### **index.html**
- Contém apenas a estrutura HTML
- Links para CSS externo (style.css)
- Scripts carregados no final: db.js e app.js
- Limpo e organizado

### **style.css**
- Todos os estilos CSS da aplicação
- Importações de fontes (Tabler Icons)
- Responsivo para mobile

### **js/db.js**
- **Banco de Dados**: Usa localStorage (armazenamento local do navegador)
- Funções: DB.trips(), DB.drivers(), DB.incidents()
- Método: DB.save(key, data) para persistir dados
- Funções utilitárias: genId(), fmt(), fmtDate(), fmtTime(), initials(), calcKm()

### **js/app.js**
- **Lógica da Aplicação**: todas as funções de interface
- Renderização de abas: renderViagem(), renderRegistros(), renderMotoristas(), renderOcorrencias(), renderRelatorio(), renderQR()
- Gerenciamento de modais, alertas e eventos
- Impressão de relatórios

---

## 💾 Banco de Dados

O aplicativo **não usa servidor**. Todos os dados são salvos no **localStorage** do navegador:

- **pm_trips**: Viagens registradas
- **pm_drivers**: Motoristas cadastrados
- **pm_incidents**: Ocorrências/multas

**Dados ficam salvos no navegador indefinidamente**, mas:
- ⚠️ Se limpar histórico/cache, os dados serão apagados
- ⚠️ Dados não sincronizam entre dispositivos/navegadores

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
