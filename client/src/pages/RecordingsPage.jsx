import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  LinearProgress,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Mic as MicIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Description as TranscriptIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function RecordingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [recordings, setRecordings] = useState([]);
  const [language, setLanguage] = useState('ko');

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    if (selectedMeeting) {
      fetchRecordings(selectedMeeting);
    }
  }, [selectedMeeting]);

  const fetchMeetings = async () => {
    try {
      const response = await axios.get(`${API_URL}/meetings`);
      const meetingsData = response.data.meetings || response.data;
      setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      setError('미팅 목록을 불러오는데 실패했습니다.');
    }
  };

  const fetchRecordings = async (meetingId) => {
    try {
      const response = await axios.get(`${API_URL}/recordings/meeting/${meetingId}`);
      setRecordings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/ogg', 'audio/flac'];
      const allowedExtensions = /\.(mp3|wav|m4a|webm|mp4|mpeg|mpga|ogg|flac)$/i;

      if (!allowedTypes.includes(file.type) && !allowedExtensions.test(file.name)) {
        setError('지원되지 않는 파일 형식입니다. mp3, wav, m4a, webm, mp4, ogg, flac 파일만 업로드 가능합니다.');
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        setError('파일 크기는 25MB를 초과할 수 없습니다.');
        return;
      }

      setSelectedFile(file);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('파일을 선택해주세요.');
      return;
    }

    if (!selectedMeeting) {
      setError('미팅을 선택해주세요.');
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);
    setResult(null);

    const formData = new FormData();
    formData.append('audio', selectedFile);
    formData.append('meetingId', selectedMeeting);
    formData.append('language', language);

    try {
      const response = await axios.post(`${API_URL}/recordings/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        },
      });

      setResult(response.data);
      setSelectedFile(null);
      fetchRecordings(selectedMeeting);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || '업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (recordingId) => {
    if (!window.confirm('이 녹음 파일을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/recordings/${recordingId}`);
      fetchRecordings(selectedMeeting);
    } catch (error) {
      console.error('Delete error:', error);
      setError('삭제 중 오류가 발생했습니다.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <MicIcon sx={{ fontSize: 40 }} />
        <Typography variant="h4">음성 녹음 & 전사</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              새 녹음 파일 업로드
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>미팅 선택</InputLabel>
              <Select
                value={selectedMeeting}
                label="미팅 선택"
                onChange={(e) => setSelectedMeeting(e.target.value)}
              >
                <MenuItem value="">선택하세요</MenuItem>
                {meetings.map((meeting) => (
                  <MenuItem key={meeting.id} value={meeting.id}>
                    {meeting.title} ({format(new Date(meeting.date), 'yyyy-MM-dd')})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>언어</InputLabel>
              <Select
                value={language}
                label="언어"
                onChange={(e) => setLanguage(e.target.value)}
              >
                <MenuItem value="ko">한국어</MenuItem>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="ja">日本語</MenuItem>
                <MenuItem value="zh">中文</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ mb: 2 }}>
              <input
                accept="audio/*,.mp3,.wav,.m4a,.webm,.mp4,.mpeg,.mpga,.ogg,.flac"
                style={{ display: 'none' }}
                id="audio-file-input"
                type="file"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <label htmlFor="audio-file-input">
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                  startIcon={<UploadIcon />}
                  disabled={uploading}
                >
                  파일 선택
                </Button>
              </label>
            </Box>

            {selectedFile && (
              <Alert severity="info" sx={{ mb: 2 }}>
                선택된 파일: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {uploading && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  {progress < 100 ? '파일 업로드 중...' : '음성 전사 중...'}
                </Typography>
                <LinearProgress variant={progress < 100 ? 'determinate' : 'indeterminate'} value={progress} />
              </Box>
            )}

            {result && (
              <Alert severity="success" sx={{ mb: 2 }}>
                전사가 완료되었습니다!
                {result.duration && ` (${formatDuration(result.duration)})`}
              </Alert>
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={handleUpload}
              disabled={!selectedFile || !selectedMeeting || uploading}
              startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
            >
              {uploading ? '처리 중...' : '업로드 & 전사'}
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              지원 형식: MP3, WAV, M4A, WebM, MP4, OGG, FLAC (최대 25MB)
            </Typography>
          </Paper>

          {result && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                전사 결과
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{
                maxHeight: 300,
                overflow: 'auto',
                backgroundColor: '#f5f5f5',
                p: 2,
                borderRadius: 1
              }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {result.text}
                </Typography>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Chip label={`언어: ${result.language}`} size="small" />
                {result.duration && (
                  <Chip label={`길이: ${formatDuration(result.duration)}`} size="small" />
                )}
              </Box>
            </Paper>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              녹음 파일 목록
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {!selectedMeeting && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                미팅을 선택하면 녹음 파일 목록이 표시됩니다.
              </Typography>
            )}

            {selectedMeeting && recordings.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                아직 업로드된 녹음 파일이 없습니다.
              </Typography>
            )}

            {recordings.map((recording) => (
              <Card key={recording.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">
                        녹음 #{recording.id}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <Chip label={recording.format.toUpperCase()} size="small" variant="outlined" />
                        <Chip label={formatFileSize(recording.file_size)} size="small" variant="outlined" />
                        {recording.duration && (
                          <Chip label={formatDuration(recording.duration)} size="small" variant="outlined" />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        업로드: {format(new Date(recording.uploaded_at), 'yyyy-MM-dd HH:mm')}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(recording.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
