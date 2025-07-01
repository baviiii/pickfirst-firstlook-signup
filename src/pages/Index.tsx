
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
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 shadow-2xl border-b-4 border-yellow-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl border-2 border-yellow-600">
                <Home className="w-7 h-7 sm:w-9 sm:h-9 text-yellow-600" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 drop-shadow-sm">PickFirst</h1>
                <p className="text-sm sm:text-base text-gray-800 font-medium">Your First Look at Off-Market Properties</p>
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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8 leading-tight">
              <span className="bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">Our Mission</span>
            </h2>
            <div className="bg-gradient-to-br from-white via-yellow-50 to-amber-50 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 border-2 border-yellow-200 hover:shadow-3xl hover:border-yellow-300 transition-all duration-300 transform hover:-translate-y-1">
              <div className="border-l-4 border-yellow-500 pl-6">
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4 sm:mb-6">
                  At PickFirst, our mission is to redefine how Australians discover and secure property by unlocking the hidden off-market world — a space traditionally reserved for insiders. We believe the best opportunities shouldn't be buried in agent inboxes or delayed by outdated listing systems. That's why we created a platform that connects serious buyers directly with off-market properties the moment they become available — no bidding wars, no wasted time, and no middlemen charging thousands in fees.
                </p>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4 sm:mb-6">
                  We're building a faster, smarter, and more transparent way to buy. One where motivated buyers get a first look and first chance at quality properties — and where agents can move listings quickly without the noise of the open market. Our goal is to empower everyday Australians to act like professionals in the market, with the tools, timing, and confidence to secure great deals before the crowd even knows they exist.
                </p>
                <p className="text-base sm:text-lg text-gray-800 font-semibold leading-relaxed bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                  PickFirst isn't just another property platform — it's a movement toward a fairer, faster, and more connected property experience.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          
          {/* Buyer Registration */}
          <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-blue-50 to-indigo-50 hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 ring-2 ring-blue-100 hover:ring-blue-200">
            <CardHeader className="text-center pb-4 sm:pb-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-t-lg">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl">
                <Users className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold">Join as a Buyer</CardTitle>
              <CardDescription className="text-blue-100 text-sm sm:text-base px-2 font-medium">
                Get exclusive access to off-market properties before they hit the public market
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 py-6">
              <form onSubmit={handleBuyerSubmit} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="buyer-name" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Full Name *
                  </Label>
                  <Input
                    id="buyer-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={buyerForm.name}
                    onChange={(e) => setBuyerForm({...buyerForm, name: e.target.value})}
                    className="h-11 sm:h-12 border-2 border-blue-200 focus:border-blue-500 focus:ring-blue-500 focus:ring-2 transition-all duration-200 bg-blue-50/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer-email" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Email Address *
                  </Label>
                  <Input
                    id="buyer-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={buyerForm.email}
                    onChange={(e) => setBuyerForm({...buyerForm, email: e.target.value})}
                    className="h-11 sm:h-12 border-2 border-blue-200 focus:border-blue-500 focus:ring-blue-500 focus:ring-2 transition-all duration-200 bg-blue-50/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyer-state" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    State *
                  </Label>
                  <Select value={buyerForm.state} onValueChange={(value) => setBuyerForm({...buyerForm, state: value})}>
                    <SelectTrigger className="h-11 sm:h-12 border-2 border-blue-200 focus:border-blue-500 focus:ring-blue-500 focus:ring-2 transition-all duration-200 bg-blue-50/50">
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-2 border-blue-200 shadow-xl">
                      {australianStates.map((state) => (
                        <SelectItem key={state} value={state} className="hover:bg-blue-50 focus:bg-blue-100">
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-base sm:text-lg transition-all duration-200 transform hover:scale-105 shadow-xl hover:shadow-2xl border-0 rounded-xl"
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Register as Buyer
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Agent Registration */}
          <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-emerald-50 to-green-50 hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 ring-2 ring-emerald-100 hover:ring-emerald-200">
            <CardHeader className="text-center pb-4 sm:pb-6 bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-t-lg">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl">
                <Briefcase className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold">Join as an Agent</CardTitle>
              <CardDescription className="text-emerald-100 text-sm sm:text-base px-2 font-medium">
                Connect with serious buyers and move your off-market properties faster
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 py-6">
              <form onSubmit={handleAgentSubmit} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="agent-name" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Full Name *
                  </Label>
                  <Input
                    id="agent-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={agentForm.name}
                    onChange={(e) => setAgentForm({...agentForm, name: e.target.value})}
                    className="h-11 sm:h-12 border-2 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 focus:ring-2 transition-all duration-200 bg-emerald-50/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-email" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Email Address *
                  </Label>
                  <Input
                    id="agent-email"  
                    type="email"
                    placeholder="your.email@example.com"
                    value={agentForm.email}
                    onChange={(e) => setAgentForm({...agentForm, email: e.target.value})}
                    className="h-11 sm:h-12 border-2 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 focus:ring-2 transition-all duration-200 bg-emerald-50/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-state" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    State *
                  </Label>
                  <Select value={agentForm.state} onValueChange={(value) => setAgentForm({...agentForm, state: value})}>
                    <SelectTrigger className="h-11 sm:h-12 border-2 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 focus:ring-2 transition-all duration-200 bg-emerald-50/50">
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-2 border-emerald-200 shadow-xl">
                      {australianStates.map((state) => (
                        <SelectItem key={state} value={state} className="hover:bg-emerald-50 focus:bg-emerald-100">
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-name" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Business Name *
                  </Label>
                  <Input
                    id="business-name"
                    type="text"
                    placeholder="Your real estate agency"
                    value={agentForm.businessName}
                    onChange={(e) => setAgentForm({...agentForm, businessName: e.target.value})}
                    className="h-11 sm:h-12 border-2 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 focus:ring-2 transition-all duration-200 bg-emerald-50/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Position *
                  </Label>
                  <Input
                    id="position"
                    type="text"
                    placeholder="e.g. Sales Agent, Principal, Director"
                    value={agentForm.position}
                    onChange={(e) => setAgentForm({...agentForm, position: e.target.value})}
                    className="h-11 sm:h-12 border-2 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 focus:ring-2 transition-all duration-200 bg-emerald-50/50"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-base sm:text-lg transition-all duration-200 transform hover:scale-105 shadow-xl hover:shadow-2xl border-0 rounded-xl"
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
          <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-2xl p-6 shadow-lg border border-yellow-200">
            <p className="text-gray-700 text-sm sm:text-base font-medium">
              Questions? Contact us at <span className="text-yellow-700 font-bold bg-yellow-200 px-2 py-1 rounded-lg">hello@pickfirst.com.au</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
