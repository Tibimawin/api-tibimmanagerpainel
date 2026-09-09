# 🚀 API MaxPlus (Extrator & Decodificador Oficial)

API Serverless de alta performance projetada para scraping, extração de catálogo e decodificação de links diretos de vídeo MP4 de filmes, séries e episódios a partir do upstream DooPlay / OnePlayer.

---

## 📌 Funcionalidades Principais
- **100% Gratuito no Vercel** (Hobby Plan = $0/mês).
- **CORS Aberto**: Pronto para conexão com qualquer frontend (Lovable, React, Vue, Next.js, etc.).
- **Extração Completa**:
  - **Catálogo (`?url=`)**: Puxa lista de filmes, séries, lançamentos e gêneros com títulos, posters em alta resolução e links.
  - **Detalhes de Filmes (`?id=`)**: Puxa sinopse, capa, gêneros, avaliação e o link direto do vídeo MP4 (FHD).
  - **Detalhes de Séries (`?id=`)**: Puxa sinopse, capa, temporadas completas e árvore de episódios.
  - **Episódio (`?ep=`)**: Decodifica o player do episódio e entrega a URL direta MP4 (HD).
- **Dual-Engine com Fallback Automático**: Se o extrator direto encontrar alguma instabilidade temporária, o motor de contingência garante a resposta sem travar o seu painel.

---

## 🛠️ Como Publicar no Vercel (100% Grátis)

### Opção 1: Pelo GitHub (Recomendada - 2 Minutos)
1. Crie um repositório no seu GitHub (ex: `api-maxplus`).
2. Envie os arquivos desta pasta (`api-maxplus`) para o repositório.
3. Acesse [vercel.com](https://vercel.com) e faça login.
4. Clique em **"Add New..."** -> **"Project"**.
5. Selecione o repositório `api-maxplus` e clique em **"Deploy"**.
6. Pronto! O Vercel gerará seu link público HTTPS gratuito:
   `https://sua-api-maxplus.vercel.app`

### Opção 2: Pelo Vercel CLI
Se tiver o Node.js instalado no seu computador:
```bash
npx vercel
```
Siga as opções na tela (pressione Enter para confirmar o projeto padrão).

---

## 📡 Como Usar os Endpoints

Substitua `https://sua-api-maxplus.vercel.app` pelo domínio que o Vercel gerar para você:

### 1. Listar Filmes / Séries do Catálogo
```http
GET https://sua-api-maxplus.vercel.app/api/maxplus?url=http://apps.zynner.site/movies/
```
**Exemplo de Resposta:**
```json
[
  {
    "imagem": "https://image.tmdb.org/t/p/w185/umlg3mqkny7opAfPtBLUGYwZ8xF.jpg",
    "nome": "O Homem que Sussurra",
    "link": "http://apps.zynner.site/movies/o-homem-que-sussurra/",
    "genres": "Crime, Drama, Lançamentos, Thriller"
  }
]
```

---

### 2. Puxar Detalhes e Link de Filme
```http
GET https://sua-api-maxplus.vercel.app/api/maxplus?id=http://apps.zynner.site/movies/o-homem-que-sussurra/
```
**Exemplo de Resposta:**
```json
{
  "nome": "O Homem que Sussurra",
  "imagem": "https://image.tmdb.org/t/p/w185/umlg3mqkny7opAfPtBLUGYwZ8xF.jpg",
  "sinopse": "Após o desaparecimento do filho, um viúvo precisa pedir ajuda ao próprio pai...",
  "generos": "Crime, Drama, Lançamentos, Thriller",
  "generos-links": ["http://apps.zynner.site/genre/crime/"],
  "video": "http://fhd4.oneplayer.site/343rt342wtg34wetg34retg4rgh5kh4/FHD4/tt11561116.mp4",
  "server_used": "HD4",
  "estrelas": "5",
  "total_seasons": 0,
  "seasons_details": []
}
```

---

### 3. Puxar Detalhes de Série e Temporadas
```http
GET https://sua-api-maxplus.vercel.app/api/maxplus?id=http://apps.zynner.site/tvshows/reacher/
```
**Exemplo de Resposta:**
```json
{
  "nome": "Reacher",
  "imagem": "https://image.tmdb.org/t/p/w185/bQnnKBe3VsvXKMoNCaYmRzs1Dup.jpg",
  "sinopse": "Quando o policial militar aposentado Jack Reacher é preso...",
  "generos": "Ação & Aventura, Crime, Drama, Mistério",
  "video": null,
  "total_seasons": 4,
  "seasons_details": [
    {
      "number": 1,
      "title": "1° Temporada",
      "episodes": [
        {
          "number": 1,
          "link": "http://apps.zynner.site/episodes/reacher-1x1/",
          "title": "Bem-vindo a Margrave",
          "season": 1
        }
      ]
    }
  ]
}
```

---

### 4. Puxar Link Direto do Episódio
```http
GET https://sua-api-maxplus.vercel.app/api/maxplus?ep=http://apps.zynner.site/episodes/reacher-1x1/
```
**Exemplo de Resposta:**
```json
{
  "video": "http://shd7.oneplayer.site/u657uy56y5r4tfg4r3eftg345tgy45hj456th45tjh456uj56ujhryz3/SHD7/108978/1x1.mp4",
  "server_used": "HD7",
  "player_url": "http://oneplayer.site/player/series/?i=108978&e=1&t=1&s=HD7"
}
```

---

## 💻 Como Rodar Localmente (Se desejar)
```bash
npm install
npm start
```
O servidor ficará ativo em `http://localhost:3000`.
