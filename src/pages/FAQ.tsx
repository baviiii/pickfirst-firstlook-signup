import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// FAQ Data
const buyerFAQs = [
  {
    question: "What is PickFirst?",
    answer: "PickFirst is a property access platform that gives buyers access to not only homes for sale in the country, but early and exclusive access to off-market properties, with direct connections to the agents selling them."
  },
  {
    question: "How is PickFirst different from other real estate platforms?",
    answer: "Traditional portals show properties once they are already live to the public. PickFirst focuses on what comes before that — off-market listings, early alerts, and direct agent access so you can act before competition floods in."
  },
  {
    question: "Do I have to pay to use PickFirst?",
    answer: "No, there is a free tier, but if you are serious about your property game PickFirst offers a premium tier. Premium users have early access, priority alerts, and direct communication with agents. Serious buyers use PickFirst to gain an edge."
  },
  {
    question: 'What does "off-market" actually mean?',
    answer: "Off-market properties are homes that are being quietly offered to selected buyers before (or instead of) being advertised publicly. Think of it as the VIP room of real estate."
  },
  {
    question: "Can I talk directly to the agent?",
    answer: "Yes. PickFirst allows verified buyers (premium users) to connect directly with listing agents without waiting for open inspections or crowded enquiry lists."
  },
  {
    question: "Does using PickFirst guarantee I'll secure a property?",
    answer: "No platform can guarantee a purchase, but PickFirst dramatically improves your chances by giving you speed, early visibility, and access before competition escalates."
  }
];

const agentFAQs = [
  {
    question: "Does it cost agents anything to list on PickFirst?",
    answer: "No. Agents list for free. Always. We believe in removing barriers, not creating them."
  },
  {
    question: "Why would I use PickFirst instead of portals?",
    answer: "PickFirst connects you with motivated, paying buyers who are actively searching and ready to move, rather than passive browsers who waste your time."
  },
  {
    question: "Are the buyers on PickFirst qualified?",
    answer: "Yes. Many buyers are subscription members, meaning they have committed financially and are typically more serious and better prepared to make decisions."
  },
  {
    question: "Will my off-market listings stay private?",
    answer: "Absolutely. You control what is listed, who sees it, and when it goes public. Your strategy, your rules."
  },
  {
    question: "How does PickFirst help me sell faster?",
    answer: "By exposing your listings to buyers who are already vetted, engaged, and looking daily — often before the property ever reaches open-market advertising."
  }
];

// FAQ Item Component
const FAQItem = ({ item, index, isOpen, onClick }) => {
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div
      className={`
        relative rounded-2xl transition-all duration-200 border-2
        ${isOpen 
          ? 'bg-gradient-to-br from-white via-amber-50/50 to-orange-50/30 shadow-xl shadow-amber-200/30 border-amber-300/60' 
          : 'bg-white/80 hover:bg-white border-amber-200/30 hover:border-amber-300/50 hover:shadow-lg hover:shadow-amber-100/40'
        }
      `}
    >
      <button
        onClick={onClick}
        className="w-full text-left p-6 flex items-start gap-5"
      >
        {/* Number badge */}
        <span 
          className={`
            flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200
            ${isOpen 
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-400/30' 
              : 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700'
            }
          `}
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="flex-1 pt-1.5">
          <h3 
            className={`
              text-lg font-semibold leading-snug transition-colors duration-200
              ${isOpen ? 'text-amber-900' : 'text-gray-800'}
            `}
          >
            {item.question}
          </h3>
        </div>

        {/* Expand button */}
        <div 
          className={`
            flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
            ${isOpen 
              ? 'bg-amber-500 rotate-180' 
              : 'bg-amber-100 hover:bg-amber-200'
            }
          `}
        >
          <svg 
            className={`w-5 h-5 transition-colors duration-200 ${isOpen ? 'text-white' : 'text-amber-600'}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Answer */}
      <div 
        className="overflow-hidden transition-all duration-200"
        style={{ height }}
      >
        <div ref={contentRef} className="px-6 pb-6 pl-[5.25rem]">
          <p className="text-gray-600 leading-relaxed text-[15px]">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
};

// Main FAQ Component
const FAQ = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('buyers');
  const [openIndex, setOpenIndex] = useState(0);

  const currentFAQs = activeTab === 'buyers' ? buyerFAQs : agentFAQs;

  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setOpenIndex(0);
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-b from-amber-50 via-orange-50/40 to-white">
      {/* Background decoration - static, no animations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient circles */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)',
            top: '-15%',
            right: '-10%',
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.25) 0%, transparent 70%)',
            bottom: '10%',
            left: '-10%',
          }}
        />
        
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(180, 83, 9, 1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(180, 83, 9, 1) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-amber-200/40 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 py-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-4 group"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-300/40 overflow-hidden">
                <img
                  src="https://pickfirst.com.au/logo.jpg"
                  alt="PickFirst"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== '/logo.jpg') {
                      target.src = '/logo.jpg';
                    } else {
                      target.style.display = 'none';
                      if (target.parentElement) {
                        target.parentElement.innerHTML = '<span class="text-white font-bold text-xl">P</span>';
                      }
                    }
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 group-hover:text-amber-700 transition-colors duration-150">
                  PickFirst
                </h1>
                <p className="text-xs text-amber-600 font-medium tracking-wide">
                  Off-Market Access
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/80 border border-amber-200/60 text-gray-600 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50/50 transition-all duration-150 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium text-sm">Back</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 py-16 md:py-20">
        {/* Header */}
        <header className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100/70 border border-amber-200/60 mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm font-semibold text-amber-800">Help Center</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5">
            Got{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                Questions?
              </span>
              <svg 
                className="absolute -bottom-1 left-0 w-full h-2 text-amber-400/50" 
                viewBox="0 0 100 8" 
                preserveAspectRatio="none"
              >
                <path 
                  d="M0 6 Q25 0, 50 6 T100 6" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          
          <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Find answers to common questions about how PickFirst helps buyers and agents succeed.
          </p>
        </header>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-12">
          <div 
            className="relative p-1.5 rounded-2xl bg-white/90 shadow-lg shadow-amber-100/40 border border-amber-200/40"
          >
            {/* Sliding indicator */}
            <div 
              className="absolute top-1.5 h-[calc(100%-12px)] w-[calc(50%-6px)] rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 shadow-md shadow-amber-400/30 transition-all duration-200"
              style={{
                left: activeTab === 'buyers' ? '6px' : 'calc(50%)',
              }}
            />
            
            <div className="relative flex">
              <button
                onClick={() => handleTabChange('buyers')}
                className={`
                  flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm transition-colors duration-150 relative z-10
                  ${activeTab === 'buyers' ? 'text-white' : 'text-gray-600 hover:text-amber-700'}
                `}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                For Buyers
              </button>
              
              <button
                onClick={() => handleTabChange('agents')}
                className={`
                  flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm transition-colors duration-150 relative z-10
                  ${activeTab === 'agents' ? 'text-white' : 'text-gray-600 hover:text-amber-700'}
                `}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                For Agents
              </button>
            </div>
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {currentFAQs.map((item, index) => (
            <FAQItem
              key={`${activeTab}-${index}`}
              item={item}
              index={index}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-20">
          <div 
            className="relative overflow-hidden rounded-3xl p-10 text-center border-2 border-amber-200/50"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(254, 243, 199, 0.5) 50%, rgba(255, 237, 213, 0.4) 100%)',
            }}
          >
            {/* Decorative corner accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-300/30 to-transparent rounded-bl-full" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-300/25 to-transparent rounded-tr-full" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-300/40 mb-5">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Still have questions?
              </h3>
              
              <p className="text-gray-600 mb-7 max-w-md mx-auto">
                Our team is here to help. Drop us a line and we'll get back to you within 24 hours.
              </p>
              
              <a
                href="mailto:info@pickfirst.com.au"
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all duration-150 shadow-lg shadow-amber-400/30 hover:shadow-xl hover:shadow-amber-500/40"
              >
                <span>Get in Touch</span>
                <svg 
                  className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer accent line */}
      <div className="relative z-10 h-1 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
    </div>
  );
};

export default FAQ;