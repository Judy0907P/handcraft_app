import React, { createContext, useContext, useState, useEffect } from 'react';
import { Organization } from '../types';
import { organizationsApi } from '../services/api';

interface OrgContextType {
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization | null) => void;
  organizations: Organization[];
  refreshOrganizations: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    // Load current org from localStorage
    const storedOrg = localStorage.getItem('currentOrg');
    if (storedOrg) {
      setCurrentOrgState(JSON.parse(storedOrg));
    }
    refreshOrganizations();
  }, []);

  const setCurrentOrg = (org: Organization | null) => {
    if (org) {
      localStorage.setItem('currentOrg', JSON.stringify(org));
    } else {
      localStorage.removeItem('currentOrg');
    }
    setCurrentOrgState(org);
  };

  const refreshOrganizations = async () => {
    try {
      const response = await organizationsApi.getAll();
      setOrganizations(response.data);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  return (
    <OrgContext.Provider value={{ currentOrg, setCurrentOrg, organizations, refreshOrganizations }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
};

