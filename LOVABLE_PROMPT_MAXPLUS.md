# 📋 PROMPT COMPLETO PARA ENVIAR AO LOVABLE

Copie todo o texto abaixo e cole diretamente no chat do **Lovable** para ele implementar o **MaxPlus** no seu site conectado com o seu **Baserow**:

---

```markdown
Por favor, implemente uma nova funcionalidade completa no meu painel chamada "MaxPlus".

### 1. O que é o MaxPlus?
O MaxPlus é um importador e puxador automatizado de catálogo (filmes, séries e episódios com links diretos de vídeo MP4). Ele se conecta a uma API externa própria e salva os dados diretamente nas minhas tabelas do Baserow com apenas um clique.

### 2. Configuração da API do MaxPlus
Crie um serviço ou hook para consumir a API do MaxPlus:
- URL Base da API: Declare uma constante ou variável de ambiente (ex: `const MAXPLUS_API_BASE = "https://SUA-API-NO-VERCEL.vercel.app/api/maxplus";` com fallback de fácil alteração).
- Endpoints consumidos:
  a) Listagem de Catálogo: `${MAXPLUS_API_BASE}?url=${encodeURIComponent(targetCatalogUrl)}`
     - URLs padrão para as abas:
       - Filmes: `http://apps.zynner.site/movies/`
       - Lançamentos: `http://apps.zynner.site/genre/lancamentos/`
       - Séries: `http://apps.zynner.site/tvshows/`
       - Busca: `http://apps.zynner.site/?s=${query}`
  b) Detalhes do Conteúdo (Filme ou Série): `${MAXPLUS_API_BASE}?id=${encodeURIComponent(itemLink)}`
     - Retorna: `{ nome, imagem, sinopse, generos, video, server_used, estrelas, total_seasons, seasons_details }`
  c) Decodificador de Vídeo do Episódio: `${MAXPLUS_API_BASE}?ep=${encodeURIComponent(episodeLink)}`
     - Retorna: `{ video, server_used, player_url }`

### 3. Interface do Usuário (UI / UX)
- **Menu Lateral**: Adicione o item **"MaxPlus"** com um ícone moderno (ex: `Sparkles` ou `Flame` do Lucide).
- **Cabeçalho**: Título "MaxPlus - Importador Inteligente", com barra de busca por palavra-chave e abas de categorias: "Filmes Recentes", "Séries", "Lançamentos", "Mais Vistos".
- **Grid de Conteúdos**:
  - Exiba cards com capa poster (`imagem`), título em destaque (`nome`), badge indicando "Filme" ou "Série", tags de gêneros.
  - Botão de Ação em cada card: **"Importar para o Baserow"** (com ícone de download/nuvem e estado de loading).
  - Botão superior: **"Importar Todos da Página"** com barra de progresso visual.
- **Modal de Pré-visualização**: Ao clicar no card (fora do botão de importar), abrir um modal elegante mostrando sinopse, capa ampliada, avaliação e lista de episódios (caso seja série).

### 4. Lógica de Importação para o Baserow
Ao clicar em "Importar para o Baserow":
1. Mude o botão para estado de carregamento ("Importando...").
2. Faça a requisição para `${MAXPLUS_API_BASE}?id=${item.link}` para obter todos os metadados completos.
3. Se for **Filme**:
   - Salve na tabela de filmes do Baserow com os campos:
     - Título/Nome: `data.nome`
     - Sinopse: `data.sinopse`
     - Capa/Poster URL: `data.imagem`
     - Link do Vídeo: `data.video` (o link direto .mp4)
     - Gêneros: `data.generos`
     - Avaliação: `data.estrelas`
     - Status: Ativo / Publicado
4. Se for **Série**:
   - Salve a série na tabela de séries do Baserow com: `data.nome`, `data.sinopse`, `data.imagem`, `data.generos`, `data.total_seasons`.
   - Obtenha o ID retornado da série recém-criada no Baserow.
   - Para cada temporada e episódio em `data.seasons_details`:
     - Chame `${MAXPLUS_API_BASE}?ep=${episode.link}` para obter a URL direta do vídeo mp4.
     - Salve o episódio na tabela de episódios do Baserow com: Título do episódio, Temporada, Número do episódio, Link do Vídeo (`video`), e o vínculo com a série.
5. Exiba um Toast de notificação de sucesso: "Conteúdo importado com sucesso para o seu Baserow!".
6. Mude o botão do card para "Já Importado" (desabilitado e verde).

Mantenha o código limpo, modular, com tratamento de erros em try/catch e feedback visual ao usuário.
```
