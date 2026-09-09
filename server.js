/**
 * Servidor Local de Teste para o MaxPlus
 * Executa localmente em http://localhost:3000
 */

const http = require('http');
const url = require('url');
const maxplusHandler = require('./api/maxplus');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Adapta o objeto de requisição para o formato do Vercel
  req.query = parsedUrl.query;

  // Adapta o método json e status para compatibilidade com Express/Vercel
  res.status = function (statusCode) {
    res.statusCode = statusCode;
    return res;
  };

  res.json = function (data) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data, null, 2));
    return res;
  };

  try {
    await maxplusHandler(req, res);
  } catch (err) {
    console.error('Erro no servidor local:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Erro interno', message: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 API MaxPlus Rodando Localmente!`);
  console.log(`  Porta: http://localhost:${PORT}`);
  console.log(`======================================================`);
  console.log(`  Exemplos para testar no navegador:`);
  console.log(`  1. Catálogo:`);
  console.log(`     http://localhost:${PORT}/api/maxplus?url=http://apps.zynner.site/movies/`);
  console.log(`  2. Detalhes de Filme:`);
  console.log(`     http://localhost:${PORT}/api/maxplus?id=http://apps.zynner.site/movies/o-homem-que-sussurra/`);
  console.log(`  3. Detalhes de Série:`);
  console.log(`     http://localhost:${PORT}/api/maxplus?id=http://apps.zynner.site/tvshows/reacher/`);
  console.log(`  4. Vídeo de Episódio:`);
  console.log(`     http://localhost:${PORT}/api/maxplus?ep=http://apps.zynner.site/episodes/reacher-1x1/`);
  console.log(`======================================================\n`);
});
