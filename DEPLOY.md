# InnovaQuiz - Deploy Guide 🚀

O InnovaQuiz utiliza **WebSockets (Socket.IO)**, por isso não é compatível com ambientes Serverless puros (como Vercel/Netlify Functions). Recomendamos plataformas que suportam processos Node.js persistentes.

## 🚂 Opção 1: Railway.app (Recomendado)
A maneira mais fácil e rápida.
1. Crie uma conta no [Railway.app](https://railway.app/).
2. Clique em **New Project** > **Deploy from GitHub repo**.
3. Selecione o seu repositório do InnovaQuiz.
4. O Railway detectará o `Dockerfile` automaticamente e fará o deploy.
5. Em "Settings", gere um domínio público.

## ☁️ Opção 2: Render.com
1. No [Render](https://render.com/), crie um novo **Web Service**.
2. Conecte seu repositório.
3. Use as configurações:
   - **Runtime**: `Docker`
   - **Port**: `3000`
4. Clique em Deploy.

## 🐳 Rodando localmente via Docker
```bash
docker build -t innovaquiz .
docker run -p 3000:3000 innovaquiz
```

---
*Dica: Certifique-se de que a variável de ambiente `PORT` está sendo respeitada (o servidor já faz isso).*
