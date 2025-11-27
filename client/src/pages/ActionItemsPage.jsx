import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  ViewKanban as ViewKanbanIcon,
  ViewList as ViewListIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = 'http://localhost:3000/api';

const statusColors = {
  pending: '#FFA726',
  in_progress: '#42A5F5',
  completed: '#66BB6A',
  cancelled: '#EF5350'
};

const statusLabels = {
  pending: '대기',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소'
};

const priorityColors = {
  high: '#EF5350',
  medium: '#FFA726',
  low: '#66BB6A'
};

const priorityLabels = {
  high: '높음',
  medium: '중간',
  low: '낮음'
};

export default function ActionItemsPage() {
  const [actionItems, setActionItems] = useState([]);
  const [viewMode, setViewMode] = useState('kanban'); // kanban, list, calendar
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee: '',
    due_date: '',
    priority: 'medium',
    status: 'pending'
  });

  useEffect(() => {
    fetchActionItems();
  }, []);

  const fetchActionItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/action-items`);
      setActionItems(response.data);
    } catch (error) {
      console.error('Failed to fetch action items:', error);
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      if (editingItem) {
        await axios.put(`${API_URL}/action-items/${editingItem.id}`, formData);
      } else {
        await axios.post(`${API_URL}/action-items`, formData);
      }
      fetchActionItems();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save action item:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('이 액션 아이템을 삭제하시겠습니까?')) {
      try {
        await axios.delete(`${API_URL}/action-items/${id}`);
        fetchActionItems();
      } catch (error) {
        console.error('Failed to delete action item:', error);
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`${API_URL}/action-items/${id}/status`, { status: newStatus });
      fetchActionItems();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId !== destination.droppableId) {
      const newStatus = destination.droppableId;
      handleStatusChange(parseInt(draggableId), newStatus);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        description: item.description || '',
        assignee: item.assignee || '',
        due_date: item.due_date || '',
        priority: item.priority || 'medium',
        status: item.status
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        description: '',
        assignee: '',
        due_date: '',
        priority: 'medium',
        status: 'pending'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const getFilteredItems = () => {
    return actionItems.filter(item => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
      return true;
    });
  };

  const getItemsByStatus = (status) => {
    return getFilteredItems().filter(item => item.status === status);
  };

  const renderActionItemCard = (item, index) => (
    <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          sx={{
            mb: 2,
            backgroundColor: snapshot.isDragging ? '#f5f5f5' : 'white',
            boxShadow: snapshot.isDragging ? 4 : 1,
            '&:hover': {
              boxShadow: 3
            }
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                {item.title}
              </Typography>
              <Chip
                label={priorityLabels[item.priority]}
                size="small"
                sx={{
                  backgroundColor: priorityColors[item.priority],
                  color: 'white'
                }}
              />
            </Box>
            {item.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {item.description}
              </Typography>
            )}
            {item.assignee && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                담당자: <strong>{item.assignee}</strong>
              </Typography>
            )}
            {item.due_date && (
              <Typography variant="body2" color="text.secondary">
                마감일: {format(new Date(item.due_date), 'yyyy-MM-dd')}
              </Typography>
            )}
          </CardContent>
          <CardActions>
            <IconButton size="small" onClick={() => handleOpenDialog(item)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => handleDelete(item.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </CardActions>
        </Card>
      )}
    </Draggable>
  );

  const renderKanbanView = () => {
    const statuses = ['pending', 'in_progress', 'completed', 'cancelled'];

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {statuses.map(status => (
            <Grid item xs={12} md={3} key={status}>
              <Paper sx={{ p: 2, backgroundColor: '#fafafa', minHeight: '500px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: statusColors[status],
                      mr: 1
                    }}
                  />
                  <Typography variant="h6">
                    {statusLabels[status]} ({getItemsByStatus(status).length})
                  </Typography>
                </Box>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        backgroundColor: snapshot.isDraggingOver ? '#e3f2fd' : 'transparent',
                        minHeight: 400,
                        borderRadius: 1,
                        p: 1
                      }}
                    >
                      {getItemsByStatus(status).map((item, index) =>
                        renderActionItemCard(item, index)
                      )}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DragDropContext>
    );
  };

  const renderListView = () => {
    return (
      <Grid container spacing={2}>
        {getFilteredItems().map((item) => (
          <Grid item xs={12} key={item.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">{item.title}</Typography>
                    {item.description && (
                      <Typography variant="body2" color="text.secondary">
                        {item.description}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={statusLabels[item.status]}
                      size="small"
                      sx={{
                        backgroundColor: statusColors[item.status],
                        color: 'white'
                      }}
                    />
                    <Chip
                      label={priorityLabels[item.priority]}
                      size="small"
                      sx={{
                        backgroundColor: priorityColors[item.priority],
                        color: 'white'
                      }}
                    />
                    {item.assignee && (
                      <Chip label={item.assignee} size="small" variant="outlined" />
                    )}
                    {item.due_date && (
                      <Typography variant="body2" color="text.secondary">
                        {format(new Date(item.due_date), 'yyyy-MM-dd')}
                      </Typography>
                    )}
                    <IconButton size="small" onClick={() => handleOpenDialog(item)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(item.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">액션 아이템</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          새 액션 아이템
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="kanban">
                <ViewKanbanIcon sx={{ mr: 1 }} /> 칸반
              </ToggleButton>
              <ToggleButton value="list">
                <ViewListIcon sx={{ mr: 1 }} /> 리스트
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>상태 필터</InputLabel>
              <Select
                value={filterStatus}
                label="상태 필터"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="pending">대기</MenuItem>
                <MenuItem value="in_progress">진행중</MenuItem>
                <MenuItem value="completed">완료</MenuItem>
                <MenuItem value="cancelled">취소</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>우선순위 필터</InputLabel>
              <Select
                value={filterPriority}
                label="우선순위 필터"
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="high">높음</MenuItem>
                <MenuItem value="medium">중간</MenuItem>
                <MenuItem value="low">낮음</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {viewMode === 'kanban' && renderKanbanView()}
      {viewMode === 'list' && renderListView()}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? '액션 아이템 수정' : '새 액션 아이템'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="제목"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <TextField
              label="설명"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              label="담당자"
              fullWidth
              value={formData.assignee}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
            />
            <TextField
              label="마감일"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>우선순위</InputLabel>
              <Select
                value={formData.priority}
                label="우선순위"
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <MenuItem value="high">높음</MenuItem>
                <MenuItem value="medium">중간</MenuItem>
                <MenuItem value="low">낮음</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                label="상태"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="pending">대기</MenuItem>
                <MenuItem value="in_progress">진행중</MenuItem>
                <MenuItem value="completed">완료</MenuItem>
                <MenuItem value="cancelled">취소</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleCreateOrUpdate} variant="contained">
            {editingItem ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
