import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider
} from '@mui/material';
import { Save as SaveIcon, Description as TemplateIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMeetings } from '../context/MeetingContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function CreateMeetingPage() {
  const navigate = useNavigate();
  const { createMeeting } = useMeetings();

  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    participants: '',
    content: '',
  });

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/templates`);
      setTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTemplateChange = (e) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);

    if (templateId) {
      const template = templates.find(t => t.id === parseInt(templateId));
      if (template) {
        setFormData(prev => ({
          ...prev,
          content: template.template_content
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const participantsArray = formData.participants
        ? formData.participants.split(',').map((p) => p.trim())
        : [];

      const meeting = await createMeeting({
        ...formData,
        participants: participantsArray,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate(`/meetings/${meeting.id}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || '미팅 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        새 미팅 생성
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <form onSubmit={handleSubmit}>
          <FormControl fullWidth margin="normal">
            <InputLabel>템플릿 선택 (선택사항)</InputLabel>
            <Select
              value={selectedTemplate}
              label="템플릿 선택 (선택사항)"
              onChange={handleTemplateChange}
            >
              <MenuItem value="">
                <em>템플릿 없이 시작</em>
              </MenuItem>
              {templates.filter(t => t.is_default).length > 0 && [
                <MenuItem disabled key="default-header">
                  <strong>기본 템플릿</strong>
                </MenuItem>,
                ...templates
                  .filter(t => t.is_default)
                  .map(template => (
                    <MenuItem key={template.id} value={template.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TemplateIcon fontSize="small" />
                        {template.name}
                      </Box>
                    </MenuItem>
                  ))
              ]}
              {templates.filter(t => !t.is_default).length > 0 && [
                <Divider key="divider" />,
                <MenuItem disabled key="custom-header">
                  <strong>커스텀 템플릿</strong>
                </MenuItem>,
                ...templates
                  .filter(t => !t.is_default)
                  .map(template => (
                    <MenuItem key={template.id} value={template.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TemplateIcon fontSize="small" />
                        {template.name}
                      </Box>
                    </MenuItem>
                  ))
              ]}
            </Select>
          </FormControl>

          {selectedTemplate && (
            <Alert severity="info" sx={{ mt: 2 }}>
              템플릿이 적용되었습니다. 아래 내용을 자유롭게 수정하세요.
            </Alert>
          )}

          <TextField
            fullWidth
            label="미팅 제목"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            margin="normal"
          />

          <TextField
            fullWidth
            label="날짜"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleChange}
            required
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label="참석자"
            name="participants"
            value={formData.participants}
            onChange={handleChange}
            margin="normal"
            placeholder="홍길동, 김철수, 이영희"
            helperText="쉼표로 구분하여 입력하세요"
          />

          <TextField
            fullWidth
            label="미팅 내용"
            name="content"
            value={formData.content}
            onChange={handleChange}
            required
            multiline
            rows={12}
            margin="normal"
            placeholder="미팅 내용을 자유롭게 작성하세요...

예:
- 프로젝트 목표 설정
- 주요 마일스톤 논의
- 담당자 배정
- 다음 액션 아이템"
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              미팅이 성공적으로 생성되었습니다! AI 요약이 완료되었습니다.
            </Alert>
          )}

          <Box mt={3} display="flex" gap={2}>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={loading}
            >
              {loading ? 'AI로 정리하고 저장 중...' : 'AI로 정리하고 저장'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/meetings')}
              disabled={loading}
            >
              취소
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
