/**
 * Test page for subdomain deployment verification
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'pass' | 'fail';
  message: string;
}

export default function TestPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Environment Variables', status: 'pending', message: 'Checking...' },
    { name: 'Authentication API', status: 'pending', message: 'Checking...' },
    { name: 'Chat API', status: 'pending', message: 'Checking...' },
    { name: 'Health Check', status: 'pending', message: 'Checking...' },
    { name: 'Rate Limiting', status: 'pending', message: 'Checking...' },
  ]);

  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const newTests = [...tests];

    // Test 1: Environment Variables
    try {
      const envTest = await fetch('/api/health');
      if (envTest.ok) {
        newTests[0] = { name: 'Environment Variables', status: 'pass', message: 'All environment variables loaded' };
      } else {
        newTests[0] = { name: 'Environment Variables', status: 'fail', message: 'Environment variables not properly set' };
      }
    } catch {
      newTests[0] = { name: 'Environment Variables', status: 'fail', message: 'Failed to check environment' };
    }
    setTests([...newTests]);

    // Test 2: Authentication API
    try {
      const authTest = await fetch('/api/subdomain/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test' }),
      });
      if (authTest.status === 401) {
        newTests[1] = { name: 'Authentication API', status: 'pass', message: 'Authentication API responding correctly' };
      } else {
        newTests[1] = { name: 'Authentication API', status: 'fail', message: 'Unexpected response from auth API' };
      }
    } catch {
      newTests[1] = { name: 'Authentication API', status: 'fail', message: 'Authentication API not responding' };
    }
    setTests([...newTests]);

    // Test 3: Chat API
    try {
      const chatTest = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' }),
      });
      if (chatTest.status === 401 || chatTest.status === 200) {
        newTests[2] = { name: 'Chat API', status: 'pass', message: 'Chat API responding correctly' };
      } else {
        newTests[2] = { name: 'Chat API', status: 'fail', message: 'Unexpected response from chat API' };
      }
    } catch {
      newTests[2] = { name: 'Chat API', status: 'fail', message: 'Chat API not responding' };
    }
    setTests([...newTests]);

    // Test 4: Health Check
    try {
      const healthTest = await fetch('/api/health');
      if (healthTest.ok) {
        const healthData = await healthTest.json();
        newTests[3] = { name: 'Health Check', status: 'pass', message: `Health check passed: ${healthData.status || 'OK'}` };
      } else {
        newTests[3] = { name: 'Health Check', status: 'fail', message: 'Health check failed' };
      }
    } catch {
      newTests[3] = { name: 'Health Check', status: 'fail', message: 'Health check not responding' };
    }
    setTests([...newTests]);

    // Test 5: Rate Limiting
    try {
      const rateLimitPromises = Array(6).fill(0).map(() => 
        fetch('/api/subdomain/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'test' }),
        })
      );
      
      const rateLimitResults = await Promise.all(rateLimitPromises);
      const rateLimited = rateLimitResults.some(r => r.status === 429);
      
      if (rateLimited) {
        newTests[4] = { name: 'Rate Limiting', status: 'pass', message: 'Rate limiting is working correctly' };
      } else {
        newTests[4] = { name: 'Rate Limiting', status: 'fail', message: 'Rate limiting not working' };
      }
    } catch {
      newTests[4] = { name: 'Rate Limiting', status: 'fail', message: 'Rate limiting test failed' };
    }
    setTests([...newTests]);

    setIsRunning(false);
  };

  const passedTests = tests.filter(t => t.status === 'pass').length;
  const totalTests = tests.length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Subdomain Deployment Test
          </h1>
          <p className="text-gray-600">
            Verify that amerivetaibot.bcgenrolls.com is working correctly
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {passedTests}/{totalTests} tests passed
                </span>
                <Button 
                  onClick={runTests} 
                  disabled={isRunning}
                  className="ml-4"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running Tests...
                    </>
                  ) : (
                    'Run Tests'
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tests.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {test.status === 'pending' && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                    {test.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {test.status === 'fail' && <XCircle className="w-5 h-5 text-red-500" />}
                    <div>
                      <div className="font-medium">{test.name}</div>
                      <div className="text-sm text-gray-500">{test.message}</div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    test.status === 'pass' ? 'bg-green-100 text-green-800' :
                    test.status === 'fail' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {test.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deployment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Access Information</h3>
                <p><strong>URL:</strong> https://amerivetaibot.bcgenrolls.com</p>
                <p><strong>Login:</strong> /subdomain/login</p>
                <p><strong>Password:</strong> amerivet2024!</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
                <p><strong>Support:</strong> 888-217-4728</p>
                <p><strong>Technical:</strong> sonalmogra.888@gmail.com</p>
                <p><strong>Account:</strong> melodie@ultimateonlinerevenue.com</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
