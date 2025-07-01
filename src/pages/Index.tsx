
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
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-yellow-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg">
                <Home className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">PickFirst</h1>
                <p className="text-xs sm:text-sm text-gray-600">Your First Look at Off-Market Properties</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Mission Statement */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6 sm:mb-8 leading-tight">
              Our Mission
            </h2>
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-12 border border-yellow-100 hover:shadow-2xl transition-shadow duration-300">
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4 sm:mb-6">
                At PickFirst, our mission is to redefine how Australians discover and secure property by unlocking the hidden off-market world — a space traditionally reserved for insiders. We believe the best opportunities shouldn't be buried in agent inboxes or delayed by outdated listing systems. That's why we created a platform that connects serious buyers directly with off-market properties the moment they become available — no bidding wars, no wasted time, and no middlemen charging thousands in fees.
              </p>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4 sm:mb-6">
                We're building a faster, smarter, and more transparent way to buy. One where motivated buyers get a first look and first chance at quality properties — and where agents can move listings quickly without the noise of the open market. Our goal is to empower everyday Australians to act like professionals in the market, with the tools, timing, and confidence to secure great deals before the crowd even knows they exist.
              </p>
              <p className="text-base sm:text-lg text-gray-800 font-medium leading-relaxed">
                PickFirst isn't just another property platform — it's a movement toward a fairer, faster, and more connected property experience.
              </p>
            </div>
          </div>
        </div>

        {/* Registration Forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          
          {/* Buyer Registration */}
          <Card className="shadow-xl border-0 bg-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="text-center pb-4 sm:pb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 sm:w-8 sm:h-8 text-gray-900" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Join as a Buyer</CardTitle>
              <CardDescription className="text-gray-600 text-sm sm:text-base px-2">
                Get exclusive access to off-market properties before they hit the public market
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <form onSubmit={handleBuyerSubmit} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="buyer-name" className="text-gray-700 font-medium text-sm sm:text-base">Full Name *</Label>
                  <Input
                    id="buyer-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={buyerForm.name}
                    onChange={(e) => setBuyerForm({...buyerForm, name: e.target.value})}
                    className="h-11 sm:h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 focus:ring-2 transition-all duration-200"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer-email" className="text-gray-700 font-medium text-sm sm:text-base">Email Address *</Label>
                  <Input
                    id="buyer-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={buyerForm.email}
                    onChange={(e) => setBuyerForm({...buyerForm, email: e.target.value})}
                    className="h-11 sm:h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 focus:ring-2 transition-all duration-200"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer-state" className="text-gray-700 font-medium text-sm sm:text-base">State *</Label>
                  <Select value={buyerForm.state} onValueChange={(value) => setBuyerForm({...buyerForm, state: value})}>
                    <SelectTrigger className="h-11 sm:h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 focus:ring-2 transition-all duration-200">
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-xl">
                      {australianStates.map((state) => (
                        <SelectItem key={state} value={state} className="hover:bg-yellow-50 focus:bg-yellow-50">
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-semibold text-base sm:text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl border-0"
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Register as Buyer
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Agent Registration */}
          <Card className="shadow-xl border-0 bg-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="text-center pb-4 sm:pb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                <Briefcase className="w-7 h-7 sm:w-8 sm:h-8 text-gray-900" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Join as an Agent</CardTitle>
              <CardDescription className="text-gray-600 text-sm sm:text-base px-2">
                Connect with serious buyers and move your off-market properties faster
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <form onSubmit={handleAgentSubmit} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="agent-name" className="text-gray-700 font-medium text-sm sm:text-base">Full Name *</Label>
                  <Input
                    id="agent-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={agentForm.name}
                    onChange={(e) => setAgentForm({...agentForm, name: e.target.value})}
                    className="h-11 sm:h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 focus:ring-2 transition-all duration-200"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-email" className="text-gray-700 font-medium text-sm sm:text-base">Email Address *</Label>
                  <Input
                    id="agent-email"  
                    type="email"
                    placeholder="your.email@example.com"
                    value={agentForm.email}
                    onChange={(e) => setAgentForm({...agentForm, email: e.target.value})}
                    className="h-11 sm:h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 focus:ring-2 transition-all duration-200"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-state" className="text-gray-700 font-medium text-sm sm:text-base">State *</Label>
                  <Select value={agentForm.state} onValueChange={(value) => setAgentForm({...agentForm, state: value})}>
                    <SelectTrigger className="h-11 sm:h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 focus:ring-2 transition-all duration-200">
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-xl">
                      {australianStates.map((state) => (
                        <SelectItem key={state} value={state} className="hover:bg-yellow-50 focus:bg-yellow-50">
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-name" className="text-gray-700 font-medium text-sm sm:text-base">Business Name *</Label>
                  <Input
                    id="business-name"
                    type="text"
                    placeholder="Your real estate agency"
                    value={agentForm.businessName}
                    onChange={(e) => setAgentForm({...agentForm, businessName: e.target.value})}
                    className="h-11 sm:h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 focus:ring-2 transition-all duration-200"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="text-gray-700 font-medium text-sm sm:text-base">Position *</Label>
                  <Input
                    id="position"
                    type="text"
                    placeholder="e.g. Sales Agent, Principal, Director"
                    value={agentForm.position}
                    onChange={(e) => setAgentForm({...agentForm, position: e.target.value})}
                    className="h-11 sm:h-12 border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 focus:ring-2 transition-all duration-200"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-semibold text-base sm:text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl border-0"
                >
                  <Building className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Register as Agent
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 sm:mt-16 text-center">
          <p className="text-gray-600 text-sm sm:text-base">
            Questions? Contact us at <span className="text-yellow-600 font-medium">hello@pickfirst.com.au</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
