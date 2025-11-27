import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Psychology as AiIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState('ai'); // ai, keyword
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [aiAnswer, setAiAnswer] = useState('');
  const [error, setError] = useState('');

  // Advanced filters
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    tags: [],
    participants: ''
  });

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('검색어를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);
    setAiAnswer('');

    try {
      if (searchMode === 'ai') {
        // AI 기반 검색 및 질문 답변
        const response = await axios.post(`${API_URL}/search`, {
          query,
          filters
        });

        setAiAnswer(response.data.answer);
        setResults(response.data.relatedMeetings || []);
      } else {
        // 키워드 기반 검색
        const response = await axios.post(`${API_URL}/search/advanced`, {
          query,
          filters
        });

        setResults(response.data.meetings || []);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleMeetingClick = (meetingId) => {
    navigate(`/meetings/${meetingId}`);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        검색
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>검색 모드</InputLabel>
              <Select
                value={searchMode}
                label="검색 모드"
                onChange={(e) => setSearchMode(e.target.value)}
              >
                <MenuItem value="ai">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AiIcon fontSize="small" />
                    <span>AI 질문 답변</span>
                  </Box>
                </MenuItem>
                <MenuItem value="keyword">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SearchIcon fontSize="small" />
                    <span>키워드 검색</span>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              placeholder={
                searchMode === 'ai'
                  ? '질문을 입력하세요 (예: 프로젝트 일정은 어떻게 되나요?)'
                  : '검색어를 입력하세요'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              InputProps={{
                endAdornment: (
                  <Button
                    variant="contained"
                    onClick={handleSearch}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                  >
                    검색
                  </Button>
                )
              }}
            />
          </Grid>
        </Grid>

        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon fontSize="small" />
              <Typography>고급 필터</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="시작 날짜"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="종료 날짜"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="참석자"
                  size="small"
                  placeholder="이름으로 검색"
                  value={filters.participants}
                  onChange={(e) => setFilters({ ...filters, participants: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setFilters({ dateFrom: '', dateTo: '', tags: [], participants: '' })}
                >
                  필터 초기화
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {aiAnswer && (
        <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f5f5f5' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AiIcon color="primary" />
            <Typography variant="h6">AI 답변</Typography>
          </Box>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{aiAnswer}</Typography>
        </Paper>
      )}

      {results.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            검색 결과 ({results.length}건)
          </Typography>
          <Grid container spacing={2}>
            {results.map((meeting) => (
              <Grid item xs={12} key={meeting.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 3
                    }
                  }}
                  onClick={() => handleMeetingClick(meeting.id)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6">{meeting.title}</Typography>
                      <Chip
                        label={format(new Date(meeting.date), 'yyyy-MM-dd')}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    {meeting.summary && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {meeting.summary.length > 200
                          ? `${meeting.summary.substring(0, 200)}...`
                          : meeting.summary}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {meeting.participants && meeting.participants.split(',').slice(0, 3).map((participant, idx) => (
                        <Chip
                          key={idx}
                          label={participant.trim()}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                      {meeting.participants && meeting.participants.split(',').length > 3 && (
                        <Chip
                          label={`+${meeting.participants.split(',').length - 3}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {!loading && !error && results.length === 0 && query && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">
            검색 결과가 없습니다.
          </Typography>
        </Paper>
      )}

      {!query && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            검색 팁
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                AI 질문 답변 모드
              </Typography>
              <Typography variant="body2" color="text.secondary">
                자연어로 질문하면 AI가 미팅 내용을 분석하여 답변합니다.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                예시:
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    프로젝트 일정은 어떻게 되나요?
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    마케팅 전략에 대한 논의 내용은?
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    누가 담당자로 지정되었나요?
                  </Typography>
                </li>
              </ul>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                키워드 검색 모드
              </Typography>
              <Typography variant="body2" color="text.secondary">
                제목, 내용, 참석자 등에서 키워드를 검색합니다.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                고급 필터를 사용하여:
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    특정 기간의 미팅 검색
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    특정 참석자가 포함된 미팅 검색
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    태그로 미팅 필터링
                  </Typography>
                </li>
              </ul>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
}
