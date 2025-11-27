const express = require('express');
const router = express.Router();
const tagService = require('../services/tagService');
const aiService = require('../services/aiService');

// 태그 목록 조회
router.get('/', async (req, res) => {
  try {
    const tags = await tagService.getAllTags();
    res.json(tags);
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({ error: error.message });
  }
});

// 태그 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const tag = await tagService.getTagById(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: '태그를 찾을 수 없습니다.' });
    }

    res.json(tag);
  } catch (error) {
    console.error('Error getting tag:', error);
    res.status(500).json({ error: error.message });
  }
});

// 태그 생성
router.post('/', async (req, res) => {
  try {
    const tag = await tagService.createTag(req.body);
    res.status(201).json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: error.message });
  }
});

// 태그 수정
router.put('/:id', async (req, res) => {
  try {
    const tag = await tagService.updateTag(req.params.id, req.body);
    res.json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: error.message });
  }
});

// 태그 삭제
router.delete('/:id', async (req, res) => {
  try {
    const success = await tagService.deleteTag(req.params.id);

    if (!success) {
      return res.status(404).json({ error: '태그를 찾을 수 없습니다.' });
    }

    res.json({ success: true, message: '태그가 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI 태그 제안
router.post('/suggest', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: '내용이 필요합니다.' });
    }

    const existingTags = (await tagService.getAllTags()).map(t => t.name);
    const suggestedTags = await aiService.suggestTags(content, existingTags);

    res.json({ tags: suggestedTags });
  } catch (error) {
    console.error('Error suggesting tags:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
