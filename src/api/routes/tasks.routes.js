// c:\Users\scrip\OneDrive\Ambiente de Trabalho\apiPlayright\src\api\routes\tasks.routes.js
const express = require('express');
const router = express.Router();

const taskExecutor = require('../../services/taskExecutor');
const logger = require('../../utils/logger');

/**
 * @swagger
 * tags:
 *   name: Tarefas
 *   description: Endpoints para gerenciamento e execução de tarefas
 */

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Submete uma ou mais tarefas para execução.
 *     tags: [Tarefas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [playwright, puppeteer]
 *                 description: A plataforma a ser utilizada para executar as tarefas.
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object // Definir a estrutura de uma tarefa aqui
 *                 description: Lista de tarefas a serem executadas.
 *     responses:
 *       200:
 *         description: Tarefas recebidas e em processamento.
 *       400:
 *         description: Requisição inválida.
 *       500:
 *         description: Erro interno do servidor.
 */
router.post('/', async (req, res) => {
  console.log('VERSÃO ATUAL DO ROUTER: Nova implementação com taskExecutor!!');
  const { platform, tasks, sessionId } = req.body;

  logger.log('[TasksRoute] Recebida requisição para /api/tasks', { platform, tasks_count: tasks ? tasks.length : 0, sessionId });

  if (!platform || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
    logger.warn('[TasksRoute] Requisição inválida: plataforma ou tarefas ausentes/inválidas.', req.body);
    return res.status(400).json({
      success: false,
      message: 'Plataforma e uma lista de tarefas são obrigatórias.',
      error: 'Requisição inválida.',
    });
  }

  try {
    // O sessionId é opcional. Se não for fornecido no corpo da requisição,
    // o taskExecutor gerará um temporário ou operará sem persistência explícita (dependendo da lógica interna do handler).
    const executionResult = await taskExecutor.executeTasks(platform, tasks, sessionId);

    if (executionResult.success) {
      logger.log(`[TasksRoute] Execução de tarefas concluída com sucesso para sessionId: ${executionResult.sessionId}`, { results_count: executionResult.results.length });
      res.status(200).json(executionResult);
    } else {
      logger.error(`[TasksRoute] Erro na execução de tarefas para sessionId: ${executionResult.sessionId}`, executionResult);
      // Decide qual status code é mais apropriado. Se o erro foi no processamento geral, 500.
      // Se for um erro específico de alguma tarefa mas outras funcionaram, ainda pode ser 200 com status de erro interno.
      // Por ora, se !success, retornamos 500.
      res.status(500).json(executionResult);
    }
  } catch (error) {
    logger.error('[TasksRoute] Erro inesperado ao processar a requisição de tarefas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao processar as tarefas.',
      error: error.message,
      sessionId: sessionId || 'não fornecido',
    });
  }
});

module.exports = router;
