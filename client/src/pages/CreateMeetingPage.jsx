import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMeetings } from '../context/MeetingContext';

export default function CreateMeetingPage() {
  const navigate = useNavigate();
  const { createMeeting } = useMeetings();

  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    participants: '',
    content: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
