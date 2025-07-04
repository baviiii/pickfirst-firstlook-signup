import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Users, Mail, MapPin, Building, Briefcase, StickyNote, Eye, Clock, Shield, Star, ArrowRight, CheckCircle } from "lucide-react";
import emailjs from '@emailjs/browser';

const Index = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('buyer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    setIsVisible(true);
    // Initialize EmailJS
    emailjs.init("WveKDid7bVqkDUkcK");
  }, []);

  // Toast system
  const addToast = (toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Buyer form state
  const [buyerForm, setBuyerForm] = useState({
    name: '',
    email: '',
    state: '',
    notes: ''
  });

  // Agent form state
  const [agentForm, setAgentForm] = useState({
    name: '',
    email: '',
    state: '',
    businessName: '',
    position: '',
    notes: ''
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

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Real email sending with EmailJS
  const sendEmail = async (emailData) => {
    try {
      const templateParams = {
        to_name: 'PickFirst Admin',
        to_email: emailData.to_email,
        from_name: emailData.from_name,
        from_email: emailData.from_email,
        subject: emailData.subject,
        message: emailData.message,
        reply_to: emailData.from_email
      };

      const response = await emailjs.send(
        'service_tmh9j23', // Your EmailJS service ID
        'template_dh6ba8e', // Your EmailJS template ID
        templateParams,
        'WveKDid7bVqkDUkcK' // Your EmailJS public key
      );

      console.log('Email sent successfully:', response);
      console.log('Template params sent:', templateParams);
      return { status: 'success' };
    } catch (error) {
      console.error('Email send failed:', error);
      console.error('Error details:', error.text || error.message);
      throw error;
    }
  };

  const handleBuyerSubmit = async () => {
    if (!buyerForm.name || !buyerForm.email || !buyerForm.state) {
      addToast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (!validateEmail(buyerForm.email)) {
      addToast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const emailData = {
        to_email: 'bavindud11@gmail.com',
        from_name: buyerForm.name,
        from_email: buyerForm.email,
        subject: 'New Buyer Registration - PickFirst',
        message: `
New buyer registration received:

Name: ${buyerForm.name}
Email: ${buyerForm.email}
State: ${buyerForm.state}
Notes: ${buyerForm.notes || 'No additional notes provided'}

Registration Type: Buyer
        `.trim()
      };

      await sendEmail(emailData);

      console.log('Buyer Registration:', buyerForm);
      addToast({
        title: "Welcome to PickFirst! 🎉",
        description: "Your exclusive access is being set up. We'll contact you soon.",
        variant: "success"
      });

      setBuyerForm({ name: '', email: '', state: '', notes: '' });
    } catch (error) {
      console.error('Registration error:', error);
      addToast({
        title: "Registration Failed",
        description: "There was an issue with your registration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAgentSubmit = async () => {
    if (!agentForm.name || !agentForm.email || !agentForm.state || !agentForm.businessName || !agentForm.position) {
      addToast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (!validateEmail(agentForm.email)) {
      addToast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const emailData = {
        to_email: 'bavindud11@gmail.com',
        from_name: agentForm.name,
        from_email: agentForm.email,
        subject: 'New Agent Partnership Request - PickFirst',
        message: `
New agent partnership request received:

Name: ${agentForm.name}
Email: ${agentForm.email}
State: ${agentForm.state}
Agency: ${agentForm.businessName}
Position: ${agentForm.position}
Notes: ${agentForm.notes || 'No additional notes provided'}

Registration Type: Agent
        `.trim()
      };

      await sendEmail(emailData);

      console.log('Agent Registration:', agentForm);
      addToast({
        title: "Partnership Request Received! 🤝",
        description: "Our team will review your application and contact you soon.",
        variant: "success"
      });

      setAgentForm({ name: '', email: '', state: '', businessName: '', position: '', notes: '' });
    } catch (error) {
      console.error('Registration error:', error);
      addToast({
        title: "Registration Failed",
        description: "There was an issue with your registration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: <Eye className="w-6 h-6" />,
      title: "First Look Access",
      description: "See properties before they hit the market"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "No Time Wasted",
      description: "Skip open houses and crowded inspections"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Verified Listings",
      description: "All properties pre-vetted by our expert team"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-hidden">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300 ${
              toast.variant === 'destructive' 
                ? 'bg-red-500/20 border-red-500/30 text-red-100' 
                : 'bg-green-500/20 border-green-500/30 text-green-100'
            }`}
          >
            <div className="font-semibold">{toast.title}</div>
            <div className="text-sm opacity-90">{toast.description}</div>
          </div>
        ))}
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{backgroundColor: 'rgb(255, 204, 0)'}}></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse" style={{backgroundColor: 'rgb(255, 204, 0)'}}></div>
        <div className="absolute top-40 left-20 w-60 h-60 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-bounce" style={{backgroundColor: 'rgb(255, 204, 0)'}}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-xl bg-yellow-400">
                <Home className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">PickFirst
                  <span className="ml-1 px-2 py-0.5 rounded bg-yellow-400 text-black text-xs font-bold shadow">Initial First Look</span>
                </h1>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <span className="text-gray-300 text-sm">🏆 Australia's Premier Off-Market Platform</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className={`relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="block">GET IN FIRST</span>
              <span className="block">BUY SMARTER </span>
              <span className="block bg-gradient-to-r bg-clip-text text-transparent whitespace-nowrap" style={{backgroundImage: 'linear-gradient(90deg, rgb(255, 204, 0), rgb(255, 180, 0))'}}>SAVE BIG</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
              The faster, smarter way to secure your next property.<br />
              Avoid buyer's agents, listing fees, and wasted time.<br />
              Join the serious buyers skipping the line. Save thousands in fees.
            </p>

            <Button 
              className="inline-flex items-center px-8 py-4 text-black font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl rounded-xl border-0 hover:opacity-90 mb-8"
              style={{ backgroundColor: 'rgb(255, 204, 0)' }}
            >
              <Star className="w-5 h-5 mr-2" />
              Join Smart Property Investors
            </Button>

            <p className="text-lg text-gray-300 mt-8 mb-2 max-w-3xl mx-auto leading-relaxed">
              Australia's early-access network connecting buyers with high-quality property deals before they hit the major portals.
            </p>
            <p className="text-lg text-gray-300 mb-2 max-w-3xl mx-auto leading-relaxed">
              No bidding wars. No inspection marathons. No middlemen.
            </p>
            <p className="text-lg text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Just smarter buying with first-mover advantage.
            </p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{backgroundColor: 'rgb(255, 204, 0)'}}>
                    {React.cloneElement(benefit.icon, { className: "w-6 h-6 text-black" })}
                  </div>
                  <h3 className="text-white font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-gray-400 text-sm">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Registration Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('buyer')}
                className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === 'buyer' 
                    ? 'text-black shadow-lg' 
                    : 'text-gray-400 hover:text-white'
                }`}
                style={activeTab === 'buyer' ? {backgroundColor: 'rgb(255, 204, 0)'} : {}}
              >
                <Users className="w-5 h-5 inline mr-2" />
                I'm a Buyer
              </button>
              <button
                onClick={() => setActiveTab('agent')}
                className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === 'agent' 
                    ? 'text-black shadow-lg' 
                    : 'text-gray-400 hover:text-white'
                }`}
                style={activeTab === 'agent' ? {backgroundColor: 'rgb(255, 204, 0)'} : {}}
              >
                <Briefcase className="w-5 h-5 inline mr-2" />
                I'm an Agent
              </button>
            </div>
          </div>
        </div>

        {/* Forms */}
        <div className="max-w-2xl mx-auto">
          {activeTab === 'buyer' ? (
            <Card className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02]">
              <CardHeader className="text-center pb-8">
                <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{backgroundColor: 'rgb(255, 204, 0)'}}>
                  <Users className="w-10 h-10 text-black" />
                </div>
                <CardTitle className="text-3xl font-bold text-white mb-4">Join as a Premium Buyer</CardTitle>
                <CardDescription className="text-gray-300 text-lg">
                  Get exclusive access to off-market properties and skip the competition
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="buyer-name" className="text-white font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" style={{color: 'rgb(255, 204, 0)'}} />
                      Full Name
                    </Label>
                    <Input
                      id="buyer-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={buyerForm.name}
                      onChange={(e) => setBuyerForm({...buyerForm, name: e.target.value})}
                      className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 focus:border-yellow-400"
                      style={{ '--tw-ring-color': 'rgb(255, 204, 0)' } as any}
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="buyer-email" className="text-white font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" style={{color: 'rgb(255, 204, 0)'}} />
                      Email Address
                    </Label>
                    <Input
                      id="buyer-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={buyerForm.email}
                      onChange={(e) => setBuyerForm({...buyerForm, email: e.target.value})}
                      className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 focus:border-yellow-400"
                      style={{ '--tw-ring-color': 'rgb(255, 204, 0)' } as any}
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="buyer-state" className="text-white font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" style={{color: 'rgb(255, 204, 0)'}} />
                      State
                    </Label>
                    <Select value={buyerForm.state} onValueChange={(value) => setBuyerForm({...buyerForm, state: value})}>
                      <SelectTrigger className="h-12 bg-white/5 border border-white/20 text-white rounded-xl focus:ring-2 focus:ring-offset-0 focus:border-yellow-400" style={{ '--tw-ring-color': 'rgb(255, 204, 0)' } as any}>
                        <SelectValue placeholder="Select your state" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border border-white/20">
                        {australianStates.map((state) => (
                          <SelectItem key={state} value={state} className="text-white hover:bg-white/10">
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="buyer-notes" className="text-white font-semibold flex items-center gap-2">
                      <StickyNote className="w-4 h-4" style={{color: 'rgb(255, 204, 0)'}} />
                      Property Preferences (Optional)
                    </Label>
                    <Textarea
                      id="buyer-notes"
                      placeholder="Tell us about your ideal property, budget range, preferred areas, or specific requirements..."
                      value={buyerForm.notes}
                      onChange={(e) => setBuyerForm({...buyerForm, notes: e.target.value})}
                      className="min-h-[120px] bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 focus:border-yellow-400"
                      style={{ '--tw-ring-color': 'rgb(255, 204, 0)' } as any}
                    />
                  </div>

                  <Button 
                    onClick={handleBuyerSubmit}
                    disabled={isSubmitting}
                    className="w-full h-14 text-black font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl rounded-xl border-0 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'rgb(255, 204, 0)' }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5 mr-2" />
                        Get Exclusive Access Now
                      </>
                    )}
                  </Button>

                  <p className="text-center text-gray-400 text-sm mt-4">
                    Join buyers already accessing off-market properties
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02]">
              <CardHeader className="text-center pb-8">
                <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{backgroundColor: 'rgb(255, 204, 0)'}}>
                  <Briefcase className="w-10 h-10 text-black" />
                </div>
                <CardTitle className="text-3xl font-bold text-white mb-4">Partner with PickFirst</CardTitle>
                <CardDescription className="text-gray-300 text-lg">
                  Connect with pre-qualified buyers and move properties faster
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="agent-name" className="text-white font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{color: 'rgb(255, 204, 0)'}} />
                        Full Name
                      </Label>
                      <Input
                        id="agent-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={agentForm.name}
                        onChange={(e) => setAgentForm({...agentForm, name: e.target.value})}
                        className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 focus:border-yellow-400"
                        style={{ '--tw-ring-color': 'rgb(255, 204, 0)' } as any}
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="agent-email" className="text-white font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{color: 'rgb(255, 204, 0)'}} />
                        Email Address
                      </Label>
                      <Input
                        id="agent-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={agentForm.email}
                        onChange={(e) => setAgentForm({...agentForm, email: e.target.value})}
                        className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 focus:border-yellow-400"
                        style={{ '--tw-ring-color': 'rgb(255, 204, 0)' } as any}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="agent-state" className="text-white font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" style={{color: 'rgb(255, 204, 0)'}} />
                      State
                    </Label>
                    <Select value={agentForm.state} onValueChange={(value) => setAgentForm({...agentForm, state: value})}>
                      <SelectTrigger className="h-12 bg-white/5 border border-white/20 text-white rounded-xl focus:ring-2 focus:ring-offset-0 focus:border-yellow-400" style={{ '--tw-ring-color': 'rgb(255, 204, 0)' } as any}>
                        <SelectValue placeholder="Select your state" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border border-white/20">
                        {australianStates.map((state) => (
                          <SelectItem key={state} value={state} className="text-white hover:bg-white/10">
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="business-name" className="text-white font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{color: 'rgb(255, 204, 0)'}} />
                        Agency Name
                      </Label>
                      <Input
                        id="business-name"
                        type="text"
                        placeholder="Your real estate agency"
                        value={agentForm.businessName}
                        onChange={(e) => setAgentForm({...agentForm, businessName: e.target.value})}
                        className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 focus:border-yellow-400"
                        style={{ '--tw-ring-color': 'rgb(255, 204, 0)' } as any}
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="position" className="text-white font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" style={{color: 'rgb(255, 204, 0)'}} />
                        Position
                      </Label>
                      <Input
                        id="position"
                        type="text"
                        placeholder="e.g. Sales Agent, Principal"
                        value={agentForm.position}
                        onChange={(e) => setAgentForm({...agentForm, position: e.target.value})}
                        className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 focus:border-yellow-400"
                        style={{ '--tw-ring-color': 'rgb(255, 204, 0)' } as any}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="agent-notes" className="text-white font-semibold flex items-center gap-2">
                      <StickyNote className="w-4 h-4" style={{color: 'rgb(255, 204, 0)'}} />
                      Partnership Details (Optional)
                    </Label>
                    <Textarea
                      id="agent-notes"
                      placeholder="Tell us about your off-market inventory, target areas, or how you'd like to collaborate..."
                      value={agentForm.notes}
                      onChange={(e) => setAgentForm({...agentForm, notes: e.target.value})}
                      className="min-h-[120px] bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 focus:border-yellow-400"
                      style={{ '--tw-ring-color': 'rgb(255, 204, 0)' } as any}
                    />
                  </div>

                  <Button 
                    onClick={handleAgentSubmit}
                    disabled={isSubmitting}
                    className="w-full h-14 text-black font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl rounded-xl border-0 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'rgb(255, 204, 0)' }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5 mr-2" />
                        Apply for Partnership
                      </>
                    )}
                  </Button>

                  <p className="text-center text-gray-400 text-sm mt-4">
                    Join Australia's growing agent network
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mission Statement */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Redefining Property Discovery in Australia
            </h2>
            <div className="prose prose-lg prose-invert max-w-none text-center">
              <p className="text-gray-300 leading-relaxed mb-6">
                At PickFirst, we're revolutionizing how Australians discover and secure property by unlocking the exclusive off-market world. This world was traditionally reserved for industry insiders.
              </p>
              <p className="text-gray-300 leading-relaxed mb-6">
                We believe the best opportunities shouldn't be buried in agent inboxes or delayed by outdated listing systems.
              </p>
              <p className="text-gray-300 leading-relaxed mb-6">
                Our platform connects serious buyers directly with off-market properties the moment they become available.
              </p>
              <p className="text-gray-300 leading-relaxed mb-6">
                No bidding wars. No wasted time. No middlemen charging thousands in fees. Just first access to Australia's hidden property opportunities.
              </p>
              <p className="text-white font-semibold text-center text-xl bg-gradient-to-r bg-clip-text text-transparent" style={{backgroundImage: 'linear-gradient(90deg, rgb(255, 204, 0), rgb(255, 180, 0))'}}>
                PickFirst isn't just another property platform.
              </p>
              <p className="text-white font-semibold text-center text-xl bg-gradient-to-r bg-clip-text text-transparent" style={{backgroundImage: 'linear-gradient(90deg, rgb(255, 204, 0), rgb(255, 180, 0))'}}>
                It's your competitive advantage in the market.
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-16 text-center">
          <div className="backdrop-blur-lg border rounded-2xl p-6" style={{backgroundColor: 'rgba(255, 204, 0, 0.2)', borderColor: 'rgba(255, 204, 0, 0.3)'}}>
            <p className="text-white font-medium">
              Questions? We're here to help: 
              <a href="mailto:hello@pickfirst.com.au" className="font-bold ml-2 hover:opacity-80 transition-opacity" style={{color: 'rgb(255, 204, 0)'}}>
                hello@pickfirst.com.au
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;