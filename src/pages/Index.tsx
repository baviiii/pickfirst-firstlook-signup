
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Home, Users, Mail, MapPin, Building, Briefcase } from "lucide-react";

const Index = () => {
  const { toast } = useToast();

  // Buyer form state
  const [buyerForm, setBuyerForm] = useState({
    name: '',
    email: '',
    state: ''
  });

  // Agent form state
  const [agentForm, setAgentForm] = useState({
    name: '',
    email: '',
    state: '',
    businessName: '',
    position: ''
  });

  const australianStates = [
    'New South Wales',
    'Victoria',
    'Queensland',
    'Western Australia',
    'South Australia',
    'Tasmania',
    'Australian Capital Territory',
    'Northern Territory'
  ];

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleBuyerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!buyerForm.name || !buyerForm.email || !buyerForm.state) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (!validateEmail(buyerForm.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    console.log('Buyer Registration:', buyerForm);
    toast({
      title: "Registration Successful!",
      description: "Welcome to PickFirst! We'll be in touch soon with exclusive off-market opportunities.",
    });

    // Reset form
    setBuyerForm({ name: '', email: '', state: '' });
  };

  const handleAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agentForm.name || !agentForm.email || !agentForm.state || !agentForm.businessName || !agentForm.position) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (!validateEmail(agentForm.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    console.log('Agent Registration:', agentForm);
    toast({
      title: "Registration Successful!",
      description: "Welcome to PickFirst! We'll contact you about partnership opportunities.",
    });

    // Reset form
    setAgentForm({ name: '', email: '', state: '', businessName: '', position: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
                <Home className="w-7 h-7 text-gray-900" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">PickFirst</h1>
                <p className="text-sm text-gray-600">Your First Look at Off-Market Properties</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Mission Statement */}
        <div className="text-center mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8 leading-tight">
              Our Mission
            </h2>
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-100">
              <p className="text-lg text-gray-700 leading-relaxed">
                At PickFirst, our mission is to redefine how Australians discover and secure property by unlocking the hidden off-market world — a space traditionally reserved for insiders. We believe the best opportunities shouldn't be buried in agent inboxes or delayed by outdated listing systems. That's why we created a platform that connects serious buyers directly with off-market properties the moment they become available — no bidding wars, no wasted time, and no middlemen charging thousands in fees.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mt-6">
                We're building a faster, smarter, and more transparent way to buy. One where motivated buyers get a first look and first chance at quality properties — and where agents can move listings quickly without the noise of the open market. Our goal is to empower everyday Australians to act like professionals in the market, with the tools, timing, and confidence to secure great deals before the crowd even knows they exist.
              </p>
              <p className="text-lg text-gray-800 font-medium leading-relaxed mt-6">
                PickFirst isn't just another property platform — it's a movement toward a fairer, faster, and more connected property experience.
              </p>
            </div>
          </div>
        </div>

        {/* Registration Forms */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Buyer Registration */}
          <Card className="shadow-xl border-0 bg-white hover:shadow-2xl transition-all duration-300">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-yellow-400 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-900" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Join as a Buyer</CardTitle>
              <CardDescription className="text-gray-600 text-base">
                Get exclusive access to off-market properties before they hit the public market
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBuyerSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="buyer-name" className="text-gray-700 font-medium">Full Name *</Label>
                  <Input
                    id="buyer-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={buyerForm.name}
                    onChange={(e) => setBuyerForm({...buyerForm, name: e.target.value})}
                    className="h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer-email" className="text-gray-700 font-medium">Email Address *</Label>
                  <Input
                    id="buyer-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={buyerForm.email}
                    onChange={(e) => setBuyerForm({...buyerForm, email: e.target.value})}
                    className="h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer-state" className="text-gray-700 font-medium">State *</Label>
                  <Select value={buyerForm.state} onValueChange={(value) => setBuyerForm({...buyerForm, state: value})}>
                    <SelectTrigger className="h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400">
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent>
                      {australianStates.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-lg transition-all duration-200 transform hover:scale-105"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Register as Buyer
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Agent Registration */}
          <Card className="shadow-xl border-0 bg-white hover:shadow-2xl transition-all duration-300">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-yellow-400 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-gray-900" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Join as an Agent</CardTitle>
              <CardDescription className="text-gray-600 text-base">
                Connect with serious buyers and move your off-market properties faster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAgentSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="agent-name" className="text-gray-700 font-medium">Full Name *</Label>
                  <Input
                    id="agent-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={agentForm.name}
                    onChange={(e) => setAgentForm({...agentForm, name: e.target.value})}
                    className="h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-email" className="text-gray-700 font-medium">Email Address *</Label>
                  <Input
                    id="agent-email"  
                    type="email"
                    placeholder="your.email@example.com"
                    value={agentForm.email}
                    onChange={(e) => setAgentForm({...agentForm, email: e.target.value})}
                    className="h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-state" className="text-gray-700 font-medium">State *</Label>
                  <Select value={agentForm.state} onValueChange={(value) => setAgentForm({...agentForm, state: value})}>
                    <SelectTrigger className="h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400">
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent>
                      {australianStates.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-name" className="text-gray-700 font-medium">Business Name *</Label>
                  <Input
                    id="business-name"
                    type="text"
                    placeholder="Your real estate agency"
                    value={agentForm.businessName}
                    onChange={(e) => setAgentForm({...agentForm, businessName: e.target.value})}
                    className="h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="text-gray-700 font-medium">Position *</Label>
                  <Input
                    id="position"
                    type="text"
                    placeholder="e.g. Sales Agent, Principal, Director"
                    value={agentForm.position}
                    onChange={(e) => setAgentForm({...agentForm, position: e.target.value})}
                    className="h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-lg transition-all duration-200 transform hover:scale-105"
                >
                  <Building className="w-5 h-5 mr-2" />
                  Register as Agent
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            Questions? Contact us at <span className="text-yellow-600 font-medium">hello@pickfirst.com.au</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
