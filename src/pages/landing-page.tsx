import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Mail, Shield, Clock, Video, Calendar, Star, ArrowRight, Heart, Users, Globe } from "lucide-react";
import { useAdmin } from "@/lib/use-admin";

export function LandingPage() {
  const { siteSettings } = useAdmin();

  const features = [
    {
      icon: Mail,
      title: "Rich Email Messages",
      description: "Create beautiful, personalized emails with our advanced editor and stunning templates"
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Schedule messages for birthdays, anniversaries, holidays, or any special moment"
    },
    {
      icon: Video,
      title: "Multimedia Messages",
      description: "Record video messages, voice notes, and attach files for truly personal communication"
    },
    {
      icon: Shield,
      title: "Guardian Angel",
      description: "Ensure your final messages are delivered even when you can't send them yourself"
    },
    {
      icon: Users,
      title: "Recipient Management",
      description: "Organize your contacts with timezone support and verification status"
    },
    {
      icon: Clock,
      title: "Legacy Planning",
      description: "Plan ahead for life's important moments and ensure nothing is forgotten"
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
        className="relative py-24 px-4 text-center overflow-hidden bg-gray-900"
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
        
        <div className={`relative z-10 ${siteSettings.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-[1200px]'} mx-auto`}>
          <h1 
            className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight text-white"
          >
            {siteSettings.heroTitle}
          </h1>
          <p 
            className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto leading-relaxed text-slate-300"
          >
            {siteSettings.heroSubtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/sign-up">
              <Button 
                size="lg" 
                variant="default"
                className="text-lg px-8 py-6 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Get Started with Rembr
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth/sign-in">
              <Button 
                variant="secondary" 
                size="lg" 
                className="text-lg px-8 py-6 rounded-full font-semibold"
              >
                Sign In
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex justify-center items-center space-x-8 text-sm opacity-80">
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
      <section className="py-20 px-4 bg-muted">
        <div className={`${siteSettings.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-[1200px]'} mx-auto`}>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need for Legacy Messaging
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help you create meaningful connections across time
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300 bg-card text-card-foreground">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                  <CardDescription className="text-base leading-relaxed text-muted-foreground">
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
      <section className="py-20 px-4">
        <div className={`${siteSettings.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-[1200px]'} mx-auto`}>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Simple steps to create lasting connections
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Create Messages</h3>
              <p className="text-muted-foreground">
                Use our rich editor and beautiful templates to craft meaningful messages
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Schedule Delivery</h3>
              <p className="text-muted-foreground">
                Set specific dates or use Guardian Angel for automatic sending
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Share Love</h3>
              <p className="text-muted-foreground">
                Your messages reach loved ones exactly when they need them most
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-muted">
        <div className={`${siteSettings.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-[1200px]'} mx-auto`}>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free, upgrade when you need more
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative hover:shadow-xl transition-all duration-300 bg-card text-card-foreground ${
                  plan.popular ? 'ring-2 ring-primary scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-primary">
                    {plan.price}
                    <span className="text-lg font-normal text-muted-foreground">
                      /{plan.period}
                    </span>
                  </div>
                  <CardDescription className="text-base text-muted-foreground">{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link to="/auth/sign-up" className="block">
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
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
      <section className="py-20 px-4">
        <div className={`${siteSettings.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-[1200px]'} mx-auto`}>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Trusted by Families Worldwide
            </h2>
            <p className="text-xl text-muted-foreground">
              Real stories from people who found peace through Legacy Scheduler
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-0 shadow-lg bg-card text-card-foreground">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Heart className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Sarah M.</h4>
                    <p className="text-sm text-muted-foreground">Mother of two</p>
                  </div>
                </div>
                <p className="italic mb-4 text-muted-foreground">
                  "Legacy Scheduler gave me peace of mind knowing my children will receive my love letters 
                  on every birthday, even if I'm not there. The templates made it so easy to create beautiful messages."
                </p>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-card text-card-foreground">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Globe className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">David R.</h4>
                    <p className="text-sm text-muted-foreground">Traveling businessman</p>
                  </div>
                </div>
                <p className="italic mb-4 text-muted-foreground">
                  "Being away from family often, I use this to send anniversary and birthday messages 
                  in advance. The Guardian Angel feature provides incredible security for my family."
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
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className={`${siteSettings.heroLayout === 'full' ? 'max-w-7xl' : 'max-w-[1200px]'} mx-auto`}>
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">{siteSettings.siteName}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Connecting hearts across time with thoughtful, scheduled messaging for life's most important moments.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Rich Email Templates</li>
                <li>Video Messages</li>
                <li>Guardian Angel</li>
                <li>Smart Scheduling</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Help Center</li>
                <li>Contact Support</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>About Us</li>
                <li>Blog</li>
                <li>Careers</li>
                <li>Press</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 {siteSettings.siteName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}