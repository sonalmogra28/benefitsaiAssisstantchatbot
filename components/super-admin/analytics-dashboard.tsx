'use client';

import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';

export function AnalyticsDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // Mock data for now - replace with actual API calls
  useEffect(() => {
    setUsersLoading(true);
    setCompaniesLoading(true);
    setDocumentsLoading(true);
    
    // Simulate API calls
    setTimeout(() => {
      setUsers([]);
      setCompanies([]);
      setDocuments([]);
      setUsersLoading(false);
      setCompaniesLoading(false);
      setDocumentsLoading(false);
    }, 1000);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? 'Loading...' : users.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {companiesLoading ? 'Loading...' : companies.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {documentsLoading ? 'Loading...' : documents.length}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
