const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/planner/current
 * Returns the current active 10-topic production planner batch
 */
router.get('/current', (req, res) => {
  try {
    const batch = db.getCurrentPlannerBatch();
    res.json({
      success: true,
      batch
    });
  } catch (err) {
    console.error('[Planner GET Current Error]:', err.message);
    res.status(500).json({ error: 'Failed to retrieve planner batch' });
  }
});

/**
 * GET /api/planner/batches
 * Returns list of all planner batches (with progress and topic counts)
 */
router.get('/batches', (req, res) => {
  try {
    const batches = db.getPlannerBatches();
    res.json({
      success: true,
      batches
    });
  } catch (err) {
    console.error('[Planner GET Batches Error]:', err.message);
    res.status(500).json({ error: 'Failed to retrieve batches' });
  }
});

/**
 * POST /api/planner/batches
 * Creates a new 10-topic batch
 */
router.post('/batches', (req, res) => {
  try {
    const { batchName, topics } = req.body || {};
    const newBatch = db.createDefaultPlannerBatch(batchName || `નવી બેચ #${Date.now().toString().slice(-4)}`, topics);
    res.json({
      success: true,
      batch: newBatch
    });
  } catch (err) {
    console.error('[Planner POST Batch Error]:', err.message);
    res.status(500).json({ error: 'Failed to create planner batch' });
  }
});

/**
 * PUT /api/planner/topic/:id
 * Updates an individual topic's stages (checkboxes) or metadata
 */
router.put('/topic/:id', (req, res) => {
  try {
    const topicId = req.params.id;
    const { batchId, stages, topicName, suggestedPublishDate, suggestedPublishDay, suggestedPublishTime, priority } = req.body || {};
    
    const result = db.updatePlannerTopic(batchId, topicId, {
      stages,
      topicName,
      suggestedPublishDate,
      suggestedPublishDay,
      suggestedPublishTime,
      priority
    });

    if (!result) {
      return res.status(404).json({ error: 'Topic not found in planner batch' });
    }

    res.json({
      success: true,
      topic: result.topic,
      batch: result.batch
    });
  } catch (err) {
    console.error('[Planner PUT Topic Error]:', err.message);
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

/**
 * DELETE /api/planner/topic/:id
 * Deletes a topic from the batch
 */
router.delete('/topic/:id', (req, res) => {
  try {
    const topicId = req.params.id;
    const { batchId } = req.query || {};
    const success = db.deletePlannerTopic(batchId, topicId);
    res.json({
      success,
      batch: db.getCurrentPlannerBatch()
    });
  } catch (err) {
    console.error('[Planner DELETE Topic Error]:', err.message);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

/**
 * POST /api/planner/sync
 * Connects Tool #1 (Topic Ideas) directly with Tool #2 (Topic Production Planner).
 * Transfers 10 topics automatically.
 */
router.post('/sync', (req, res) => {
  try {
    const { topics = [], batchName = null } = req.body || {};
    if (!Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ error: 'Valid topics array is required' });
    }

    const batch = db.syncTopicsToPlanner(topics, batchName);
    // Also sync into Central Repository
    db.batchAddCentralTopics(topics);

    res.json({
      success: true,
      message: `સફળતાપૂર્વક ${topics.length} વિષયો Production Planner માં ટ્રાન્સફર થઈ ગયા છે.`,
      batch
    });
  } catch (err) {
    console.error('[Planner Sync Error]:', err.message);
    res.status(500).json({ error: 'Failed to sync topics to planner' });
  }
});

// ===========================================================================
// CENTRAL TOPIC REPOSITORY API ROUTES (Unique topicId connection)
// ===========================================================================

/**
 * GET /api/planner/topics
 * Returns all topics from central repository with their 7 production stages,
 * status ('NOT STARTED' | 'IN PROGRESS' | 'READY FOR PUBLISH' | 'PUBLISHED')
 * and progress percentage.
 */
router.get('/topics', (req, res) => {
  try {
    const topics = db.getCentralTopics();
    res.json({
      success: true,
      topics,
      total: topics.length
    });
  } catch (err) {
    console.error('[Central Topics GET Error]:', err.message);
    res.status(500).json({ error: 'Failed to get central topics' });
  }
});

/**
 * GET /api/planner/topics/:topicId
 * Returns complete connected data for THAT EXACT topic:
 * topic + stages + research + slides + scripts + voices + videos + thumbnails + seo.
 */
router.get('/topics/:topicId', (req, res) => {
  try {
    const topicId = req.params.topicId;
    const data = db.getCentralTopicById(topicId);
    if (!data) {
      return res.status(404).json({ error: `Topic '${topicId}' not found` });
    }
    res.json({
      success: true,
      ...data
    });
  } catch (err) {
    console.error('[Central Topic GET by ID Error]:', err.message);
    res.status(500).json({ error: 'Failed to get topic details' });
  }
});

/**
 * POST /api/planner/topics
 * Creates a single topic in central repository with duplicate detection and unique topicId.
 */
router.post('/topics', (req, res) => {
  try {
    const result = db.addCentralTopic(req.body || {});
    if (result.duplicate) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'આ વિષય પહેલેથી જ પ્લાનરમાં ઉમેરાયેલો છે.',
        topic: result.existingTopic
      });
    }
    res.json({
      success: true,
      duplicate: false,
      message: 'વિષય સફળતાપૂર્વક પ્લાનરમાં ઉમેરાઈ ગયો!',
      topic: result.topic
    });
  } catch (err) {
    console.error('[Central Topic POST Error]:', err.message);
    res.status(400).json({ error: err.message || 'Failed to add topic' });
  }
});

/**
 * POST /api/planner/topics/batch
 * Adds multiple topics from Tool 1 with duplicate detection.
 */
router.post('/topics/batch', (req, res) => {
  try {
    const { topics = [] } = req.body || {};
    if (!Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ error: 'Topics array is required' });
    }
    const result = db.batchAddCentralTopics(topics);
    res.json({
      success: true,
      ...result,
      message: `${result.totalAdded} નવા વિષયો ઉમેરાયા (${result.duplicates.length} ડુપ્લિકેટ અવગણ્યા).`
    });
  } catch (err) {
    console.error('[Central Topics Batch Error]:', err.message);
    res.status(500).json({ error: 'Failed to batch add topics' });
  }
});

/**
 * PUT /api/planner/topics/:topicId/stage
 * Updates an individual production stage (YES / NO) and recalculates status.
 */
router.put('/topics/:topicId/stage', (req, res) => {
  try {
    const topicId = req.params.topicId;
    const { stageName, isCompleted } = req.body || {};
    if (!stageName) {
      return res.status(400).json({ error: 'stageName is required' });
    }
    const result = db.updateCentralTopicStage(topicId, stageName, isCompleted);
    if (!result) {
      return res.status(404).json({ error: `Topic '${topicId}' not found` });
    }
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('[Central Topic PUT Stage Error]:', err.message);
    res.status(500).json({ error: 'Failed to update topic stage' });
  }
});

/**
 * PUT /api/planner/topics/:topicId/data/:module
 * Saves connected module data for THIS EXACT topic.
 */
router.put('/topics/:topicId/data/:module', (req, res) => {
  try {
    const { topicId, module: moduleKey } = req.params;
    const data = req.body || {};
    const updated = db.updateCentralTopicData(topicId, moduleKey, data);
    res.json({
      success: true,
      topicId,
      module: moduleKey,
      data: updated
    });
  } catch (err) {
    console.error('[Central Topic PUT Data Error]:', err.message);
    res.status(500).json({ error: 'Failed to update module data' });
  }
});

/**
 * DELETE /api/planner/topics/:topicId
 * Deletes a topic and all its connected records.
 */
router.delete('/topics/:topicId', (req, res) => {
  try {
    const topicId = req.params.topicId;
    const deleted = db.deleteCentralTopic(topicId);
    res.json({
      success: deleted,
      topicId
    });
  } catch (err) {
    console.error('[Central Topic DELETE Error]:', err.message);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

module.exports = router;

