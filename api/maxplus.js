/**
 * API MaxPlus - v1.0
 * Extrator e Decodificador de Filmes, Series e Videos
 * Compatível com Vercel Serverless Functions e Node.js
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Configuração dos servidores de vídeo conhecidos (OnePlayer)
const SERVER_TOKENS = {
  // Filmes FHD4
  HD4: {
    host: 'fhd4.oneplayer.site',
    token: '343rt342wtg34wetg34retg4rgh5kh4',
    folder: 'FHD4',
    buildMovieUrl: (imdbId) => `http://fhd4.oneplayer.site/343rt342wtg34wetg34retg4rgh5kh4/FHD4/${imdbId}.mp4`
  },
  // Séries SHD7
  HD7: {
    host: 'shd7.oneplayer.site',
    token: 'u657uy56y5r4tfg4r3eftg345tgy45hj456th45tjh456uj56ujhryz3',
    folder: 'SHD7',
    buildSeriesUrl: (seriesId, season, episode) =>
      `http://shd7.oneplayer.site/u657uy56y5r4tfg4r3eftg345tgy45hj456th45tjh456uj56ujhryz3/SHD7/${seriesId}/${season}x${episode}.mp4`
  }
};

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  Referer: 'http://apps.zynner.site/'
};

/**
 * Fallback para a API de backup caso a extração direta falhe
 */
async function fetchBackupApi(queryParam, queryValue) {
  try {
    const backupUrl = `https://api-anyflix.vercel.app/api/maxv3?${queryParam}=${encodeURIComponent(queryValue)}`;
    const response = await axios.get(backupUrl, {
      timeout: 12000,
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent']
      }
    });
    return response.data;
  } catch (err) {
    console.error(`[MaxPlus] Falha no fallback (${queryParam}):`, err.message);
    return null;
  }
}

/**
 * Endpoint 1: Listagem de Conteúdos (?url=...)
 */
async function handleListing(targetUrl) {
  try {
    const { data: html } = await axios.get(targetUrl, {
      headers: DEFAULT_HEADERS,
      timeout: 10000
    });

    const $ = cheerio.load(html);
    const items = [];

    // DooPlay padrão: artigos com classe .item
    $('article.item, .items article, .animation-2 article').each((_, el) => {
      const poster =
        $(el).find('.poster img').attr('data-src') ||
        $(el).find('.poster img').attr('src') ||
        $(el).find('img').attr('src') ||
        '';

      const titleLink = $(el).find('.data h3 a, h3 a, .title a').first();
      const nome = titleLink.text().trim() || $(el).find('.poster img').attr('alt') || '';
      const link = titleLink.attr('href') || $(el).find('.poster a, a').first().attr('href') || '';

      // Gêneros da listagem
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
    console.warn('[MaxPlus] Erro no scraper direto de listagem:', err.message);
  }

  // Backup garantido
  return await fetchBackupApi('url', targetUrl);
}

/**
 * Endpoint 2: Detalhes de Filme ou Série (?id=...)
 */
async function handleDetails(itemUrl) {
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

    // Verificar se é Série (contém #seasons ou .se-c)
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

    // Encontrar post ID do player no DooPlay
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
            if (SERVER_TOKENS[serverUsed] && SERVER_TOKENS[serverUsed].buildMovieUrl) {
              videoUrl = SERVER_TOKENS[serverUsed].buildMovieUrl(imdbId);
            } else {
              videoUrl = `http://fhd4.oneplayer.site/343rt342wtg34wetg34retg4rgh5kh4/FHD4/${imdbId}.mp4`;
            }
          }
        }
      } catch (ajaxErr) {
        console.warn('[MaxPlus] DooPlay Ajax falhou, tentando fallback:', ajaxErr.message);
      }
    }

    // Se não encontrou o vídeo no scraper direto, recorrer ao fallback para garantir o link mp4 exato
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
    console.warn('[MaxPlus] Erro no scraper direto de detalhes:', err.message);
  }

  // Backup garantido
  return await fetchBackupApi('id', itemUrl);
}

/**
 * Endpoint 3: Link do Episódio de Série (?ep=...)
 */
async function handleEpisode(episodeUrl) {
  try {
    const { data: html } = await axios.get(episodeUrl, {
      headers: DEFAULT_HEADERS,
      timeout: 10000
    });

    const $ = cheerio.load(html);

    // Buscar iframe do player
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
      const serverCode = urlObj.searchParams.get('s') || 'HD7';

      let video = null;
      if (SERVER_TOKENS[serverCode] && SERVER_TOKENS[serverCode].buildSeriesUrl) {
        video = SERVER_TOKENS[serverCode].buildSeriesUrl(seriesId, seasonNum, episodeNum);
      } else {
        video = `http://shd7.oneplayer.site/u657uy56y5r4tfg4r3eftg345tgy45hj456th45tjh456uj56ujhryz3/SHD7/${seriesId}/${seasonNum}x${episodeNum}.mp4`;
      }

      return {
        video,
        server_used: serverCode,
        player_url: cleanSrc
      };
    }
  } catch (err) {
    console.warn('[MaxPlus] Erro no scraper direto de episódio:', err.message);
  }

  // Backup garantido
  return await fetchBackupApi('ep', episodeUrl);
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

  // Responder a preflight requests imediatamente
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

    // 2. Detalhes de Conteúdo (Filme ou Série)
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

    // Raiz / Informações da API
    return res.status(200).json({
      status: 'online',
      name: 'API MaxPlus v1.0',
      description: 'Extrator Oficial de Filmes, Series e Episodios',
      version: '1.0.0',
      endpoints: {
        catalogo: '/api/maxplus?url=http://apps.zynner.site/movies/',
        detalhes: '/api/maxplus?id=http://apps.zynner.site/movies/o-homem-que-sussurra/',
        episodio: '/api/maxplus?ep=http://apps.zynner.site/episodes/reacher-1x1/'
      },
      documentation: 'Envie ?url= para listar catalogo, ?id= para obter detalhes/filme, ?ep= para video do episodio.'
    });
  } catch (error) {
    console.error('[MaxPlus] Erro inesperado na requisição:', error);
    return res.status(500).json({
      error: 'Erro interno ao processar requisição no MaxPlus',
      message: error.message
    });
  }
};
