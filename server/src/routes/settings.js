const express = require('express');
const router = express.Router();
const settingsService = require('../services/settingsService');

// 전체 설정 조회
router.get('/', (req, res) => {
  try {
    const settings = settingsService.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// 전체 설정 업데이트
router.put('/', (req, res) => {
  try {
    const settings = settingsService.updateSettings(req.body);
    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI 가이드라인 조회
router.get('/ai-guidelines', (req, res) => {
  try {
    const guidelines = settingsService.getAIGuidelines();
    res.json(guidelines);
  } catch (error) {
    console.error('Error getting AI guidelines:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI 가이드라인 업데이트
router.put('/ai-guidelines', (req, res) => {
  try {
    const settings = settingsService.updateAIGuidelines(req.body);
    res.json(settings);
  } catch (error) {
    console.error('Error updating AI guidelines:', error);
    res.status(500).json({ error: error.message });
  }
});

// 미팅 타입 목록 조회
router.get('/meeting-types', (req, res) => {
  try {
    const meetingTypes = settingsService.getMeetingTypes();
    res.json(meetingTypes);
  } catch (error) {
    console.error('Error getting meeting types:', error);
    res.status(500).json({ error: error.message });
  }
});

// 미팅 타입 추가
router.post('/meeting-types', (req, res) => {
  try {
    const settings = settingsService.addMeetingType(req.body);
    res.status(201).json(settings);
  } catch (error) {
    console.error('Error adding meeting type:', error);
    res.status(500).json({ error: error.message });
  }
});

// 미팅 타입 수정
router.put('/meeting-types/:id', (req, res) => {
  try {
    const settings = settingsService.updateMeetingType(req.params.id, req.body);
    res.json(settings);
  } catch (error) {
    console.error('Error updating meeting type:', error);
    res.status(500).json({ error: error.message });
  }
});

// 미팅 타입 삭제
router.delete('/meeting-types/:id', (req, res) => {
  try {
    const settings = settingsService.deleteMeetingType(req.params.id);
    res.json(settings);
  } catch (error) {
    console.error('Error deleting meeting type:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
