import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Studio } from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface StudioContextType {
  studios: Studio[];
  activeStudio: Studio | null;
  activeStudioId: string;
  loading: boolean;
  isMaxStudios: boolean;
  switchStudio: (id: string) => Promise<void>;
  createStudio: (data: Partial<Studio>) => Promise<Studio>;
  updateStudio: (id: string, data: Partial<Studio>) => Promise<Studio>;
  deleteStudio: (id: string) => Promise<void>;
  refreshStudios: () => Promise<void>;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [activeStudio, setActiveStudio] = useState<Studio | null>(null);
  const [activeStudioId, setActiveStudioId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStudios = useCallback(async () => {
    try {
      setLoading(true);
      const list = await api.studios.getAll();
      const savedActiveId = localStorage.getItem(`ergon_active_studio_${user?.id}`) || list?.[0]?.id || '';
      const active = (list || []).find((s) => s.id === savedActiveId) || list?.[0] || null;
      setStudios(list || []);
      setActiveStudio(active);
      setActiveStudioId(active?.id || '');
    } catch (err) {
      console.error('Failed to load studios', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStudios();
  }, [user?.id, fetchStudios]);

  const switchStudio = async (id: string) => {
    try {
      setLoading(true);
      localStorage.setItem(`ergon_active_studio_${user?.id}`, id);
      const found = studios.find((s) => s.id === id) || (await api.studios.getById(id));
      setActiveStudio(found);
      setActiveStudioId(found.id);
      await fetchStudios();
      // Dispatch custom event to notify all components that active studio changed
      window.dispatchEvent(new CustomEvent('ergon:studio-changed', { detail: { studioId: id } }));
    } catch (err) {
      console.error('Failed to switch studio', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createStudio = async (data: Partial<Studio>): Promise<Studio> => {
    if (studios.length >= 5) {
      throw new Error('Studio limit reached. You can create a maximum of 5 studios.');
    }
    const created = await api.studios.create(data);
    await fetchStudios();
    window.dispatchEvent(new CustomEvent('ergon:studio-changed', { detail: { studioId: created.id } }));
    return created;
  };

  const updateStudio = async (id: string, data: Partial<Studio>): Promise<Studio> => {
    const updated = await api.studios.update(id, data);
    await fetchStudios();
    window.dispatchEvent(new CustomEvent('ergon:studio-changed', { detail: { studioId: id } }));
    return updated;
  };

  const deleteStudio = async (id: string): Promise<void> => {
    if (studios.length <= 1) {
      throw new Error('Cannot delete your only studio.');
    }
    await api.studios.delete(id);
    await fetchStudios();
    window.dispatchEvent(new CustomEvent('ergon:studio-changed'));
  };

  const isMaxStudios = studios.length >= 5;

  return (
    <StudioContext.Provider
      value={{
        studios,
        activeStudio,
        activeStudioId,
        loading,
        isMaxStudios,
        switchStudio,
        createStudio,
        updateStudio,
        deleteStudio,
        refreshStudios: fetchStudios,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = (): StudioContextType => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};
