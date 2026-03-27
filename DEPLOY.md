# InnovaQuiz - Deploy Guide 🚀

O InnovaQuiz utiliza **WebSockets (Socket.IO)**, por isso não é compatível com ambientes Serverless puros (como Vercel/Netlify Functions). Recomendamos plataformas que suportam processos Node.js persistentes.

## 🚂 Opção 1: Railway.app (Mais Confiável)
A maneira mais recomendada para evitar "travamentos" na hora.
1. Crie uma conta no [Railway.app](https://railway.app/).
2. Conecte seu GitHub e selecione o repositório `InnovaQuiz`.
3. **Vantagem**: Não entra em "modo de espera" (sleep) tão agressivo quanto outros players.

## ☁️ Opção 2: Render.com (Grátis, mas com cuidado)
1. Crie um **Web Service** no [Render](https://render.com/).
2. **⚠️ Atenção**: No plano grátis, o site "dorme" após 15 min de inatividade. Leva cerca de 1 min para acordar. **Na hora do evento, abra o site 2 minutos antes para garantir que esteja ativo.**

## ⚡ Opção 3: Zeabur ou Koyeb
Alternativas excelentes que também detectam o Docker/Node automaticamente.
- [Zeabur](https://zeabur.com/)
- [Koyeb](https://www.koyeb.com/)

---

## 🆘 Plano B: "Profissional" (Ngrok com Link Fixo)
Esta é a melhor opção para garantir que o link não mude durante o evento.

1. No terminal 1, inicie o jogo: `npm start`
2. No terminal 2, abra o túnel com o comando:
   ```bash
   npm run tunnel
   ```
3. O link fixo será: `https://joline-sinlike-herbaceously.ngrok-free.dev`

*Dica: Você pode encurtar este link usando bit.ly para facilitar se os jogadores precisarem digitar manualmente.*

## 🆘 Plano C: "Emergência" (Link Aleatório)
Se o link fixo por algum motivo falhar, você pode usar o Localtunnel:
1. `npx localtunnel --port 3000`


## 🐳 Rodando localmente via Docker
```bash
docker build -t innovaquiz .
docker run -p 3000:3000 innovaquiz
```

---
*Dica: Certifique-se de que a variável de ambiente `PORT` está sendo respeitada (o servidor já faz isso).*
