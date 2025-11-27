import React, { createContext, useContext, useState, useCallback } from 'react';
import { meetingAPI } from '../services/api';

const MeetingContext = createContext();

export const useMeetings = () => {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error('useMeetings must be used within a MeetingProvider');
  }
  return context;
};

export const MeetingProvider = ({ children }) => {
  const [meetings, setMeetings] = useState([]);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMeetings = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await meetingAPI.getAll(filters);
      setMeetings(response.data.meetings || response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMeetingById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await meetingAPI.getById(id);
      setCurrentMeeting(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createMeeting = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await meetingAPI.create(data);
      setMeetings((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMeeting = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await meetingAPI.update(id, data);
      setMeetings((prev) =>
        prev.map((m) => (m.id === id ? response.data : m))
      );
      if (currentMeeting?.id === id) {
        setCurrentMeeting(response.data);
      }
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentMeeting]);

  const deleteMeeting = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await meetingAPI.delete(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      if (currentMeeting?.id === id) {
        setCurrentMeeting(null);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentMeeting]);

  const value = {
    meetings,
    currentMeeting,
    loading,
    error,
    fetchMeetings,
    fetchMeetingById,
    createMeeting,
    updateMeeting,
    deleteMeeting,
  };

  return (
    <MeetingContext.Provider value={value}>
      {children}
    </MeetingContext.Provider>
  );
};
