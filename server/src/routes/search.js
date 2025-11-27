const express = require('express');
const router = express.Router();
const searchService = require('../services/searchService');

// 기본 검색 + AI Q&A
router.post('/', async (req, res) => {
  try {
    const { query, question } = req.body;
    const searchQuery = query || question;

    if (!searchQuery) {
      return res.status(400).json({ error: '질문이 필요합니다.' });
    }

    const result = await searchService.search(searchQuery);
    res.json(result);
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: error.message });
  }
});

// 고급 검색
router.post('/advanced', async (req, res) => {
  try {
    const { query, filters } = req.body;
    const meetings = await searchService.advancedSearch(query, filters);
    res.json({ meetings });
  } catch (error) {
    console.error('Error in advanced search:', error);
    res.status(500).json({ error: error.message });
  }
});

// 저장된 검색 조회
router.get('/saved', async (req, res) => {
  try {
    const searches = await searchService.getSavedSearches();
    res.json(searches);
  } catch (error) {
    console.error('Error getting saved searches:', error);
    res.status(500).json({ error: error.message });
  }
});

// 검색 저장
router.post('/save', async (req, res) => {
  try {
    const search = await searchService.saveSearch(req.body);
    res.status(201).json(search);
  } catch (error) {
    console.error('Error saving search:', error);
    res.status(500).json({ error: error.message });
  }
});

// 저장된 검색 삭제
router.delete('/saved/:id', async (req, res) => {
  try {
    const success = await searchService.deleteSavedSearch(req.params.id);

    if (!success) {
      return res.status(404).json({ error: '저장된 검색을 찾을 수 없습니다.' });
    }

    res.json({ success: true, message: '저장된 검색이 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting saved search:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
