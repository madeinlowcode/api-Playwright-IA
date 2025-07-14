// c:\Users\scrip\OneDrive\Ambiente de Trabalho\apiPlayright\src\api\routes\sessions.routes.js
const express = require('express');
const router = express.Router();
const sessionManager = require('../../core/sessions/sessionManager');
const logger = require('../../utils/logger');

/**
 * @swagger
 * tags:
 *   name: Sessões
 *   description: Endpoints para gerenciamento de sessões de navegador
 */

/**
 * @swagger
 * /sessions/{platform}/{sessionId}:
 *   delete:
 *     summary: Deleta uma sessão de navegador específica.
 *     tags: [Sessões]
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [playwright, puppeteer]
 *         description: A plataforma da sessão a ser deletada (playwright ou puppeteer).
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: O ID da sessão a ser deletada.
 *     responses:
 *       200:
 *         description: Sessão deletada com sucesso ou não encontrada (nenhuma ação necessária).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: 
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Sessão playwright-mySessionId deletada com sucesso.
 *       400:
 *         description: Parâmetros inválidos.
 *       500:
 *         description: Erro interno ao tentar deletar a sessão.
 */
router.delete('/:platform/:sessionId', async (req, res) => {
  const { platform, sessionId } = req.params;

  logger.log(`[SessionsRoute] Recebida requisição para DELETAR /api/sessions/${platform}/${sessionId}`);

  if (!platform || !sessionId) {
    logger.warn('[SessionsRoute] Requisição inválida: plataforma ou sessionId ausente.', req.params);
    return res.status(400).json({
      success: false,
      message: 'Plataforma e sessionId são obrigatórios.',
    });
  }

  const validPlatforms = ['playwright', 'puppeteer'];
  if (!validPlatforms.includes(platform.toLowerCase())) {
    logger.warn(`[SessionsRoute] Plataforma inválida: ${platform}`);
    return res.status(400).json({
        success: false,
        message: `Plataforma inválida. Use uma das seguintes: ${validPlatforms.join(', ')}`,
    });
  }

  try {
    const deleted = await sessionManager.deleteSession(platform.toLowerCase(), sessionId);
    if (deleted) {
      // A função deleteSession no sessionManager já loga se encontrou ou não a sessão.
      // Se retornou true, significa que ou deletou, ou não existia (o que é um sucesso do ponto de vista da requisição).
      res.status(200).json({ 
        success: true, 
        message: `Operação de exclusão para sessão ${platform}-${sessionId} concluída.` 
      });
    } else {
      // Se deleted for false, ocorreu um erro interno durante a tentativa de exclusão (já logado pelo sessionManager)
      res.status(500).json({ 
        success: false, 
        message: `Erro ao tentar deletar a sessão ${platform}-${sessionId}. Verifique os logs do servidor.` 
      });
    }
  } catch (error) {
    logger.error(`[SessionsRoute] Erro inesperado ao deletar sessão ${platform}-${sessionId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao processar a requisição de exclusão de sessão.',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /screenshots:
 *   delete:
 *     summary: Limpa (deleta todos os arquivos) da pasta de screenshots.
 *     tags: [Sessões] 
 *     description: Remove todos os arquivos .png, .jpeg, .jpg da pasta de screenshots. A pasta em si não é removida.
 *     responses:
 *       200:
 *         description: Screenshots limpos com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: 
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Todos os arquivos da pasta screenshots foram deletados com sucesso.
 *       500:
 *         description: Erro interno ao tentar limpar os screenshots.
 */
router.delete('/screenshots', async (req, res) => { // Note: Rota sem parâmetros de path
  logger.log(`[SessionsRoute] Recebida requisição para DELETAR /api/sessions/screenshots`);
  
  // A função clearScreenshots agora está no taskExecutor, vamos importá-lo aqui também
  // ou mover clearScreenshots para um utilitário mais genérico se preferir no futuro.
  const taskExecutor = require('../../services/taskExecutor'); 

  try {
    const result = await taskExecutor.clearScreenshots();
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error(`[SessionsRoute] Erro inesperado ao limpar screenshots:`, error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao processar a requisição de limpeza de screenshots.',
      error: error.message,
    });
  }
});

module.exports = router;
