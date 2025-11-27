import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Box } from '@mui/material'

// Pages
import HomePage from './pages/HomePage'
import MeetingsPage from './pages/MeetingsPage'
import MeetingDetailPage from './pages/MeetingDetailPage'
import CreateMeetingPage from './pages/CreateMeetingPage'
import ActionItemsPage from './pages/ActionItemsPage'
import TagsPage from './pages/TagsPage'
import SearchPage from './pages/SearchPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import RecordingsPage from './pages/RecordingsPage'
import TemplatesPage from './pages/TemplatesPage'

// Layout
import MainLayout from './components/layout/MainLayout'

// Context
import { MeetingProvider } from './context/MeetingContext'

function App() {
  return (
    <MeetingProvider>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
            <Route path="/meetings/new" element={<CreateMeetingPage />} />
            <Route path="/meetings/:id" element={<MeetingDetailPage />} />
            <Route path="/action-items" element={<ActionItemsPage />} />
            <Route path="/recordings" element={<RecordingsPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </MainLayout>
      </Router>
    </MeetingProvider>
  )
}

export default App
