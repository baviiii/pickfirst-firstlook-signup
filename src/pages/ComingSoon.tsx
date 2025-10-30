import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Secret backdoor access
    if (email === 'pickfirst@test.com' && description === 'testing') {
      toast.success('Access granted!');
      setTimeout(() => {
        navigate('/auth');
      }, 500);
      return;
    }

    // Regular submission - just show success message
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Thank you for your interest! We\'ll be in touch soon.');
      setEmail('');
      setDescription('');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <img 
            src="/logo.jpg" 
            alt="PickFirst Logo" 
            className="w-24 h-24 mx-auto rounded-full shadow-lg"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            PickFirst
          </h1>
          <p className="text-lg text-muted-foreground">
            Your First Look at Off-Market Properties
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-8 shadow-xl space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold text-foreground">
              Coming Soon
            </h2>
            <p className="text-muted-foreground">
              We're working hard to bring you something amazing. Leave your details and we'll notify you when we launch.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-foreground">
                Tell us about your interest
              </label>
              <Textarea
                id="description"
                placeholder="What brings you to PickFirst?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={isSubmitting}
                rows={4}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Notify Me'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          © 2025 PickFirst. All rights reserved.
        </p>
      </div>
    </div>
  );
}
