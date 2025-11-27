const express = require('express');
const router = express.Router();
const actionItemService = require('../services/actionItemService');

// 액션 아이템 목록 조회
router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      assigneeId: req.query.assigneeId,
      priority: req.query.priority,
      overdue: req.query.overdue === 'true',
      meetingId: req.query.meetingId
    };

    const actionItems = await actionItemService.getActionItems(filters);
    res.json(actionItems);
  } catch (error) {
    console.error('Error getting action items:', error);
    res.status(500).json({ error: error.message });
  }
});

// 액션 아이템 통계
router.get('/summary', async (req, res) => {
  try {
    const summary = await actionItemService.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting action item summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// 액션 아이템 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const actionItem = await actionItemService.getActionItemById(req.params.id);

    if (!actionItem) {
      return res.status(404).json({ error: '액션 아이템을 찾을 수 없습니다.' });
    }

    res.json(actionItem);
  } catch (error) {
    console.error('Error getting action item:', error);
    res.status(500).json({ error: error.message });
  }
});

// 액션 아이템 생성
router.post('/', async (req, res) => {
  try {
    const actionItem = await actionItemService.createActionItem(req.body);
    res.status(201).json(actionItem);
  } catch (error) {
    console.error('Error creating action item:', error);
    res.status(500).json({ error: error.message });
  }
});

// 액션 아이템 수정
router.put('/:id', async (req, res) => {
  try {
    const actionItem = await actionItemService.updateActionItem(req.params.id, req.body);
    res.json(actionItem);
  } catch (error) {
    console.error('Error updating action item:', error);
    res.status(500).json({ error: error.message });
  }
});

// 액션 아이템 상태 변경
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const actionItem = await actionItemService.updateActionItem(req.params.id, { status });
    res.json(actionItem);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: error.message });
  }
});

// 액션 아이템 삭제
router.delete('/:id', async (req, res) => {
  try {
    const success = await actionItemService.deleteActionItem(req.params.id);

    if (!success) {
      return res.status(404).json({ error: '액션 아이템을 찾을 수 없습니다.' });
    }

    res.json({ success: true, message: '액션 아이템이 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting action item:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
