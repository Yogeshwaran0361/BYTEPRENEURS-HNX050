import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <EmptyState
          title="Page Not Found"
          description="We couldn't find the page you were looking for. Let's return you safely to your care routine."
          actionLabel="Return to Home"
          onAction={() => (window.location.href = '/')}
        />
      </div>
    </div>
  );
};
