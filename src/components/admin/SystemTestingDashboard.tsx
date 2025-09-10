import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TestTube, Mail, Users, Home, Database, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';

// Import test utilities
import { PropertyAlertTester } from '@/utils/testPropertyAlerts';
import PropertyAlertService from '@/services/propertyAlertService';
import EmailService from '@/services/emailService';
import { appointmentService } from '@/services/appointmentService';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp: string;
}

// Mock toast function since it's not available
const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
  console.log(`Toast: ${title} - ${description} (${variant || 'default'})`);
};

export default function SystemTestingDashboard() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('property-alerts');

  // Property Alert Test State
  const [testPropertyId, setTestPropertyId] = useState('');
  const [testBuyerEmail, setTestBuyerEmail] = useState('test@example.com');

  // Email Test State
  const [emailTemplate, setEmailTemplate] = useState('welcome');
  const [emailRecipient, setEmailRecipient] = useState('test@example.com');
  const [emailData, setEmailData] = useState('{"name": "Test User", "email": "test@example.com"}');

  // Appointment Test State
  const [testAppointmentId, setTestAppointmentId] = useState('');
  const [testAppointmentStatus, setTestAppointmentStatus] = useState('confirmed');

  // Test Data Creation State
  const [testBuyerData, setTestBuyerData] = useState({
    email: 'testbuyer@example.com',
    name: 'Test Buyer',
    location: 'Sydney, NSW',
    budget: 800000,
    bedrooms: 3,
    bathrooms: 2
  });

  const [testPropertyData, setTestPropertyData] = useState({
    title: 'Test Property',
    price: 750000,
    city: 'Sydney',
    state: 'NSW',
    bedrooms: 3,
    bathrooms: 2,
    property_type: 'House'
  });

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const runPropertyAlertTest = async () => {
    if (!testPropertyId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a property ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await PropertyAlertService.testAlertSystem(testPropertyId);
      addTestResult({
        success: result.success,
        message: result.success 
          ? `Property alert test completed. Found ${result.result?.matchesFound || 0} matches, sent ${result.result?.alertsSent || 0} alerts.`
          : `Property alert test failed: ${result.error}`,
        data: result.result,
        error: result.error,
        timestamp: new Date().toLocaleString()
      });

      toast({
        title: result.success ? "Success" : "Error",
        description: result.success ? "Property alert test completed" : result.error,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addTestResult({
        success: false,
        message: `Property alert test failed: ${errorMessage}`,
        error: errorMessage,
        timestamp: new Date().toLocaleString()
      });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };// Add this debugging code to your runEmailTest function

  const runEmailTest = async () => {
    // Enhanced validation
    const trimmedRecipient = emailRecipient.trim();
    
    console.log('Email recipient (raw):', JSON.stringify(emailRecipient));
    console.log('Email recipient (trimmed):', JSON.stringify(trimmedRecipient));
    console.log('Email recipient length:', trimmedRecipient.length);
    
    if (!trimmedRecipient) {
      toast({
        title: "Error",
        description: "Please enter an email recipient",
        variant: "destructive"
      });
      return;
    }
  
    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedRecipient)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address format (email@example.com)",
        variant: "destructive"
      });
      return;
    }
  
    setIsLoading(true);
    try {
      let data;
      try {
        data = JSON.parse(emailData);
      } catch {
        data = { name: "Test User", email: trimmedRecipient };
      }
  
      // Log the data being sent
      console.log('Email data:', data);
      console.log('Email template:', emailTemplate);
  
      let result;
      switch (emailTemplate) {
        case 'welcome':
          console.log('Sending welcome email to:', trimmedRecipient);
          result = await EmailService.sendWelcomeEmail(trimmedRecipient, data.name, data);
          break;
        case 'propertyAlert':
          console.log('Sending property alert to:', trimmedRecipient);
          result = await EmailService.sendPropertyAlert(trimmedRecipient, data.name, {
            title: data.title || 'Test Property',
            price: data.price || 500000,
            location: data.location || 'Test Location',
            propertyType: data.propertyType || 'House',
            bedrooms: data.bedrooms || 3,
            bathrooms: data.bathrooms || 2,
            propertyUrl: data.propertyUrl || 'https://baviiii.github.io/pickfirst-firstlook-signup'
          });
          break;
        case 'appointmentConfirmation':
          console.log('Sending appointment confirmation to:', trimmedRecipient);
          result = await EmailService.sendAppointmentConfirmation(trimmedRecipient, data.name, {
            propertyTitle: data.propertyTitle || 'Test Property',
            date: data.date || '2024-01-15',
            time: data.time || '2:00 PM',
            agentName: data.agentName || 'Test Agent',
            agentPhone: data.agentPhone || '0400 000 000'
          });
          break;
        default:
          throw new Error('Invalid email template');
      }
  
      addTestResult({
        success: true,
        message: `${emailTemplate} email sent successfully to ${trimmedRecipient}`,
        data: result,
        timestamp: new Date().toLocaleString()
      });
  
      toast({
        title: "Success",
        description: "Email sent successfully",
      });
    } catch (error) {
      console.error('Email test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addTestResult({
        success: false,
        message: `Email test failed: ${errorMessage}`,
        error: errorMessage,
        timestamp: new Date().toLocaleString()
      });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTestBuyerAccount = async () => {
    setIsLoading(true);
    try {
      const result = await PropertyAlertTester.createTestBuyer(testBuyerData);
      addTestResult({
        success: result.success,
        message: result.success 
          ? `Test buyer created successfully: ${testBuyerData.email}` 
          : `Failed to create test buyer: ${result.error}`,
        data: result,
        error: result.error,
        timestamp: new Date().toLocaleString()
      });

      toast({
        title: result.success ? "Success" : "Error",
        description: result.success ? "Test buyer account created" : result.error,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addTestResult({
        success: false,
        message: `Failed to create test buyer: ${errorMessage}`,
        error: errorMessage,
        timestamp: new Date().toLocaleString()
      });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTestPropertyListing = async () => {
    setIsLoading(true);
    try {
      const result = await PropertyAlertTester.createTestProperty(testPropertyData);
      addTestResult({
        success: result.success,
        message: result.success 
          ? `Test property created successfully: ${testPropertyData.title}` 
          : `Failed to create test property: ${result.error}`,
        data: result,
        error: result.error,
        timestamp: new Date().toLocaleString()
      });

      toast({
        title: result.success ? "Success" : "Error",
        description: result.success ? "Test property listing created" : result.error,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addTestResult({
        success: false,
        message: `Failed to create test property: ${errorMessage}`,
        error: errorMessage,
        timestamp: new Date().toLocaleString()
      });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runFullSystemTest = async () => {
    setIsLoading(true);
    try {
      const result = await PropertyAlertTester.testCompleteFlow();
      addTestResult({
        success: result.success,
        message: result.success 
          ? `Full system test completed successfully. ${result.results?.alerts?.alertsSent || 0} alerts sent.`
          : `Full system test failed: ${result.error}`,
        data: result.results,
        error: result.error,
        timestamp: new Date().toLocaleString()
      });

      toast({
        title: result.success ? "Success" : "Error",
        description: result.success ? "Full system test completed" : result.error,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addTestResult({
        success: false,
        message: `Full system test failed: ${errorMessage}`,
        error: errorMessage,
        timestamp: new Date().toLocaleString()
      });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runAppointmentStatusTest = async () => {
    if (!testAppointmentId) {
      addTestResult({ 
        success: false, 
        message: 'Please enter an appointment ID to test',
        timestamp: new Date().toISOString()
      });
      return;
    }

    setIsLoading(true);
    addTestResult({ 
      success: false, 
      message: 'Testing appointment status update...',
      timestamp: new Date().toISOString() 
    });
    
    try {
      const result = await appointmentService.updateAppointment(testAppointmentId, { 
        status: testAppointmentStatus as any 
      });
      
      if (result.error) {
        addTestResult({ 
          success: false, 
          message: `Appointment status update failed: ${result.error.message}`,
          data: { error: result.error },
          timestamp: new Date().toISOString()  // Add this line
        });
      } else {
        addTestResult({ 
          success: true, 
          message: `Appointment status updated to ${testAppointmentStatus}`,
          data: { appointmentId: testAppointmentId, newStatus: testAppointmentStatus },
          timestamp: new Date().toISOString()  // Add this line
        });
      }
    } catch (error: any) {
      addTestResult({ 
        success: false, 
        message: `Appointment test failed: ${error.message}`,
        data: { error: error.message },
        timestamp: new Date().toISOString()  // Add this line
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runAppointmentEmailTest = async () => {
    setIsLoading(true);
    addTestResult({ 
      success: false, 
      message: 'Testing appointment status email...',
      timestamp: new Date().toISOString()
    });
    
    try {
      await EmailService.sendAppointmentStatusUpdate(
        emailRecipient,
        'Test User',
        {
          clientName: 'Test Client',
          appointmentType: 'Property Showing',
          date: '2024-12-25',
          time: '10:00 AM',
          location: '123 Test Street, Test City',
          status: testAppointmentStatus,
          statusMessage: 'This is a test appointment status update'
        }
      );
      
      addTestResult({ 
        success: true, 
        message: `Appointment status email sent to ${emailRecipient}`,
        data: { status: testAppointmentStatus, recipient: emailRecipient },
        timestamp: new Date().toISOString()  // Add this line
      });
    } catch (error: any) {
      addTestResult({ 
        success: false, 
        message: `Appointment email test failed: ${error.message}`,
        data: { error: error.message },
        timestamp: new Date().toISOString()  // Add this line
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Testing Dashboard</h1>
          <p className="text-gray-600 mt-2">Test and validate all system components with real data</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <TestTube className="w-4 h-4 mr-2" />
          Testing Environment
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="property-alerts" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Property Alerts
          </TabsTrigger>
          <TabsTrigger value="email-system" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email System
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="test-data" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Test Data
          </TabsTrigger>
          <TabsTrigger value="full-system" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Full System
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="property-alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Property Alert System Testing
              </CardTitle>
              <CardDescription>
                Test the property alert matching and notification system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyId">Property ID to Test</Label>
                  <Input
                    id="propertyId"
                    placeholder="Enter property ID"
                    value={testPropertyId}
                    onChange={(e) => setTestPropertyId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerEmail">Test Buyer Email</Label>
                  <Input
                    id="buyerEmail"
                    placeholder="test@example.com"
                    value={testBuyerEmail}
                    onChange={(e) => setTestBuyerEmail(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={runPropertyAlertTest} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing Property Alerts...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Test Property Alert System
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email-system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email System Testing
              </CardTitle>
              <CardDescription>
                Test email templates and delivery system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emailTemplate">Email Template</Label>
                  <Select value={emailTemplate} onValueChange={setEmailTemplate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welcome">Welcome Email</SelectItem>
                      <SelectItem value="propertyAlert">Property Alert</SelectItem>
                      <SelectItem value="appointmentConfirmation">Appointment Confirmation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailRecipient">Recipient Email</Label>
                  <Input
                    id="emailRecipient"
                    placeholder="test@example.com"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailData">Email Data (JSON)</Label>
                <Textarea
                  id="emailData"
                  placeholder='{"name": "Test User", "email": "test@example.com"}'
                  value={emailData}
                  onChange={(e) => setEmailData(e.target.value)}
                  rows={4}
                />
              </div>
              <Button 
                onClick={runEmailTest} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Appointment System Testing
              </CardTitle>
              <CardDescription>
                Test appointment status updates and email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Appointment Status Update Test */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Status Update Test</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="appointmentId">Appointment ID</Label>
                      <Input
                        id="appointmentId"
                        value={testAppointmentId}
                        onChange={(e) => setTestAppointmentId(e.target.value)}
                        placeholder="Enter appointment ID to test"
                      />
                    </div>
                    <div>
                      <Label htmlFor="appointmentStatus">New Status</Label>
                      <Select value={testAppointmentStatus} onValueChange={setTestAppointmentStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="declined">Declined</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="no_show">No Show</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={runAppointmentStatusTest} 
                      disabled={isLoading || !testAppointmentId}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Testing Status Update...
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4 mr-2" />
                          Test Status Update
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Appointment Email Test */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Email Notification Test</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="appointmentEmailRecipient">Email Recipient</Label>
                      <Input
                        id="appointmentEmailRecipient"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                        placeholder="test@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="appointmentEmailStatus">Status for Email</Label>
                      <Select value={testAppointmentStatus} onValueChange={setTestAppointmentStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="declined">Declined</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="no_show">No Show</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={runAppointmentEmailTest} 
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending Email...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Test Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Appointment Testing:</strong> Use the Status Update Test to change appointment statuses and trigger email notifications. 
                  The Email Notification Test sends a sample appointment status email to verify the template works correctly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test-data" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Create Test Buyer
                </CardTitle>
                <CardDescription>
                  Create a test buyer account with preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buyerEmail">Email</Label>
                    <Input
                      id="buyerEmail"
                      value={testBuyerData.email}
                      onChange={(e) => setTestBuyerData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyerName">Name</Label>
                    <Input
                      id="buyerName"
                      value={testBuyerData.name}
                      onChange={(e) => setTestBuyerData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerLocation">Location</Label>
                  <Input
                    id="buyerLocation"
                    value={testBuyerData.location}
                    onChange={(e) => setTestBuyerData(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buyerBudget">Budget</Label>
                    <Input
                      id="buyerBudget"
                      type="number"
                      value={testBuyerData.budget}
                      onChange={(e) => setTestBuyerData(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyerBedrooms">Bedrooms</Label>
                    <Input
                      id="buyerBedrooms"
                      type="number"
                      value={testBuyerData.bedrooms}
                      onChange={(e) => setTestBuyerData(prev => ({ ...prev, bedrooms: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyerBathrooms">Bathrooms</Label>
                    <Input
                      id="buyerBathrooms"
                      type="number"
                      value={testBuyerData.bathrooms}
                      onChange={(e) => setTestBuyerData(prev => ({ ...prev, bathrooms: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <Button 
                  onClick={createTestBuyerAccount} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Create Test Buyer
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Create Test Property
                </CardTitle>
                <CardDescription>
                  Create a test property listing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyTitle">Title</Label>
                  <Input
                    id="propertyTitle"
                    value={testPropertyData.title}
                    onChange={(e) => setTestPropertyData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="propertyPrice">Price</Label>
                    <Input
                      id="propertyPrice"
                      type="number"
                      value={testPropertyData.price}
                      onChange={(e) => setTestPropertyData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="propertyType">Type</Label>
                    <Select value={testPropertyData.property_type} onValueChange={(value) => setTestPropertyData(prev => ({ ...prev, property_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="House">House</SelectItem>
                        <SelectItem value="Apartment">Apartment</SelectItem>
                        <SelectItem value="Townhouse">Townhouse</SelectItem>
                        <SelectItem value="Unit">Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="propertyCity">City</Label>
                    <Input
                      id="propertyCity"
                      value={testPropertyData.city}
                      onChange={(e) => setTestPropertyData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="propertyState">State</Label>
                    <Input
                      id="propertyState"
                      value={testPropertyData.state}
                      onChange={(e) => setTestPropertyData(prev => ({ ...prev, state: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="propertyBedrooms">Bedrooms</Label>
                    <Input
                      id="propertyBedrooms"
                      type="number"
                      value={testPropertyData.bedrooms}
                      onChange={(e) => setTestPropertyData(prev => ({ ...prev, bedrooms: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="propertyBathrooms">Bathrooms</Label>
                    <Input
                      id="propertyBathrooms"
                      type="number"
                      value={testPropertyData.bathrooms}
                      onChange={(e) => setTestPropertyData(prev => ({ ...prev, bathrooms: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <Button 
                  onClick={createTestPropertyListing} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Home className="w-4 h-4 mr-2" />
                      Create Test Property
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="full-system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Full System Integration Test
              </CardTitle>
              <CardDescription>
                Run a complete end-to-end test of the property alert system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  This will create test data, trigger the alert system, and verify email delivery.
                  Make sure your RESEND_API_KEY is configured in Supabase.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={runFullSystemTest} 
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Running Full System Test...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5 mr-2" />
                    Run Full System Test
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Test Results
              </CardTitle>
              <CardDescription>
                View results from all test runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No test results yet. Run some tests to see results here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.success 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${
                            result.success ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {result.message}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {result.timestamp}
                          </p>
                          {result.error && (
                            <p className="text-sm text-red-600 mt-2">
                              Error: {result.error}
                            </p>
                          )}
                          {result.data && (
                            <details className="mt-2">
                              <summary className="text-sm text-gray-600 cursor-pointer">
                                View Details
                              </summary>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}