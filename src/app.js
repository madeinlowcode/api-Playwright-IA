// c:\Users\scrip\OneDrive\Ambiente de Trabalho\apiPlayright\src\app.js
const express = require('express');
const logger = require('./utils/logger'); // Para logs da aplicação
const taskRoutes = require('./api/routes/tasks.routes');
const sessionRoutes = require('./api/routes/sessions.routes'); // Novas rotas de sessão

/**
 * @file app.js
 * @description Arquivo principal para configuração do aplicativo Express.
 * Ele inicializa o Express, configura middlewares, define rotas e
 * pode incluir manipuladores de erro globais.
 */

// Cria uma instância do aplicativo Express
const app = express();

// Middleware para parsear JSON no corpo das requisições
app.use(express.json());

// Middleware para parsear corpos de requisição URL-encoded
app.use(express.urlencoded({ extended: true }));

// Middleware de log de requisições (exemplo)
app.use((req, res, next) => {
  logger.log(`[App] Nova Requisição: ${req.method} ${req.originalUrl} (Origem: ${req.ip})`);
  next();
});

// Rotas da API
// Todas as rotas definidas em tasks.routes.js serão prefixadas com /api/tasks
app.use('/api/tasks', taskRoutes);
app.use('/api/sessions', sessionRoutes); // Adiciona as rotas de sessão prefixadas com /api/sessions

// Rota raiz básica para verificar se a API está online
app.get('/', (req, res) => {
  res.status(200).json({ message: 'API de Tarefas com Playwright/Puppeteer está online!' });
});

// Manipulador para rotas não encontradas (404)
app.use((req, res, next) => {
  const error = new Error('Rota não encontrada.');
  error.status = 404;
  logger.warn(`[App] Rota não encontrada: ${req.method} ${req.originalUrl}`);
  next(error);
});

// Manipulador de erro global
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  logger.error(`[App] Erro não tratado: ${error.message}`, { stack: error.stack, status: error.status });
  res.status(error.status || 500).json({
    error: {
      message: error.message || 'Erro interno do servidor.',
      status: error.status || 500,
    },
  });
});

module.exports = app;
