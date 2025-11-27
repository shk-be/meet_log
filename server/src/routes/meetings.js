const express = require('express');
const router = express.Router();
const meetingService = require('../services/meetingService');

// 미팅 목록 조회
router.get('/', async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      participantId: req.query.participantId,
      tagId: req.query.tagId,
      projectId: req.query.projectId,
      status: req.query.status
    };

    const result = await meetingService.getMeetings(filters);
    res.json(result);
  } catch (error) {
    console.error('Error getting meetings:', error);
    res.status(500).json({ error: error.message });
  }
});

// 미팅 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const meeting = await meetingService.getMeetingById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ error: '미팅을 찾을 수 없습니다.' });
    }

    res.json(meeting);
  } catch (error) {
    console.error('Error getting meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// 미팅 생성
router.post('/', async (req, res) => {
  try {
    const { title, date, startTime, endTime, location, meetingType, participants, content, templateId } = req.body;

    if (!title || !date || !content) {
      return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
    }

    const meeting = await meetingService.createMeeting({
      title,
      date,
      startTime,
      endTime,
      location,
      meetingType,
      participants,
      content,
      templateId
    });

    res.status(201).json(meeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// 미팅 수정
router.put('/:id', async (req, res) => {
  try {
    const meeting = await meetingService.updateMeeting(req.params.id, req.body);
    res.json(meeting);
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// 미팅 삭제
router.delete('/:id', async (req, res) => {
  try {
    const success = await meetingService.deleteMeeting(req.params.id);

    if (!success) {
      return res.status(404).json({ error: '미팅을 찾을 수 없습니다.' });
    }

    res.json({ success: true, message: '미팅이 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// 버전 히스토리 조회
router.get('/:id/versions', async (req, res) => {
  try {
    const versions = await meetingService.getVersionHistory(req.params.id);
    res.json(versions);
  } catch (error) {
    console.error('Error getting version history:', error);
    res.status(500).json({ error: error.message });
  }
});

// 버전 복원
router.post('/:id/restore/:version', async (req, res) => {
  try {
    const meeting = await meetingService.restoreVersion(
      req.params.id,
      parseInt(req.params.version)
    );
    res.json(meeting);
  } catch (error) {
    console.error('Error restoring version:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
