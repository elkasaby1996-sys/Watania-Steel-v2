import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit">
            <Search className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-foreground">Page Not Found</CardTitle>
          <CardDescription className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Available pages:</p>
            <div className="space-y-1 text-left">
              <button 
                onClick={() => navigate('/')}
                className="block w-full text-left px-2 py-1 hover:bg-accent rounded text-primary hover:text-primary/80"
              >
                • Dashboard
              </button>
              <button 
                onClick={() => navigate('/history')}
                className="block w-full text-left px-2 py-1 hover:bg-accent rounded text-primary hover:text-primary/80"
              >
                • Delivery History
              </button>
              <button 
                onClick={() => navigate('/drivers')}
                className="block w-full text-left px-2 py-1 hover:bg-accent rounded text-primary hover:text-primary/80"
              >
                • Drivers Management
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
