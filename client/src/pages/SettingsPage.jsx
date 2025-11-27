import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState(null);
  const [aiGuidelines, setAiGuidelines] = useState({
    summary: '',
    actionItems: '',
    focus: ''
  });
  const [meetingTypes, setMeetingTypes] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings`);
      setSettings(response.data);
      setAiGuidelines(response.data.aiGuidelines || { summary: '', actionItems: '', focus: '' });
      setMeetingTypes(response.data.meetingTypes || []);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      showSnackbar('설정을 불러오는데 실패했습니다.', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleGuidelineChange = (field, value) => {
    setAiGuidelines(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveGuidelines = async () => {
    try {
      await axios.put(`${API_URL}/settings/ai-guidelines`, aiGuidelines);
      showSnackbar('AI 가이드라인이 저장되었습니다.');
      fetchSettings();
    } catch (error) {
      console.error('Failed to save guidelines:', error);
      showSnackbar('저장에 실패했습니다.', 'error');
    }
  };

  const handleResetGuidelines = () => {
    if (settings) {
      setAiGuidelines(settings.aiGuidelines);
      showSnackbar('변경사항이 취소되었습니다.', 'info');
    }
  };

  const handleAddMeetingType = () => {
    setEditingType({ id: null, name: '', template: '' });
    setEditDialogOpen(true);
  };

  const handleEditMeetingType = (type) => {
    setEditingType({ ...type });
    setEditDialogOpen(true);
  };

  const handleDeleteMeetingType = async (id) => {
    if (!window.confirm('이 미팅 타입을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/settings/meeting-types/${id}`);
      showSnackbar('미팅 타입이 삭제되었습니다.');
      fetchSettings();
    } catch (error) {
      console.error('Failed to delete meeting type:', error);
      showSnackbar('삭제에 실패했습니다.', 'error');
    }
  };

  const handleSaveMeetingType = async () => {
    if (!editingType.name || !editingType.template) {
      showSnackbar('이름과 템플릿을 모두 입력해주세요.', 'warning');
      return;
    }

    try {
      if (editingType.id) {
        await axios.put(`${API_URL}/settings/meeting-types/${editingType.id}`, editingType);
        showSnackbar('미팅 타입이 수정되었습니다.');
      } else {
        await axios.post(`${API_URL}/settings/meeting-types`, editingType);
        showSnackbar('미팅 타입이 추가되었습니다.');
      }
      setEditDialogOpen(false);
      setEditingType(null);
      fetchSettings();
    } catch (error) {
      console.error('Failed to save meeting type:', error);
      showSnackbar('저장에 실패했습니다.', 'error');
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>설정</Typography>

      <Paper>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="AI 가이드라인" />
          <Tab label="미팅 타입" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ maxWidth: 800 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              AI가 미팅록을 정리할 때 참고할 가이드라인을 설정합니다.
              이 가이드라인은 요약 생성, 액션 아이템 추출 시 활용됩니다.
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={6}
              label="요약 가이드라인"
              value={aiGuidelines.summary}
              onChange={(e) => handleGuidelineChange('summary', e.target.value)}
              sx={{ mb: 3 }}
              helperText="미팅 요약 시 중점적으로 다룰 사항을 입력하세요"
            />

            <TextField
              fullWidth
              multiline
              rows={6}
              label="액션 아이템 가이드라인"
              value={aiGuidelines.actionItems}
              onChange={(e) => handleGuidelineChange('actionItems', e.target.value)}
              sx={{ mb: 3 }}
              helperText="액션 아이템 추출 시 확인할 사항을 입력하세요"
            />

            <TextField
              fullWidth
              multiline
              rows={6}
              label="주요 포커스 가이드라인"
              value={aiGuidelines.focus}
              onChange={(e) => handleGuidelineChange('focus', e.target.value)}
              sx={{ mb: 3 }}
              helperText="미팅록 정리 시 특별히 주의할 점을 입력하세요"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveGuidelines}
              >
                저장
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleResetGuidelines}
              >
                취소
              </Button>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                미팅 타입별 정리 템플릿을 관리합니다.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddMeetingType}
              >
                미팅 타입 추가
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>이름</TableCell>
                    <TableCell>템플릿</TableCell>
                    <TableCell align="right">작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {meetingTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {type.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {type.template}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEditMeetingType(type)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteMeetingType(type.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {meetingTypes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography color="text.secondary">
                          등록된 미팅 타입이 없습니다.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>
      </Paper>

      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingType?.id ? '미팅 타입 수정' : '미팅 타입 추가'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="이름"
            value={editingType?.name || ''}
            onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="템플릿"
            value={editingType?.template || ''}
            onChange={(e) => setEditingType({ ...editingType, template: e.target.value })}
            helperText="이 타입의 미팅을 정리할 때 참고할 템플릿을 입력하세요"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>취소</Button>
          <Button onClick={handleSaveMeetingType} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
