import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Home, Users, Mail, MapPin, Building, Briefcase, StickyNote, Eye, Clock, Shield, Star, ArrowRight, CheckCircle } from "lucide-react";

const About = () => {
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('buyer');

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse bg-pickfirst-yellow/30"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse bg-pickfirst-yellow/30"></div>
        <div className="absolute top-40 left-20 w-60 h-60 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-bounce bg-pickfirst-yellow/20"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 bg-card/80 backdrop-blur-lg border-b border-pickfirst-yellow/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-xl bg-pickfirst-yellow">
                <Home className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">PickFirst</h1>
                <p className="text-sm text-muted-foreground">Off-Market Property Access</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <span className="text-muted-foreground text-sm">🏆 Australia's Premier Off-Market Platform</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className={`relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 border rounded-full mb-8 bg-pickfirst-yellow/20 border-pickfirst-yellow/30">
              <Star className="w-4 h-4 mr-2 text-pickfirst-yellow" />
              <span className="text-sm font-medium text-pickfirst-yellow">About PickFirst</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Redefining Property Discovery
              <span className="block bg-gradient-to-r from-pickfirst-yellow to-amber-500 bg-clip-text text-transparent">
                in Australia
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              At PickFirst, we're revolutionizing how Australians discover and secure property by unlocking the exclusive off-market world — traditionally reserved for industry insiders. We believe the best opportunities shouldn't be buried in agent inboxes or delayed by outdated listing systems.
            </p>
            {/* Benefits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {benefits.map((benefit, index) => (
                <div key={index} className="pickfirst-glass bg-card/80 backdrop-blur-lg border border-pickfirst-yellow/30 rounded-2xl p-6 hover:bg-card/90 hover:border-pickfirst-yellow/50 transition-all duration-300 hover:scale-105">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto bg-pickfirst-yellow">
                    {React.cloneElement(benefit.icon, { className: "w-6 h-6 text-black" })}
                  </div>
                  <h3 className="text-foreground font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="mt-20 max-w-4xl mx-auto px-4">
        <div className="pickfirst-glass bg-card/80 backdrop-blur-xl border border-pickfirst-yellow/30 rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Our Mission
          </h2>
          <div className="prose prose-lg prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed mb-6">
              Our platform connects serious buyers directly with off-market properties the moment they become available. No bidding wars. No wasted time. No middlemen charging thousands in fees. Just first access to Australia's hidden property opportunities.
            </p>
            <p className="text-foreground font-semibold text-center text-xl bg-gradient-to-r from-pickfirst-yellow to-amber-500 bg-clip-text text-transparent">
              PickFirst isn't just another property platform — it's your competitive advantage in the market.
            </p>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="mt-16 text-center px-4 pb-8">
        <div className="pickfirst-glass backdrop-blur-lg border border-pickfirst-yellow/30 rounded-2xl p-6 bg-card/80">
          <p className="text-foreground font-medium">
            Questions? We're here to help: 
            <a href="mailto:hello@pickfirst.com.au" className="font-bold ml-2 text-pickfirst-yellow hover:text-amber-500 transition-colors">
              hello@pickfirst.com.au
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default About; 