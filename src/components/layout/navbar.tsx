import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { LogOut, User, Shield, Home, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAdmin } from "@/lib/use-admin";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navbar() {
  const { user, logout } = useAuth();
  const { siteSettings, isAdmin } = useAdmin();
  const location = useLocation();

  return (
    <nav className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link 
              to={user ? "/dashboard" : "/"} 
              className="text-xl font-bold"
              style={{ color: siteSettings.primaryColor }}
            >
              {siteSettings.siteName}
            </Link>
            
            {user && (
              <div className="flex items-center space-x-4">
                <Link to="/">
                  <Button 
                    variant={location.pathname === "/" ? "default" : "ghost"} 
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button 
                    variant={location.pathname === "/dashboard" ? "default" : "ghost"} 
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {user ? (
              <>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {user.plan}
                  </span>
                </div>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth/sign-in">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth/sign-up">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}