const express = require('express');
const router = express.Router();
const templateService = require('../services/templateService');

// 모든 템플릿 조회
router.get('/', async (req, res) => {
  try {
    const templates = await templateService.getAllTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// 기본 템플릿만 조회
router.get('/defaults', async (req, res) => {
  try {
    const templates = await templateService.getDefaultTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error getting default templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// 템플릿 ID로 조회
router.get('/:id', async (req, res) => {
  try {
    const template = await templateService.getTemplateById(req.params.id);

    if (!template) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({ error: error.message });
  }
});

// 새 템플릿 생성
router.post('/', async (req, res) => {
  try {
    const { name, description, meetingType, templateContent, isDefault } = req.body;

    if (!name || !templateContent) {
      return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
    }

    const template = await templateService.createTemplate({
      name,
      description,
      meetingType,
      templateContent,
      isDefault
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// 템플릿 수정
router.put('/:id', async (req, res) => {
  try {
    const { name, description, meetingType, templateContent, isDefault } = req.body;

    const template = await templateService.updateTemplate(req.params.id, {
      name,
      description,
      meetingType,
      templateContent,
      isDefault
    });

    if (!template) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// 템플릿 삭제
router.delete('/:id', async (req, res) => {
  try {
    await templateService.deleteTemplate(req.params.id);
    res.json({ success: true, message: '템플릿이 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: error.message });
  }
});

// 템플릿으로부터 미팅 생성
router.post('/:id/create-meeting', async (req, res) => {
  try {
    const { title, date, startTime, endTime, location, content, status } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: '제목과 날짜는 필수입니다.' });
    }

    const meeting = await templateService.createMeetingFromTemplate(req.params.id, {
      title,
      date,
      startTime,
      endTime,
      location,
      content,
      status
    });

    res.status(201).json(meeting);
  } catch (error) {
    console.error('Error creating meeting from template:', error);
    res.status(500).json({ error: error.message });
  }
});

// 기본 템플릿 초기화 (개발용)
router.post('/initialize-defaults', async (req, res) => {
  try {
    await templateService.initializeDefaultTemplates();
    res.json({ success: true, message: '기본 템플릿이 초기화되었습니다.' });
  } catch (error) {
    console.error('Error initializing default templates:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
