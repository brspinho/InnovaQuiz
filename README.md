# InnovaQuiz 🚀

O **InnovaQuiz** é uma plataforma de quiz em tempo real de alto desempenho, inspirada no Kahoot, focada em eventos corporativos, acadêmicos e treinamentos que exigem uma experiência premium e suporte para muitos jogadores simultâneos.

## 🎯 Proposta

A proposta do InnovaQuiz é oferecer uma ferramenta de engajamento dinâmico onde um **Host** (anfitrião) pode criar e gerenciar competições de conhecimento em tempo real, enquanto até **100 Jogadores** participam simultaneamente através de seus dispositivos móveis ou computadores.

O sistema destaca-se pela sua **velocidade**, **estética refinada** (Azul Escuro e Amarelo Dourado) e suporte a **múltiplas respostas corretas**, permitindo perguntas mais complexas e desafiadoras.

---

## 🛠️ Comandos do Terminal

Siga estes passos para rodar o projeto localmente ou em um evento:

### 1. Instalação (Primeira vez)

Certifique-se de ter o [Node.js](https://nodejs.org/) instalado. Na pasta raiz do projeto, execute:

```bash
npm run install-all
```

_Este comando instalará as dependências da raiz e do servidor automaticamente._

### 2. Iniciar o Servidor

Para colocar o jogo no ar:

```bash
npm start
```

_O servidor estará acessível em `http://localhost:3000`._

### 3. Abrir para o Mundo (Link Externo)

Se você for realizar um evento e precisar que os jogadores acessem de fora da sua rede, rode o seguinte comando em um segundo terminal:

```bash
npm run tunnel
```

_Isso gerará o link fixo do Ngrok que configuramos para você._

---

## ✨ Funcionalidades Principais

- **⚡ Tempo Real**: Comunicação instantânea via Socket.IO.
- **✅ Múltiplas Respostas**: Suporte para perguntas com mais de uma opção correta.
- **🏆 Podium Premium**: Visualização 3D dos 3 melhores colocados com ranking completo.
- **⏱️ Pontuação por Velocidade**: Quanto mais rápido responder, mais pontos ganha.
- **📂 Quizzes Persistentes**: Modelos de quiz salvos em JSON (`server/quizzes.json`).
- **📱 Responsivo**: Interface adaptada para smartphones e tablets.

## 📁 Estrutura do Projeto

- `client/`: Todo o código da interface (HTML, CSS, JS).
- `server/`: Lógica do servidor, gerenciamento de salas e perguntas.
- `package.json`: Atalhos e dependências do projeto.
- `DEPLOY.md`: Guia detalhado para hospedagem definitiva (Railway/Render).

---

_Desenvolvido para o Innovation Hub - UFS_
