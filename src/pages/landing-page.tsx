import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Mail, Shield, Clock, Video, Calendar, Star, ArrowRight, Heart, Users, Globe, Mic, File, Cloud } from "lucide-react";
import { useAdmin } from "@/lib/use-admin";
import { useState, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [message, setMessage] = useState<string>("");

  const subscribe = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("Please enter a valid email");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('newsletter')
          .insert({ email, createdAt: new Date().toISOString() });
        if (error) throw error;
      } else {
        // Fallback to local storage if Supabase is not configured
        const key = 'rembr_newsletter';
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        list.push({ email, createdAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(list));
      }
      setStatus("success");
      setMessage("Thanks! You're on the list.");
      setEmail("");
    } catch (e:any) {
      setStatus("error");
      setMessage(e?.message || "Something went wrong");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        className="w-full max-w-xs px-4 py-2 rounded-full bg-gray-100 dark:bg-white/[0.06] border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Enter your email"
      />
      <button onClick={subscribe} disabled={status==='loading'} className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] disabled:opacity-50">{status==='loading' ? 'Subscribing…' : 'Subscribe'}</button>
      {message && (
        <span className={`text-xs ${status==='success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{message}</span>
      )}
    </div>
  );
}

// Lightweight animated starfield canvas
function Starfield({ density = 320, speed = 0.28, opacity = 0.6 }: { density?: number; speed?: number; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Array<{ x: number; y: number; z: number }>>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    // init stars
    const init = () => {
      starsRef.current = Array.from({ length: density }, () => ({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        z: Math.random() * 1 + 0.3, // depth factor 0.3..1.3
      }));
    };
    init();

    const step = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // paint subtle gradient backdrop for extra glow
      const grd = ctx.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, 'rgba(124,58,237,0.12)');
      grd.addColorStop(1, 'rgba(99,102,241,0.06)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      for (const s of starsRef.current) {
        s.x += speed * (0.5 + s.z);
        s.y -= speed * 0.2; // slight diagonal drift
        if (s.x > w || s.y < 0) {
          s.x = -5;
          s.y = Math.random() * h;
          s.z = Math.random() * 1 + 0.3;
        }
        const r = 1.0 + s.z * 1.2;
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, opacity + s.z * 0.25)})`;
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [density, speed, opacity]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

// Floating icons layer rendered above the canvas but below section content
function IconDrifters({ icons, count = 12 }: { icons: Array<React.ComponentType<any>>; count?: number }) {
  const items = Array.from({ length: count }, (_, i) => {
    const Icon = icons[i % icons.length];
    const leftCss = `${-10 - Math.random() * 20}vw`; // start offscreen left
    const top = Math.random() * 100; // percent
    let scale = 0.8 + Math.random() * 1.0; // 0.8 - 1.8
    if (Math.random() < 0.28) {
      scale *= 1.8; // occasional larger icons
    }
    // Make clouds significantly larger
    if (Icon === Cloud) {
      scale *= 2.2;
    }
    scale = Math.min(Icon === Cloud ? 4.0 : 3.0, scale);
    // Correlate speed with size: larger icons move faster (shorter duration)
    const base = 36; // seconds baseline
    let duration = base / Math.pow(scale, 1.08); // inverse relation
    duration += (Math.random() * 10 - 5); // small jitter
    duration = Math.min(52, Math.max(14, duration)); // clamp
    const delay = -Math.random() * duration; // negative to spread initially
    const opacity = 0.25 + Math.random() * 0.35; // 0.25 - 0.6
    let rotationDuration = 18 + Math.random() * 28; // 18-46s
    if (Math.random() < 0.35) {
      rotationDuration *= 0.45 + Math.random() * 0.35; // some spin faster
    }
    const rotationDelay = -Math.random() * rotationDuration;
    const reverse = Math.random() > 0.5;
    const glowSize = 6 + Math.random() * 10; // 6-16px
    const glowColors = [
      'rgba(255,255,255,0.55)',
      'rgba(139,92,246,0.50)', // violet
      'rgba(99,102,241,0.45)', // indigo
    ];
    const glow = glowColors[Math.floor(Math.random() * glowColors.length)];
    return { Icon, leftCss, top, duration, delay, scale, opacity, rotationDuration, rotationDelay, reverse, glowSize, glow };
  });

  return (
    <div className="absolute inset-0 z-0 pointer-events-none select-none">
      <style>{`
        @keyframes rembr-drift {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(120vw, -30vh, 0); }
        }
        @keyframes rembr-tumble {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      {items.map((it, idx) => {
        const Ico = it.Icon;
        return (
          <div
            key={idx}
            className="absolute"
            style={{
              left: it.leftCss,
              top: `${it.top}%`,
              animation: `rembr-drift ${it.duration}s linear ${it.delay}s infinite`,
            }}
          >
            <Ico
              className="text-white/60"
              style={{
                opacity: it.opacity,
                width: `${20 * it.scale}px`,
                height: `${20 * it.scale}px`,
                animation: `rembr-tumble ${it.rotationDuration}s linear ${it.rotationDelay}s infinite`,
                animationDirection: it.reverse ? 'reverse' as any : 'normal',
                filter: `drop-shadow(0 0 ${it.glowSize}px ${it.glow}) drop-shadow(0 0 ${Math.round(it.glowSize*0.6)}px rgba(255,255,255,0.35))`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// Floating glowing phrases layer
function TextDrifters({ phrases, count = 5 }: { phrases: string[]; count?: number }) {
  const items = Array.from({ length: count }, () => {
    const text = phrases[Math.floor(Math.random() * phrases.length)];
    const leftCss = `${-10 - Math.random() * 20}vw`; // start offscreen left
    const top = Math.random() * 100; // percent
    let scale = 0.9 + Math.random() * 1.2; // 0.9 - 2.1
    if (Math.random() < 0.15) scale *= 1.6; // occasional larger phrase
    scale = Math.min(3.2, scale);
    const base = 42; // slower base so text is rarer
    let duration = base / Math.pow(scale, 1.05);
    duration += (Math.random() * 10 - 5);
    duration = Math.min(56, Math.max(18, duration));
    const delay = -Math.random() * duration;
    const opacity = 0.18 + Math.random() * 0.24; // subtle
    const glow = Math.random() < 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(139,92,246,0.45)';
    let rotationDuration = 26 + Math.random() * 34; // 26-60s slow tumble
    if (Math.random() < 0.3) rotationDuration *= 0.6; // some a bit faster
    const rotationDelay = -Math.random() * rotationDuration;
    const reverse = Math.random() > 0.5;
    return { text, leftCss, top, scale, duration, delay, opacity, glow, rotationDuration, rotationDelay, reverse };
  });

  return (
    <div className="absolute inset-0 z-0 pointer-events-none select-none">
      <style>{`
        @keyframes rembr-drift-text {
          from { transform: translate3d(0,0,0); }
          to { transform: translate3d(120vw, -25vh, 0); }
        }
      `}</style>
      {items.map((it, idx) => (
        <div
          key={idx}
          className="absolute"
          style={{
            left: it.leftCss,
            top: `${it.top}%`,
            animation: `rembr-drift-text ${it.duration}s linear ${it.delay}s infinite`,
          }}
        >
          <span
            className="whitespace-nowrap"
            style={{
              opacity: it.opacity,
              fontSize: `${12 * it.scale + 8}px`,
              color: 'rgba(255,255,255,0.9)',
              textShadow: `0 0 ${6 + Math.round(8 * it.scale)}px ${it.glow}, 0 0 ${Math.round(4 + 6 * it.scale)}px rgba(255,255,255,0.35)`,
              letterSpacing: '0.02em',
              fontWeight: 600 as any,
              animation: `rembr-tumble ${it.rotationDuration}s linear ${it.rotationDelay}s infinite`,
              animationDirection: it.reverse ? 'reverse' as any : 'normal',
            }}
          >
            {it.text}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LandingPage() {
  const { siteSettings } = useAdmin();

  const features = [
    {
      icon: Mail,
      title: "Rich Email Messages",
      description: "Craft heartfelt notes that look gorgeous on every device – no design skills needed."
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Line up birthdays, anniversaries and big moments, then relax – we’ll deliver right on time."
    },
    {
      icon: Video,
      title: "Multimedia Messages",
      description: "Add warmth with video, voice and files so every message feels truly personal."
    },
    {
      icon: Shield,
      title: "Guardian Angel",
      description: "Set ‘just‑in‑case’ delivery so your words reach loved ones – even if you can’t hit send."
    },
    {
      icon: Users,
      title: "Recipient Management",
      description: "Keep everyone organized with timezone‑aware contacts and easy verification."
    },
    {
      icon: Clock,
      title: "Legacy Planning",
      description: "Plan now, feel at ease later – your messages will be there when they matter most."
    }
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started",
      features: [
        "Up to 5 messages per month",
        "Basic email delivery",
        "Simple scheduling",
        "Community support"
      ],
      popular: false,
      cta: "Get Started Free"
    },
    {
      name: "Plus",
      price: "$9.99",
      period: "month",
      description: "Advanced features for regular users",
      features: [
        "Unlimited messages",
        "Video & voice messages",
        "Advanced scheduling",
        "Email support",
        "File attachments up to 100MB"
      ],
      popular: true,
      cta: "Start Plus Trial"
    },
    {
      name: "Legacy",
      price: "$299.99",
      period: "year",
      description: "Complete solution for ultimate peace of mind",
      features: [
        "Everything in Plus",
        "Guardian Angel",
        "Site customization",
        "Admin panel access",
        "API access",
        "Phone support"
      ],
      popular: false,
      cta: "Go Legacy"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section 
        className={`relative px-4 text-center overflow-hidden bg-white dark:bg-gray-900 flex items-center justify-center ${
          siteSettings.heroVideoUrl 
            ? 'min-h-[70vh] md:min-h-[85vh] lg:min-h-screen h-[70vh] md:h-[85vh] lg:h-screen' 
            : 'min-h-[400px] md:min-h-[500px] lg:min-h-[600px]'
        }`}
        style={{
          fontFamily: siteSettings.heroFont,
        }}
      >
        {siteSettings.heroVideoUrl && (
          <>
            <video
              autoPlay
              muted
              loop
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: siteSettings.heroMediaOpacity ?? 0.3 }}
              src={siteSettings.heroVideoUrl}
            />
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: siteSettings.heroOverlayOpacity ?? 0.2 }}
            />
          </>
        )}
        
        <div className={`relative z-10 ${siteSettings.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-[1200px]'} mx-auto py-12 md:py-24 px-4`}>
          <h1 
            className="mb-2 md:mb-3 leading-tight text-gray-900 dark:text-white"
            style={{
              fontFamily: siteSettings.heroFont || 'Inter',
              fontSize: `clamp(2rem, 8vw, ${siteSettings.heroTitleSize || '3.75rem'})`,
              fontWeight: siteSettings.heroTitleWeight || '800',
              letterSpacing: siteSettings.heroTitleLetterSpacing || 'normal',
              textTransform: (siteSettings.heroTitleTransform as any) || 'none',
            }}
          >
            {siteSettings.heroTitle}
          </h1>
          <p 
            className="mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed text-gray-700 dark:text-slate-300"
            style={{
              fontFamily: siteSettings.heroFont || 'Inter',
              fontSize: `clamp(1rem, 4vw, ${siteSettings.heroSubtitleSize || '1.5rem'})`,
              fontWeight: siteSettings.heroSubtitleWeight || '400',
              letterSpacing: siteSettings.heroSubtitleLetterSpacing || 'normal',
              textTransform: (siteSettings.heroSubtitleTransform as any) || 'none',
            }}
          >
            {siteSettings.heroSubtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <Link to="/auth/sign-up">
              <Button 
                size="lg" 
                variant="default"
                className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
              >
                Get Started with Rembr
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
            <Link to="/auth/sign-in">
              <Button 
                variant="secondary" 
                size="lg" 
                className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 rounded-full font-semibold w-full sm:w-auto"
              >
                Sign In
              </Button>
            </Link>
          </div>

          <div className="mt-8 md:mt-12 flex flex-wrap justify-center items-center gap-4 md:gap-8 text-xs md:text-sm opacity-80 text-gray-700 dark:text-white">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Easy to Use</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Forever Reliable</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-muted">
        <div className={`${siteSettings.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-[1200px]'} mx-auto`}>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Everything You Need for Legacy Messaging
            </h2>
            <p className="text-xl text-gray-600 dark:text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help you create meaningful connections across time
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="relative overflow-hidden bg-white dark:bg-white/[0.03] backdrop-blur rounded-2xl border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-[0_8px_40px_rgba(99,102,241,0.25)]"
                >
                  <div className="absolute inset-0 pointer-events-none dark:block hidden" style={{
                    background: 'radial-gradient(600px 120px at 20% -10%, rgba(124,58,237,0.12), transparent 60%)'
                  }} />
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-200 dark:ring-white/10">
                      <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                    </div>
                    <CardTitle className="text-xl text-gray-900 dark:text-white/90">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed text-gray-600 dark:text-white/70">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white dark:bg-muted">
        <div className={`${siteSettings.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-[1200px]'} mx-auto`}>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">How Rembr Works</h2>
            <p className="text-lg text-gray-600 dark:text-white/70 max-w-2xl mx-auto">Three easy steps – designed to feel effortless and look beautiful.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                n: '1',
                title: 'Create a heartfelt message',
                body: 'Start with a friendly prompt, then add video, voice or files. Our editor makes every note feel special.'
              },
              {
                n: '2',
                title: 'Pick the perfect moment',
                body: 'Choose a date or let Guardian Angel deliver automatically when it’s needed most.'
              },
              {
                n: '3',
                title: 'We deliver with care',
                body: 'Your words arrive right on time – safely, privately and with a touch of glow.'
              }
            ].map((s, i) => (
              <div
                key={i}
                className="relative overflow-hidden bg-gray-50 dark:bg-white/[0.03] backdrop-blur rounded-2xl border border-gray-200 dark:border-white/10 p-6 text-left hover:-translate-y-1 transition-all duration-300 hover:shadow-lg dark:hover:shadow-[0_8px_40px_rgba(139,92,246,0.25)]"
              >
                <div className="absolute inset-0 pointer-events-none dark:block hidden" style={{
                  background: 'radial-gradient(500px 100px at 20% -10%, rgba(124,58,237,0.12), transparent 60%)'
                }} />

                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 ring-2 ring-indigo-200 dark:ring-white/20 flex items-center justify-center text-white font-bold">
                    {s.n}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white/90">{s.title}</h3>
                </div>
                <p className="mt-3 text-gray-600 dark:text-white/70 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 relative overflow-hidden bg-gray-50 dark:bg-transparent">
        <div className="dark:block hidden">
          <Starfield density={340} speed={0.28} opacity={0.6} />
          <IconDrifters icons={[Mail, Video, Mic, File, Cloud]} count={16} />
          <TextDrifters phrases={["I LOVE YOU", "Happy Birthday", "My Love", "Happy Anniversary"]} count={4} />
        </div>
        <div className={`${siteSettings.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-[1200px]'} mx-auto relative z-10`}>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Choose Your Plan</h2>
            <p className="text-lg text-gray-600 dark:text-white/70">Start free, upgrade when you want more glow.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative overflow-visible backdrop-blur bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular ? 'ring-2 ring-violet-400/60 shadow-lg dark:shadow-[0_8px_40px_rgba(139,92,246,0.25)] scale-[1.02]' : 'hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-1 shadow-[0_0_20px_rgba(139,92,246,0.45)]">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-gray-900 dark:text-white/90">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 dark:from-indigo-300 dark:to-violet-300">
                    {plan.price}
                    <span className="text-lg font-normal text-gray-600 dark:text-white/60">
                      /{plan.period}
                    </span>
                  </div>
                  <CardDescription className="text-base text-gray-600 dark:text-white/70">{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center space-x-3 text-gray-700 dark:text-white/80">
                        <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-300 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link to="/auth/sign-up" className="block">
                    <Button 
                      className={`w-full rounded-full ${plan.popular ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.35)]' : 'border border-gray-300 dark:border-white/20 bg-transparent text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      variant={plan.popular ? 'default' : 'secondary'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white dark:bg-transparent">
        <div className={`${siteSettings.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-[1200px]'} mx-auto`}>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Loved by families everywhere</h2>
            <p className="text-lg text-gray-600 dark:text-white/70">Real voices from people who use Rembr to keep love moving forward.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="relative overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] backdrop-blur rounded-2xl">
              <div className="absolute inset-0 pointer-events-none dark:block hidden" style={{
                background: 'radial-gradient(400px 120px at -10% 0%, rgba(139,92,246,0.12), transparent 60%)'
              }} />
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 ring-1 ring-violet-200 dark:ring-white/20 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-violet-600 dark:text-violet-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white/90">Sarah M.</h4>
                    <p className="text-sm text-gray-600 dark:text-white/60">Mother of two</p>
                  </div>
                </div>
                <p className="italic mb-4 text-gray-700 dark:text-white/75">
                  "Rembr gives me peace of mind knowing my children will receive my love letters on every birthday. It feels personal, thoughtful and simple."
                </p>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] backdrop-blur rounded-2xl">
              <div className="absolute inset-0 pointer-events-none dark:block hidden" style={{
                background: 'radial-gradient(400px 120px at 110% 0%, rgba(99,102,241,0.12), transparent 60%)'
              }} />
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-indigo-200 dark:ring-white/20 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white/90">David R.</h4>
                    <p className="text-sm text-gray-600 dark:text-white/60">Frequent traveler</p>
                  </div>
                </div>
                <p className="italic mb-4 text-gray-700 dark:text-white/75">
                  "I line up messages before long trips and never worry. Guardian Angel is my quiet safety net for the people I love."
                </p>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-20 px-4 text-center"
        style={{ backgroundColor: siteSettings.primaryColor }}
      >
        <div className="max-w-3xl mx-auto text-white">
          <h2 className="text-4xl font-bold mb-6">
            Start Creating with Rembr Today
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands who trust Rembr to deliver love across time
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/sign-up">
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg px-8 py-6 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          
          <p className="mt-6 text-sm opacity-75">
            No credit card required • Start with our free plan • Upgrade anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative text-gray-900 dark:text-white py-16 px-4 overflow-hidden bg-gray-100 dark:bg-transparent">
        {/* glow sweep */}
        <div className="absolute inset-x-0 top-0 h-40 opacity-70 blur-2xl dark:block hidden" style={{
          background: 'linear-gradient(90deg, rgba(124,58,237,0.3), rgba(99,102,241,0.25), rgba(124,58,237,0.3))'
        }} />
        <div className={`${siteSettings.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-[1200px]'} mx-auto relative z-10`}>
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Keep up with the latest</div>
              <p className="text-gray-600 dark:text-white/60 text-sm mb-6">Join our newsletter to stay up to date on features and releases.</p>
              <NewsletterForm />
            </div>
            <div>
              <div className="text-gray-800 dark:text-white/80 font-medium mb-3">Contact</div>
              <ul className="text-sm text-gray-600 dark:text-white/60 space-y-2">
                <li>hello@rembr.app</li>
                <li>+1 (555) 123‑4567</li>
              </ul>
              <div className="text-gray-800 dark:text-white/80 font-medium mt-5 mb-2">Address</div>
              <p className="text-sm text-gray-600 dark:text-white/60">5600 Tennyson Parkway Plano Texas USA<br/>07:00 AM – 19:00 PM</p>
            </div>
            <div>
              <div className="text-gray-800 dark:text-white/80 font-medium mb-3">Explore</div>
              <ul className="text-sm text-gray-600 dark:text-white/60 space-y-2">
                <li>Why Rembr?</li>
                <li>Features</li>
                <li>FAQs</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <div className="text-gray-800 dark:text-white/80 font-medium mb-3">Support</div>
              <ul className="text-sm text-gray-600 dark:text-white/60 space-y-2">
                <li>Help Center</li>
                <li>Privacy Policy</li>
                <li>Disclaimer</li>
                <li>Terms</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 text-center text-xs text-gray-500 dark:text-white/50">Copyright 2025 {siteSettings.siteName}. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}