import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const API_URL = 'http://localhost:3000/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsPage() {
  const [meetings, setMeetings] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [tags, setTags] = useState([]);
  const [timeRange, setTimeRange] = useState('6months');
  const [stats, setStats] = useState({
    totalMeetings: 0,
    totalActionItems: 0,
    completedActions: 0,
    activeParticipants: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (Array.isArray(meetings) && Array.isArray(actionItems)) {
      calculateStats();
    }
  }, [meetings, actionItems, timeRange]);

  const fetchData = async () => {
    try {
      const [meetingsRes, actionItemsRes, tagsRes] = await Promise.all([
        axios.get(`${API_URL}/meetings`),
        axios.get(`${API_URL}/action-items`),
        axios.get(`${API_URL}/tags`)
      ]);

      // meetings API는 {meetings: [...], pagination: {...}} 형식으로 반환
      const meetingsData = meetingsRes.data.meetings || meetingsRes.data;
      setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
      setActionItems(Array.isArray(actionItemsRes.data) ? actionItemsRes.data : []);
      setTags(Array.isArray(tagsRes.data) ? tagsRes.data : []);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      setMeetings([]);
      setActionItems([]);
      setTags([]);
    }
  };

  const calculateStats = () => {
    if (!Array.isArray(meetings) || !Array.isArray(actionItems)) {
      return;
    }

    const filteredMeetings = getFilteredMeetings();

    // 필터링된 미팅의 ID들을 가져옴
    const filteredMeetingIds = new Set(filteredMeetings.map(m => m.id));

    // 필터링된 미팅에 속한 액션 아이템만 계산
    const filteredActionItems = actionItems.filter(item =>
      !item.meeting_id || filteredMeetingIds.has(item.meeting_id)
    );

    const completedActions = filteredActionItems.filter(item => item.status === 'completed').length;
    const participants = new Set();

    filteredMeetings.forEach(meeting => {
      if (meeting.participants) {
        meeting.participants.split(',').forEach(p => participants.add(p.trim()));
      }
    });

    setStats({
      totalMeetings: filteredMeetings.length,
      totalActionItems: filteredActionItems.length,
      completedActions,
      activeParticipants: participants.size
    });
  };

  const getFilteredMeetings = () => {
    if (!Array.isArray(meetings)) {
      return [];
    }

    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '1month':
        startDate = subMonths(now, 1);
        break;
      case '3months':
        startDate = subMonths(now, 3);
        break;
      case '6months':
        startDate = subMonths(now, 6);
        break;
      case '1year':
        startDate = subMonths(now, 12);
        break;
      default:
        return meetings;
    }

    return meetings.filter(m => new Date(m.date) >= startDate);
  };

  const getMeetingTrendData = () => {
    const filteredMeetings = getFilteredMeetings();
    const monthMap = new Map();

    filteredMeetings.forEach(meeting => {
      const date = new Date(meeting.date);
      const monthKey = format(date, 'yyyy-MM');
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    });

    const sortedData = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({
        month: format(new Date(month + '-01'), 'yyyy년 MM월'),
        meetings: count
      }));

    return sortedData;
  };

  const getActionItemStatusData = () => {
    if (!Array.isArray(actionItems) || !Array.isArray(meetings)) {
      return [];
    }

    const filteredMeetings = getFilteredMeetings();
    const filteredMeetingIds = new Set(filteredMeetings.map(m => m.id));

    // 필터링된 미팅에 속한 액션 아이템만
    const filteredActionItems = actionItems.filter(item =>
      !item.meeting_id || filteredMeetingIds.has(item.meeting_id)
    );

    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    };

    filteredActionItems.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });

    return [
      { name: '대기', value: statusCounts.pending, status: 'pending' },
      { name: '진행중', value: statusCounts.in_progress, status: 'in_progress' },
      { name: '완료', value: statusCounts.completed, status: 'completed' },
      { name: '취소', value: statusCounts.cancelled, status: 'cancelled' }
    ].filter(item => item.value > 0);
  };

  const getTopTagsData = () => {
    if (!Array.isArray(tags)) {
      return [];
    }

    const tagCounts = new Map();

    tags.forEach(tag => {
      if (tag.usage_count > 0) {
        tagCounts.set(tag.name, tag.usage_count);
      }
    });

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  };

  const getTopParticipantsData = () => {
    if (!Array.isArray(meetings)) {
      return [];
    }

    const participantCounts = new Map();
    const filteredMeetings = getFilteredMeetings();

    filteredMeetings.forEach(meeting => {
      if (meeting.participants) {
        meeting.participants.split(',').forEach(p => {
          const name = p.trim();
          participantCounts.set(name, (participantCounts.get(name) || 0) + 1);
        });
      }
    });

    return Array.from(participantCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  };

  const getKeywordCloudData = () => {
    if (!Array.isArray(meetings)) {
      return [];
    }

    const wordCounts = new Map();
    const filteredMeetings = getFilteredMeetings();

    const stopWords = new Set(['은', '는', '이', '가', '을', '를', '의', '에', '와', '과', '도', '로', '으로', '에서', '부터', '까지', '등', '및', '그', '저', '이것', '저것']);

    filteredMeetings.forEach(meeting => {
      const text = `${meeting.title || ''} ${meeting.summary || ''} ${meeting.overview || ''}`;
      const words = text.split(/\s+/);

      words.forEach(word => {
        const cleaned = word.replace(/[^가-힣a-zA-Z0-9]/g, '');
        if (cleaned.length >= 2 && !stopWords.has(cleaned)) {
          wordCounts.set(cleaned, (wordCounts.get(cleaned) || 0) + 1);
        }
      });
    });

    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([text, value]) => ({ text, value }));
  };

  const renderKeywordCloud = () => {
    const keywords = getKeywordCloudData();

    if (keywords.length === 0) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography color="text.secondary">
            키워드 데이터가 충분하지 않습니다. 미팅을 더 추가해주세요.
          </Typography>
        </Box>
      );
    }

    const maxValue = Math.max(...keywords.map(k => k.value));

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', p: 2 }}>
        {keywords.map((keyword, index) => {
          const fontSize = 12 + (keyword.value / maxValue) * 24;
          const color = COLORS[index % COLORS.length];

          return (
            <Box
              key={keyword.text}
              sx={{
                fontSize: `${fontSize}px`,
                color,
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'scale(1.2)',
                  color: '#000'
                }
              }}
            >
              {keyword.text}
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">분석</Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>기간</InputLabel>
          <Select
            value={timeRange}
            label="기간"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="1month">최근 1개월</MenuItem>
            <MenuItem value="3months">최근 3개월</MenuItem>
            <MenuItem value="6months">최근 6개월</MenuItem>
            <MenuItem value="1year">최근 1년</MenuItem>
            <MenuItem value="all">전체</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    총 미팅
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalMeetings}
                  </Typography>
                </Box>
                <EventIcon sx={{ fontSize: 40, color: '#1976d2' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    액션 아이템
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalActionItems}
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: '#2e7d32' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    완료율
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalActionItems > 0
                      ? Math.round((stats.completedActions / stats.totalActionItems) * 100)
                      : 0}%
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: '#ed6c02' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    참여자
                  </Typography>
                  <Typography variant="h4">
                    {stats.activeParticipants}
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: '#9c27b0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              미팅 트렌드
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getMeetingTrendData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="meetings" stroke="#1976d2" strokeWidth={2} name="미팅 수" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              액션 아이템 상태
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getActionItemStatusData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getActionItemStatusData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              인기 태그 Top 10
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getTopTagsData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#00C49F" name="사용 횟수" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              참여 빈도 Top 10
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getTopParticipantsData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="참여 횟수" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              키워드 클라우드
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              미팅에서 자주 언급되는 주요 키워드를 시각화합니다
            </Typography>
            {renderKeywordCloud()}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
