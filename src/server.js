// c:\Users\scrip\OneDrive\Ambiente de Trabalho\apiPlayright\src\server.js
const app = require('./app');
const logger = require('./utils/logger'); // Para logs consistentes

/**
 * @file server.js
 * @description Ponto de entrada da aplicação. Este arquivo importa a configuração
 * do aplicativo Express (de app.js) e inicia o servidor HTTP, fazendo-o escutar
 * em uma porta especificada.
 */

// Define a porta em que o servidor irá escutar.
// Tenta obter da variável de ambiente PORT, caso contrário, usa 3000 como padrão.
const PORT = process.env.PORT || 3000;

// Inicia o servidor e o faz escutar na porta definida.
const server = app.listen(PORT, () => {
  logger.log(`[Server] Servidor iniciado e escutando na porta ${PORT}`);
  logger.log(`[Server] Acesse a API em http://localhost:${PORT}`);
  logger.log(`[Server] Endpoint de tarefas: POST http://localhost:${PORT}/api/tasks`);
});

// Tratamento de erros do servidor (ex: porta já em uso)
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Porta ' + PORT;

  switch (error.code) {
    case 'EACCES':
      logger.error(`[Server] ${bind} requer privilégios elevados.`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`[Server] ${bind} já está em uso.`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Lida com o encerramento gracioso do servidor
process.on('SIGINT', () => {
  logger.log('[Server] Recebido SIGINT. Desligando o servidor graciosamente...');
  server.close(() => {
    logger.log('[Server] Servidor desligado.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.log('[Server] Recebido SIGTERM. Desligando o servidor graciosamente...');
  server.close(() => {
    logger.log('[Server] Servidor desligado.');
    process.exit(0);
  });
});
