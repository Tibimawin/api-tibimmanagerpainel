/**
 * API MaxPlus - v1.1
 * Extrator e Decodificador Oficial de Filmes, Séries e Vídeos
 * Compatível com Vercel Serverless Functions e Node.js
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Mapeamento dos servidores OnePlayer conhecidos
const SERVER_TOKENS = {
  // Filmes FHD4
  HD4: {
    host: 'fhd4.oneplayer.site',
    token: '343rt342wtg34wetg34retg4rgh5kh4',
    folder: 'FHD4',
    buildMovieUrl: (imdbId) =>
      `http://fhd4.oneplayer.site/343rt342wtg34wetg34retg4rgh5kh4/FHD4/${imdbId}.mp4`
  },
  // Séries SHD7 (utiliza token hash)
  HD7: {
    host: 'shd7.oneplayer.site',
    token: 'u657uy56y5r4tfg4r3eftg345tgy45hj456th45tjh456uj56ujhryz3',
    folder: 'SHD7',
    buildSeriesUrl: (seriesId, season, episode) =>
      `http://shd7.oneplayer.site/u657uy56y5r4tfg4r3eftg345tgy45hj456th45tjh456uj56ujhryz3/SHD7/${seriesId}/${season}x${episode}.mp4`
  },
  // Séries SHD13 (direto sem token hash)
  HD13: {
    host: 'shd13.oneplayer.site',
    token: '',
    folder: 'SHD13',
    buildSeriesUrl: (seriesId, season, episode) =>
      `http://shd13.oneplayer.site/SHD13/${seriesId}/${season}x${episode}.mp4`
  }
};

/**
 * Construtor dinâmico de URL de episódios de acordo com o servidor
 */
function buildSeriesUrl(serverCode, seriesId, season, episode) {
  const code = (serverCode || 'HD13').toUpperCase().trim();
  if (SERVER_TOKENS[code] && SERVER_TOKENS[code].buildSeriesUrl) {
    return SERVER_TOKENS[code].buildSeriesUrl(seriesId, season, episode);
  }

  // Extrair número do servidor (ex: HD13 -> 13, HD8 -> 8)
  const numMatch = code.match(/\d+/);
  const num = numMatch ? numMatch[0] : '13';

  if (num === '7') {
    return `http://shd7.oneplayer.site/u657uy56y5r4tfg4r3eftg345tgy45hj456th45tjh456uj56ujhryz3/SHD7/${seriesId}/${season}x${episode}.mp4`;
  }

  return `http://shd${num}.oneplayer.site/SHD${num}/${seriesId}/${season}x${episode}.mp4`;
}

/**
 * Construtor dinâmico de URL de filmes de acordo com o servidor
 */
function buildMovieUrl(serverCode, imdbId) {
  const code = (serverCode || 'HD4').toUpperCase().trim();
  if (SERVER_TOKENS[code] && SERVER_TOKENS[code].buildMovieUrl) {
    return SERVER_TOKENS[code].buildMovieUrl(imdbId);
  }

  const numMatch = code.match(/\d+/);
  const num = numMatch ? numMatch[0] : '4';

  if (num === '4') {
    return `http://fhd4.oneplayer.site/343rt342wtg34wetg34retg4rgh5kh4/FHD4/${imdbId}.mp4`;
  }

  return `http://fhd${num}.oneplayer.site/FHD${num}/${imdbId}.mp4`;
}

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  Referer: 'http://apps.zynner.site/'
};

/**
 * Motor de Consulta ao endpoint de contingência/validação
 */
async function fetchBackupApi(queryParam, queryValue) {
  try {
    const backupUrl = `https://api-anyflix.vercel.app/api/maxv3?${queryParam}=${encodeURIComponent(queryValue)}`;
    const response = await axios.get(backupUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent']
      }
    });
    return response.data;
  } catch (err) {
    return null;
  }
}

/**
 * Endpoint 1: Listagem de Catálogo (?url=...)
 */
async function handleListing(targetUrl) {
  try {
    const { data: html } = await axios.get(targetUrl, {
      headers: DEFAULT_HEADERS,
      timeout: 10000
    });

    const $ = cheerio.load(html);
    const items = [];

    $('article.item, .items article, .animation-2 article').each((_, el) => {
      const poster =
        $(el).find('.poster img').attr('data-src') ||
        $(el).find('.poster img').attr('src') ||
        $(el).find('img').attr('src') ||
        '';

      const titleLink = $(el).find('.data h3 a, h3 a, .title a').first();
      const nome = titleLink.text().trim() || $(el).find('.poster img').attr('alt') || '';
      const link = titleLink.attr('href') || $(el).find('.poster a, a').first().attr('href') || '';

      const genresList = [];
      $(el).find('.metadata span, .genres a, .genres').each((__, g) => {
        const txt = $(g).text().trim();
        if (txt && !genresList.includes(txt)) genresList.push(txt);
      });

      if (nome && link) {
        items.push({
          imagem: poster.startsWith('//') ? `https:${poster}` : poster,
          nome,
          link,
          genres: genresList.join(', ')
        });
      }
    });

    if (items.length > 0) {
      return items;
    }
  } catch (err) {
    console.warn('[MaxPlus] Scraper de listagem falhou, usando contingência:', err.message);
  }

  return await fetchBackupApi('url', targetUrl);
}

/**
 * Endpoint 2: Detalhes de Filme ou Série (?id=...)
 */
async function handleDetails(itemUrl) {
  // Para filmes: verificar se a API de contingência já possui o link direto pronto e validado
  const isPossibleMovie = itemUrl.includes('/movies/');
  if (isPossibleMovie) {
    const verifiedData = await fetchBackupApi('id', itemUrl);
    if (verifiedData && verifiedData.video) {
      return verifiedData;
    }
  }

  try {
    const { data: html } = await axios.get(itemUrl, {
      headers: DEFAULT_HEADERS,
      timeout: 10000
    });

    const $ = cheerio.load(html);

    const nome = $('h1').first().text().trim() || $('.sheader .data h1').text().trim();
    const poster =
      $('.sheader .poster img').attr('src') ||
      $('img[itemprop="image"]').attr('src') ||
      $('.poster img').attr('src') ||
      '';

    const sinopse =
      $('#info .wp-content p').first().text().trim() ||
      $('div[itemprop="description"] p').first().text().trim() ||
      $('.wp-content p').first().text().trim() ||
      '';

    const generosList = [];
    const generosLinks = [];
    $('.sgeneros a, .genres a').each((_, a) => {
      const txt = $(a).text().trim();
      const href = $(a).attr('href');
      if (txt && !generosList.includes(txt)) generosList.push(txt);
      if (href && !generosLinks.includes(href)) generosLinks.push(href);
    });

    const estrelas =
      $('.dt_rating_vgs').first().text().trim() ||
      $('.starstruck-rating span').first().text().trim() ||
      '0';

    // Verificar se é Série (possui temporadas)
    const seasonsElements = $('#seasons .se-c, .se-c');
    const isSeries = seasonsElements.length > 0;

    if (isSeries) {
      const seasons_details = [];
      seasonsElements.each((seasonIdx, sEl) => {
        const seasonNumMatch = $(sEl).find('.se-q .se-t').text().match(/\d+/);
        const seasonNumber = seasonNumMatch ? parseInt(seasonNumMatch[0], 10) : seasonIdx + 1;

        const episodes = [];
        $(sEl).find('.se-a ul.episodios li').each((_, epEl) => {
          const epLinkEl = $(epEl).find('.episodiotitle a');
          const epTitle = epLinkEl.text().trim();
          const epHref = epLinkEl.attr('href');
          const epNumMatch = $(epEl).find('.numerando').text().match(/\d+\s*-\s*(\d+)/);
          const epNumber = epNumMatch ? parseInt(epNumMatch[1], 10) : episodes.length + 1;

          if (epHref) {
            episodes.push({
              number: epNumber,
              link: epHref,
              title: epTitle || `Episódio ${epNumber}`,
              season: seasonNumber
            });
          }
        });

        seasons_details.push({
          number: seasonNumber,
          title: `${seasonNumber}° Temporada`,
          episodes
        });
      });

      return {
        nome,
        imagem: poster.startsWith('//') ? `https:${poster}` : poster,
        sinopse,
        generos: generosList.join(', '),
        'generos-links': generosLinks,
        video: null,
        server_used: null,
        estrelas,
        total_seasons: seasons_details.length,
        seasons_details
      };
    }

    // Se for Filme: resolver o player DooPlay e URL do OnePlayer
    let videoUrl = null;
    let serverUsed = 'HD4';

    const playerOption = $('li#player-option-1, .dooplay_player_option[data-type="movie"]').first();
    const postId = playerOption.attr('data-post');

    if (postId) {
      try {
        const ajaxResp = await axios.post(
          'http://apps.zynner.site/wp-admin/admin-ajax.php',
          `action=doo_player_ajax&post=${postId}&nume=1&type=movie`,
          {
            headers: {
              ...DEFAULT_HEADERS,
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            timeout: 6000
          }
        );

        if (ajaxResp.data && ajaxResp.data.embed_url) {
          const embed = ajaxResp.data.embed_url;
          const imdbMatch = embed.match(/i=(tt\d+)/i);
          const serverMatch = embed.match(/s=([A-Z0-9]+)/i);

          if (serverMatch) serverUsed = serverMatch[1];
          if (imdbMatch) {
            const imdbId = imdbMatch[1];
            videoUrl = buildMovieUrl(serverUsed, imdbId);
          }
        }
      } catch (ajaxErr) {
        console.warn('[MaxPlus] DooPlay Ajax falhou:', ajaxErr.message);
      }
    }

    if (!videoUrl) {
      const backupData = await fetchBackupApi('id', itemUrl);
      if (backupData && backupData.video) {
        return backupData;
      }
    }

    return {
      nome,
      imagem: poster.startsWith('//') ? `https:${poster}` : poster,
      sinopse,
      generos: generosList.join(', '),
      'generos-links': generosLinks,
      video: videoUrl,
      server_used: serverUsed,
      estrelas,
      total_seasons: 0,
      seasons_details: []
    };
  } catch (err) {
    console.warn('[MaxPlus] Scraper de detalhes falhou, usando contingência:', err.message);
  }

  return await fetchBackupApi('id', itemUrl);
}

/**
 * Endpoint 3: Decodificador de Vídeo do Episódio (?ep=...)
 */
async function handleEpisode(episodeUrl) {
  // 1. Prioridade Máxima: Obter o link real e verificado do motor de contingência
  const verifiedData = await fetchBackupApi('ep', episodeUrl);
  if (verifiedData && verifiedData.video) {
    return verifiedData;
  }

  // 2. Parser nativo como suporte
  try {
    const { data: html } = await axios.get(episodeUrl, {
      headers: DEFAULT_HEADERS,
      timeout: 10000
    });

    const $ = cheerio.load(html);

    const iframeSrc =
      $('iframe.metaframe').attr('src') ||
      $('iframe[src*="oneplayer.site"]').attr('src') ||
      $('.pframe iframe').attr('src') ||
      '';

    if (iframeSrc) {
      const cleanSrc = iframeSrc.trim();
      const urlObj = new URL(cleanSrc.startsWith('http') ? cleanSrc : `http://${cleanSrc}`);
      const seriesId = urlObj.searchParams.get('i');
      const episodeNum = urlObj.searchParams.get('e');
      const seasonNum = urlObj.searchParams.get('t');
      const serverCode = (urlObj.searchParams.get('s') || 'HD13').toUpperCase();

      const video = buildSeriesUrl(serverCode, seriesId, seasonNum, episodeNum);

      return {
        video,
        server_used: serverCode,
        player_url: cleanSrc
      };
    }
  } catch (err) {
    console.warn('[MaxPlus] Scraper direto de episódio falhou:', err.message);
  }

  return { error: 'Player não encontrado.' };
}

/**
 * Handler Principal da Função Serverless (Vercel)
 */
module.exports = async (req, res) => {
  // Configuração Global de CORS Permissivo
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url, id, ep } = req.query || {};

  try {
    // 1. Listagem de Catálogo
    if (url) {
      const data = await handleListing(url);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json(data);
    }

    // 2. Detalhes de Filme ou Série
    if (id) {
      const data = await handleDetails(id);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json(data);
    }

    // 3. Link de Vídeo de Episódio
    if (ep) {
      const data = await handleEpisode(ep);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json(data);
    }

    // Raiz / Status
    return res.status(200).json({
      status: 'online',
      name: 'API MaxPlus v1.1',
      description: 'Extrator Oficial de Filmes, Séries e Episódios',
      version: '1.1.0',
      endpoints: {
        catalogo: '/api/maxplus?url=http://apps.zynner.site/movies/',
        detalhes: '/api/maxplus?id=http://apps.zynner.site/movies/o-homem-que-sussurra/',
        episodio: '/api/maxplus?ep=http://apps.zynner.site/episodes/reacher-1x1/'
      },
      documentation: 'Envie ?url= para catálogo, ?id= para detalhes/filme, ?ep= para vídeo do episódio.'
    });
  } catch (error) {
    console.error('[MaxPlus] Erro inesperado:', error);
    return res.status(500).json({
      error: 'Erro interno ao processar requisição no MaxPlus',
      message: error.message
    });
  }
};
